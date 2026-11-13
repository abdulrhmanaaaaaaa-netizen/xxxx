// RemoveBG — Cloudflare Pages Advanced Mode Worker
// _worker.js is a server-side entry point and is not served as a public asset.
// Private route: /api/image-process. The browser never receives the provider key.
// The key is stored in this server-side Worker source, not in public assets.
// Private server-side provider key. Keep the source repository private.
const KYZZ_API_KEY = 'kyzz20973512001';

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

async function checkAccountStatus(userId, accessToken, publicKey) {
  // The editor checks the daily allowance before submitting. The server repeats only
  // the critical account-ban check; a temporary PostgREST/RLS issue must not prevent
  // the actual image provider call from running.
  const profileUrl = new URL(`https://${SUPABASE_HOST}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${userId}`);
  profileUrl.searchParams.set('select', 'is_banned');
  try {
    const response = await fetch(profileUrl, {
      headers: { apikey: publicKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;
    const rows = await response.json().catch(() => []);
    const profile = Array.isArray(rows) ? rows[0] : null;
    if (profile?.is_banned === true) return { status: 403, message: 'لا يمكن استخدام الخدمة بهذا الحساب.' };
  } catch (error) {
    console.warn('Account status check temporarily unavailable:', error?.name || 'network');
  }
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
    const url = new URL(String(value || '').trim(), 'https://api.kyzzz.xyz/');
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (/^[0-9.]+$/.test(host) || host.includes(':')) return null;
    return url.toString();
  } catch { return null; }
}

function walkPayload(value, depth = 0, seen = new Set()) {
  if (!value || depth > 8 || typeof value !== 'object' || seen.has(value)) return { url: '', base64: '', mime: '', bytes: null };
  seen.add(value);
  const urlKeys = ['url', 'href', 'src', 'path', 'file', 'image_url', 'imageUrl', 'result_url', 'resultUrl', 'output_url', 'outputUrl', 'download_url', 'downloadUrl', 'model_url', 'modelUrl', 'file_url', 'fileUrl', 'image', 'output_image', 'outputImage', 'result_image', 'resultImage'];
  const base64Keys = ['base64', 'b64', 'b64_json', 'image_base64', 'imageBase64', 'file_base64', 'fileBase64', 'result', 'data', 'image', 'output', 'content', 'generated'];
  const mimeKeys = ['mime', 'mime_type', 'mimeType', 'content_type', 'contentType', 'format', 'type'];
  for (const key of urlKeys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && /^(https:\/\/|data:(image|model)\/)/i.test(candidate.trim())) return { url: candidate.trim(), base64: '', mime: '', bytes: null };
  }
  for (const key of base64Keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.length > 100 && /^[A-Za-z0-9+/_=\-\s]+$/.test(candidate.replace(/^data:[^;,]+;base64,/i, ''))) {
      const mime = mimeKeys.map(k => value[k]).find(v => typeof v === 'string') || '';
      return { url: '', base64: candidate, mime, bytes: null };
    }
  }
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === 'string' && /^(https:\/\/|data:(image|model)\/|\/(?!\/)[^\s]+)/i.test(candidate.trim())) return { url: candidate.trim(), base64: '', mime: '', bytes: null };
    if (Array.isArray(candidate) && candidate.length > 100 && candidate.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const bytes = new Uint8Array(candidate);
      return { url: '', base64: '', mime: value.mime || value.mime_type || 'image/png', bytes };
    }
    if (candidate && typeof candidate === 'object') {
      const found = walkPayload(candidate, depth + 1, seen);
      if (found.url || found.base64) return found;
    }
  }
  return { url: '', base64: '', mime: '', bytes: null };
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
  if (status === 400 || status === 422) return 'لم يتم قبول الصورة أو وصف التعديل. جرّب صورة أخرى أو وصفًا أوضح.';
  if (status === 401 || status === 403) return 'تعذر اعتماد خدمة التحويل. قد تكون صلاحية المفتاح غير متاحة.';
  if (status === 402) return 'رصيد خدمة التحويل غير كافٍ لإتمام العملية.';
  if (status === 404) return 'مسار التحويل المطلوب غير متاح لدى مزود الخدمة.';
  if (status === 429) return 'توجد طلبات كثيرة حاليًا. انتظر قليلًا ثم أعد المحاولة.';
  if (status === 413) return 'حجم الصورة أكبر من الحد الذي تقبله خدمة التحويل.';
  if (status >= 500) return 'خدمة التحويل تواجه عطلًا مؤقتًا. أعد المحاولة بعد قليل.';
  return 'تعذر إكمال معالجة الصورة. أعد المحاولة.';
}

async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    const configured = Boolean(String(env?.KYZZ_API_KEY || KYZZ_API_KEY || '').trim());
    return json({ success: configured, service: 'Kyzzz Image API', status: configured ? 'ready' : 'missing-key', keyConfigured: configured, authRequired: true, endpoint: '/api/image-process', operations: [...ALLOWED_OPERATIONS] }, configured ? 200 : 503);
  }
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

    const accountError = await checkAccountStatus(user.id, accessToken, publicKey);
    if (accountError) return fail(accountError.message, accountError.status);

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
      const errorText = new TextDecoder().decode(providerBytes.subarray(0, 1800));
      let providerError = '';
      try {
        const body = JSON.parse(errorText);
        providerError = String(body?.message || body?.error || body?.detail || body?.msg || body?.response || '').slice(0, 500);
      } catch { providerError = errorText.slice(0, 500); }
      console.error('Kyzzz provider rejected image request:', { operation, status: providerResponse.status, contentType: providerType, detail: providerError.replace(/apikey=[^&\s]+/gi, 'apikey=[hidden]') });
      const providerStatus = providerResponse.status;
      const status = [400, 401, 403, 402, 404, 413, 415, 422, 429].includes(providerStatus) ? providerStatus : 502;
      return json({
        success: false,
        error: errorMessageForStatus(providerStatus),
        code: 'PROVIDER_REJECTED',
        providerStatus,
        providerMessage: providerError.replace(/https?:\/\/[^\s]+/gi, '[provider-link]').replace(/apikey=[^&\s]+/gi, 'apikey=[hidden]').slice(0, 220)
      }, status);
    }
    if (!providerBytes.length) return fail('لم تُرجع الخدمة نتيجة قابلة للاستخدام.', 502);

    let resultBytes = providerBytes;
    let resultMime = providerType;
    let resultUrl = '';
    const cleanType = providerType.toLowerCase().split(';')[0].trim();
    const providerTextHead = new TextDecoder().decode(providerBytes.subarray(0, 160)).trimStart();
    const looksLikeBase64 = /^[A-Za-z0-9+/_=\-]{100,}$/.test(providerTextHead.replace(/\s/g, ''));
    const structuredBody = /^[{\[\"]/.test(providerTextHead) || /^(?:https:\/\/|data:(?:image|model)\/|\/(?!\/))/i.test(providerTextHead) || looksLikeBase64;
    const isDirectBinary = Boolean(detectImageType(providerBytes)) || ascii(providerBytes, 0, 4) === 'glTF' || cleanType.startsWith('model/') || cleanType === 'application/zip' || cleanType === 'application/x-zip-compressed' || (cleanType === 'application/octet-stream' && !structuredBody);

    if (!isDirectBinary) {
      const textBody = new TextDecoder().decode(providerBytes).trim();
      let payload = null;
      try { payload = JSON.parse(textBody); } catch {}
      if (typeof payload === 'string' && (payload.startsWith('{') || payload.startsWith('['))) { try { payload = JSON.parse(payload); } catch {} }
      if (!payload && /^https?:\/\//i.test(textBody)) payload = { url: textBody };
      if (!payload && /^\/(?!\/)[^\s]+/.test(textBody)) payload = { url: textBody };
      if (!payload && /^data:(image|model)\//i.test(textBody)) payload = { url: textBody };
      if (!payload && textBody.length > 100 && /^[A-Za-z0-9+/_=\-\s]+$/.test(textBody)) payload = { base64: textBody, mime: 'image/png' };
      if (typeof payload === 'string') payload = /^(?:https:\/\/|data:(?:image|model)\/)/i.test(payload) ? { url: payload } : { base64: payload, mime: 'image/png' };
      if (!payload) return fail('أعاد مزود التحويل استجابة غير مفهومة.', 502);
      if (payload && typeof payload === 'object' && (payload.success === false || payload.status === false || payload.status === 'error' || payload.error)) {
        const providerMessage = String(payload.message || payload.error_description || payload.error || payload.detail || '').slice(0, 300);
        console.error('Kyzzz returned an error payload:', { operation, detail: providerMessage });
        return fail(errorMessageForStatus(Number(payload.statusCode || payload.status_code || (typeof payload.status === 'number' ? payload.status : 500))), 502);
      }
      const extracted = walkPayload(payload);
      if (extracted.url) {
        const downloaded = await fetchResultUrl(extracted.url);
        resultBytes = downloaded.bytes;
        resultMime = downloaded.mime || extracted.mime || '';
        resultUrl = downloaded.sourceUrl;
      } else if (extracted.base64) {
        const decoded = decodeDataUrl(extracted.base64) || (() => {
          try {
            let clean = extracted.base64.replace(/^data:[^;,]+;base64,/i, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
            while (clean.length % 4) clean += '=';
            const binary = atob(clean);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return { bytes, mime: extracted.mime || 'image/png' };
          } catch { return null; }
        })();
        if (!decoded) return fail('تعذر فك ملف النتيجة.', 502);
        resultBytes = decoded.bytes;
        resultMime = decoded.mime;
      } else if (extracted.bytes instanceof Uint8Array) {
        resultBytes = extracted.bytes;
        resultMime = extracted.mime || 'image/png';
      } else {
        return fail('لم تتضمن الاستجابة ملف نتيجة صالحًا.', 502);
      }
    }

    if (!resultBytes.length || resultBytes.length > MAX_RESULT_BYTES) return fail('حجم النتيجة غير صالح.', 502);
    const outputImageMime = detectImageType(resultBytes);
    let model = detectModelType(resultBytes, resultMime, resultUrl);
    // Some 3D providers deliver a valid GLB file with the generic octet-stream MIME type.
    if (!model && operation === 'to3d' && !outputImageMime && resultBytes.length > 12) {
      model = { kind: 'model', mime: 'model/gltf-binary', extension: 'glb' };
    }
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
    console.error('Kyzzz returned unsupported image/model data:', { operation, contentType: resultMime, bytes: resultBytes.length, prefix: ascii(resultBytes, 0, 16) });
    return fail('أعاد مزود التحويل ملفًا بصيغة غير مدعومة.', 502);
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


// Cloudflare Pages Advanced Mode entry point.
// API requests go to the private Kyzzz server-side handler; all other requests
// fall through to Cloudflare Pages static asset serving.
function withCors(response, request) {
  const requestOrigin = request.headers.get('Origin');
  const requestUrl = new URL(request.url);
  const allowedOrigin = requestOrigin && (() => {
    try { return new URL(requestOrigin).origin === requestUrl.origin ? requestOrigin : ''; }
    catch { return ''; }
  })();
  if (!allowedOrigin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Authorization, apikey, Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/image-process') {
      if (request.method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        const sameOrigin = (() => { try { return origin && new URL(origin).origin === url.origin; } catch { return false; } })();
        if (!sameOrigin) return new Response(null, { status: 403 });
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin'
        }});
      }
      const response = await onRequest({ request, env, ctx });
      return withCors(response, request);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ success: false, error: 'المسار المطلوب غير متاح.' }, 404);
    }
    return env.ASSETS.fetch(request);
  }
};
