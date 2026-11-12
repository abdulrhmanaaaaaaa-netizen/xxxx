// Cloudflare Pages Function: /api/image-process
// The provider key is imported from a server-only module under functions/_shared.
// This function makes the provider request server-to-server; the browser never receives the key.
import { KYZZ_API_KEY } from '../_shared/kyzz-config.js';

const SUPABASE_HOST = 'skhvturpodaimjjpjmtx.supabase.co';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_RESULT_BYTES = 30 * 1024 * 1024;
const ALLOWED_OPERATIONS = new Set([
  'edit-image', 'to3d', 'toanime', 'tocyberpunk', 'todisney', 'toghibli',
  'tohitam', 'tojepang', 'tolego', 'tomanga', 'tooil', 'topixar', 'tosketch'
]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function fail(message, status = 400) {
  return json({ success: false, error: message }, status);
}

function cairoDayStartISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type)?.value;
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo', timeZoneName: 'longOffset'
  }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value?.replace('GMT', '') || '+00:00';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00${offset}`).toISOString();
}

async function checkAllowance(userId, accessToken, publicKey) {
  const headers = { apikey: publicKey, Authorization: `Bearer ${accessToken}` };
  const profileUrl = new URL(`https://${SUPABASE_HOST}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${userId}`);
  profileUrl.searchParams.set('select', 'plan,is_banned,daily_limit');

  const profileResponse = await fetch(profileUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!profileResponse.ok) return { status: 503, message: 'تعذر التحقق من صلاحية الحساب حاليًا.' };
  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (profile?.is_banned) return { status: 403, message: 'لا يمكن استخدام الخدمة بهذا الحساب.' };
  if (profile?.plan === 'pro') return null;

  const limit = Number(profile?.daily_limit ?? 5);
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const operationsUrl = new URL(`https://${SUPABASE_HOST}/rest/v1/operations`);
  operationsUrl.searchParams.set('user_id', `eq.${userId}`);
  operationsUrl.searchParams.set('created_at', `gte.${cairoDayStartISO()}`);
  operationsUrl.searchParams.set('select', 'id');
  operationsUrl.searchParams.set('limit', '1000');
  const operationsResponse = await fetch(operationsUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!operationsResponse.ok) return { status: 503, message: 'تعذر التحقق من الاستخدام اليومي حاليًا.' };
  const operations = await operationsResponse.json().catch(() => null);
  if (!Array.isArray(operations)) return { status: 503, message: 'تعذر التحقق من سجل الاستخدام.' };
  if (operations.length >= limit) return { status: 429, message: `وصلت إلى الحد اليومي المسموح (${limit} عمليات).` };
  return null;
}

function ascii(bytes, start, end) {
  let text = '';
  for (let i = start; i < end && i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  return text;
}

function detectImageType(bytes) {
  if (bytes.length >= 8 && ascii(bytes, 1, 4) === 'PNG') return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(ascii(bytes, 0, 6))) return 'image/gif';
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp' && /^(avif|avis)$/.test(ascii(bytes, 8, 12))) return 'image/avif';
  return '';
}

function detectModelType(bytes, declaredType = '', sourceUrl = '') {
  const type = String(declaredType).toLowerCase().split(';')[0].trim();
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === 'glTF') return { kind: 'model', mime: 'model/gltf-binary', extension: 'glb' };
  if (/model\/gltf-binary|model\/glb/.test(type)) return { kind: 'model', mime: 'model/gltf-binary', extension: 'glb' };
  if (/model\/gltf\+json/.test(type)) return { kind: 'model', mime: 'model/gltf+json', extension: 'gltf' };
  if (/model\/stl/.test(type)) return { kind: 'model', mime: 'model/stl', extension: 'stl' };
  if (/model\/obj|text\/.*obj/.test(type)) return { kind: 'model', mime: 'text/plain', extension: 'obj' };
  if (/model\/fbx/.test(type)) return { kind: 'model', mime: 'application/octet-stream', extension: 'fbx' };
  if (/application\/zip|application\/x-zip-compressed/.test(type)) return { kind: 'model', mime: 'application/zip', extension: 'zip' };
  try {
    const path = new URL(sourceUrl).pathname.toLowerCase();
    const extension = path.match(/\.(glb|gltf|obj|stl|fbx|zip)$/)?.[1];
    if (extension) return { kind: 'model', mime: extension === 'gltf' ? 'model/gltf+json' : extension === 'obj' ? 'text/plain' : 'application/octet-stream', extension };
  } catch {}
  return null;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (/^[0-9.]+$/.test(host) || host.includes(':')) return null;
    return url.toString();
  } catch { return null; }
}

function walkPayload(value, depth = 0, seen = new Set()) {
  if (!value || depth > 8 || typeof value !== 'object' || seen.has(value)) return { url: '', base64: '', mime: '' };
  seen.add(value);
  const urlKeys = ['url', 'image_url', 'imageUrl', 'result_url', 'resultUrl', 'output_url', 'outputUrl', 'download_url', 'downloadUrl', 'model_url', 'modelUrl', 'file_url', 'fileUrl'];
  const base64Keys = ['base64', 'b64_json', 'image_base64', 'imageBase64', 'file_base64', 'fileBase64', 'result', 'data', 'image', 'output'];
  const mimeKeys = ['mime', 'mime_type', 'mimeType', 'content_type', 'contentType', 'format'];
  for (const key of urlKeys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && /^(https:\/\/|data:(image|model)\/)/i.test(candidate.trim())) return { url: candidate.trim(), base64: '', mime: '' };
  }
  for (const key of base64Keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(candidate.replace(/^data:[^;,]+;base64,/i, ''))) {
      const mime = mimeKeys.map(k => value[k]).find(v => typeof v === 'string') || '';
      return { url: '', base64: candidate, mime };
    }
  }
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === 'string' && /^(https:\/\/|data:(image|model)\/)/i.test(candidate.trim())) return { url: candidate.trim(), base64: '', mime: '' };
    if (candidate && typeof candidate === 'object') {
      const found = walkPayload(candidate, depth + 1, seen);
      if (found.url || found.base64) return found;
    }
  }
  return { url: '', base64: '', mime: '' };
}

function decodeDataUrl(value) {
  const match = String(value).match(/^data:([^;,]+)?;base64,([\s\S]+)$/i);
  if (!match) return null;
  try {
    const binary = atob(match[2].replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime: match[1] || 'application/octet-stream' };
  } catch { return null; }
}

async function fetchResultUrl(value) {
  const dataUrl = decodeDataUrl(value);
  if (dataUrl) return { bytes: dataUrl.bytes, mime: dataUrl.mime, sourceUrl: '' };
  const url = safeExternalUrl(value);
  if (!url) throw new Error('invalid-result-url');
  const response = await fetch(url, { headers: { Accept: 'image/*,model/*,application/octet-stream,*/*' }, signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error('result-download-failed');
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, mime: response.headers.get('content-type') || '', sourceUrl: url };
}

function errorMessageForStatus(status) {
  if (status === 400 || status === 422) return 'تعذر تنفيذ الطلب. راجع وصف التعديل وحاول مجددًا.';
  if (status === 401 || status === 403) return 'تعذر اعتماد طلب المعالجة حاليًا.';
  if (status === 402) return 'خدمة المعالجة غير متاحة حاليًا.';
  if (status === 429) return 'الطلبات كثيرة حاليًا. انتظر قليلًا ثم أعد المحاولة.';
  if (status === 413) return 'حجم الصورة أكبر من الحد المسموح.';
  if (status >= 500) return 'خدمة الصور تواجه ضغطًا مؤقتًا. أعد المحاولة بعد قليل.';
  return 'تعذر إكمال معالجة الصورة. أعد المحاولة.';
}

export async function onRequest({ request, env }) {
  if (request.method === 'GET') return json({ success: true, service: 'Image Processing', status: 'ready' });
  if (request.method !== 'POST') return fail('طريقة الطلب غير مدعومة.', 405);

  try {
    const apiKey = String(env?.KYZZ_API_KEY || KYZZ_API_KEY || '').trim();
    if (!apiKey) return fail('خدمة معالجة الصور غير مهيأة حاليًا.', 503);

    const accessToken = String(request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const publicKey = String(request.headers.get('apikey') || '').trim();
    if (!accessToken || !publicKey) return fail('سجّل الدخول لاستخدام أدوات معالجة الصور.', 401);

    const authResponse = await fetch(`https://${SUPABASE_HOST}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!authResponse.ok) return fail('انتهت جلسة الحساب. سجّل الدخول مجددًا.', 401);
    const user = await authResponse.json().catch(() => null);
    if (!user?.id) return fail('تعذر التحقق من الحساب.', 401);

    const allowanceError = await checkAllowance(user.id, accessToken, publicKey);
    if (allowanceError) return fail(allowanceError.message, allowanceError.status);

    const formData = await request.formData();
    const operation = String(formData.get('operation') || '').trim();
    const media = formData.get('media');
    const prompt = String(formData.get('prompt') || '').trim();
    if (!ALLOWED_OPERATIONS.has(operation)) return fail('نوع المعالجة المطلوب غير متاح.', 400);
    if (!(media instanceof File) || !media.size) return fail('اختر صورة صالحة أولًا.', 400);
    if (media.size > MAX_SOURCE_BYTES) return fail('يجب ألا يتجاوز حجم الصورة 10 ميجابايت.', 413);
    if (operation === 'edit-image' && (!prompt || prompt.length > 5000)) return fail('اكتب وصفًا واضحًا للتعديل (حتى 5000 حرف).', 400);

    const sourceBytes = new Uint8Array(await media.arrayBuffer());
    const imageMime = detectImageType(sourceBytes);
    if (!imageMime) return fail('صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو GIF أو AVIF.', 415);

    const providerForm = new FormData();
    const safeName = String(media.name || 'image.png').replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 90) || 'image.png';
    providerForm.append('media', new Blob([sourceBytes], { type: imageMime }), safeName);
    if (operation === 'edit-image') providerForm.append('prompt', prompt);

    const providerUrl = new URL(`https://api.kyzzz.xyz/api/ai-image/${operation}`);
    providerUrl.searchParams.set('apikey', apiKey);
    const providerResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: { Accept: 'image/*,model/*,application/json,application/octet-stream' },
      body: providerForm,
      signal: AbortSignal.timeout(180000)
    });

    const providerBytes = new Uint8Array(await providerResponse.arrayBuffer());
    const providerType = providerResponse.headers.get('content-type') || '';
    if (!providerResponse.ok) {
      return fail(errorMessageForStatus(providerResponse.status), providerResponse.status === 429 ? 429 : 502);
    }
    if (!providerBytes.length) return fail('لم تُرجع الخدمة نتيجة قابلة للاستخدام.', 502);

    let resultBytes = providerBytes;
    let resultMime = providerType;
    let resultUrl = '';
    const cleanType = providerType.toLowerCase().split(';')[0].trim();
    const providerTextHead = new TextDecoder().decode(providerBytes.subarray(0, 160)).trimStart();
    const structuredBody = /^[{\[\"]/.test(providerTextHead) || /^(?:https:\/\/|data:(?:image|model)\/)/i.test(providerTextHead);
    const isDirectBinary = Boolean(detectImageType(providerBytes)) || ascii(providerBytes, 0, 4) === 'glTF' || cleanType.startsWith('model/') || (cleanType === 'application/octet-stream' && !structuredBody);

    if (!isDirectBinary) {
      const textBody = new TextDecoder().decode(providerBytes).trim();
      let payload = null;
      try { payload = JSON.parse(textBody); } catch {}
      if (!payload && /^https:\/\//i.test(textBody)) payload = { url: textBody };
      if (!payload && /^data:(image|model)\//i.test(textBody)) payload = { url: textBody };
      if (typeof payload === 'string') payload = /^(?:https:\/\/|data:(?:image|model)\/)/i.test(payload) ? { url: payload } : { base64: payload, mime: 'image/png' };
      if (!payload) return fail('تعذر قراءة نتيجة المعالجة.', 502);
      const extracted = walkPayload(payload);
      if (extracted.url) {
        const downloaded = await fetchResultUrl(extracted.url);
        resultBytes = downloaded.bytes;
        resultMime = downloaded.mime || extracted.mime || '';
        resultUrl = downloaded.sourceUrl;
      } else if (extracted.base64) {
        const decoded = decodeDataUrl(extracted.base64) || (() => {
          try {
            const clean = extracted.base64.replace(/^data:[^;,]+;base64,/i, '').replace(/\s/g, '');
            const binary = atob(clean);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return { bytes, mime: extracted.mime || 'image/png' };
          } catch { return null; }
        })();
        if (!decoded) return fail('تعذر فك ملف النتيجة.', 502);
        resultBytes = decoded.bytes;
        resultMime = decoded.mime;
      } else {
        return fail('لم تتضمن الاستجابة ملف نتيجة صالحًا.', 502);
      }
    }

    if (!resultBytes.length || resultBytes.length > MAX_RESULT_BYTES) return fail('حجم النتيجة غير صالح.', 502);
    const outputImageMime = detectImageType(resultBytes);
    const model = detectModelType(resultBytes, resultMime, resultUrl);
    if (outputImageMime) {
      return new Response(resultBytes, {
        status: 200,
        headers: {
          'Content-Type': outputImageMime,
          'X-Result-Kind': 'image',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
    if (model) {
      return new Response(resultBytes, {
        status: 200,
        headers: {
          'Content-Type': model.mime,
          'X-Result-Kind': 'model',
          'X-Result-Extension': model.extension,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }
    return fail('صيغة النتيجة المستلمة غير مدعومة.', 502);
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|timed out/i.test(error?.message || '');
    const safeMessage = timedOut
      ? 'استغرقت المعالجة وقتًا أطول من المعتاد. أعد المحاولة.'
      : error?.message === 'result-download-failed'
        ? 'اكتملت المعالجة، لكن تعذر تحميل النتيجة. أعد المحاولة.'
        : 'حدث خطأ مؤقت أثناء معالجة الصورة. أعد المحاولة.';
    return fail(safeMessage, timedOut ? 504 : 502);
  }
}
