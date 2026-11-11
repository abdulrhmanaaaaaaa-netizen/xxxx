// Cloudflare Pages Function: /api/ai-image/:operation
// The KYZZ API key must be stored as the KYZZ_API_KEY secret in Cloudflare Pages.

const SUPABASE_URL = 'https://skhvturpodaimjjpjmtx.supabase.co';
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_RESULT_BYTES = 35 * 1024 * 1024;
const OPERATIONS = new Set([
  'to3d', 'edit-image', 'toanime', 'tocyberpunk', 'todisney', 'toghibli',
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

function fail(message, status = 500) {
  return json({ success: false, error: message }, status);
}

function cairoDayStartISO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type)?.value;
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo', timeZoneName: 'longOffset'
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value?.replace('GMT', '') || '+00:00';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00${offset}`).toISOString();
}

async function checkAllowance(userId, accessToken, supabaseKey) {
  const headers = { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` };
  const profileUrl = new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${userId}`);
  profileUrl.searchParams.set('select', 'plan,is_banned,daily_limit');
  const profileResponse = await fetch(profileUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!profileResponse.ok) return { status: 503, message: 'تعذر التحقق من حالة الحساب. حاول مرة أخرى.' };

  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (profile?.is_banned) return { status: 403, message: 'هذا الحساب موقوف عن استخدام الخدمة.' };
  if (profile?.plan === 'pro') return null;

  const parsedLimit = Number(profile?.daily_limit ?? 5);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 5;
  if (limit <= 0) return null;

  const operationsUrl = new URL(`${SUPABASE_URL}/rest/v1/operations`);
  operationsUrl.searchParams.set('user_id', `eq.${userId}`);
  operationsUrl.searchParams.set('created_at', `gte.${cairoDayStartISO()}`);
  operationsUrl.searchParams.set('select', 'id');
  operationsUrl.searchParams.set('limit', '1000');
  const operationsResponse = await fetch(operationsUrl, { headers, signal: AbortSignal.timeout(10000) });
  if (!operationsResponse.ok) return { status: 503, message: 'تعذر التحقق من الحد اليومي. حاول مرة أخرى.' };
  const operations = await operationsResponse.json().catch(() => null);
  if (!Array.isArray(operations)) return { status: 503, message: 'تعذر التحقق من سجل العمليات.' };
  if (operations.length >= limit) return { status: 429, message: `وصلت إلى الحد اليومي المسموح (${limit} عمليات).` };
  return null;
}

function bytesToAscii(bytes, start, end) {
  let value = '';
  for (let index = start; index < end && index < bytes.length; index++) value += String.fromCharCode(bytes[index]);
  return value;
}

function imageMime(bytes, declared = '') {
  if (bytes.length >= 8 && bytesToAscii(bytes, 1, 4) === 'PNG') return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytesToAscii(bytes, 0, 4) === 'RIFF' && bytesToAscii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytesToAscii(bytes, 0, 6))) return 'image/gif';
  if (bytes.length >= 12 && bytesToAscii(bytes, 4, 8) === 'ftyp' && /^(avif|avis)$/.test(bytesToAscii(bytes, 8, 12))) return 'image/avif';
  const type = String(declared).split(';')[0].trim().toLowerCase();
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(type) ? type : '';
}

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|224\.|240\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return false;
    return true;
  } catch {
    return false;
  }
}

function findString(value, keys, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return '';
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  for (const candidate of Object.values(value)) {
    if (candidate && typeof candidate === 'object') {
      const found = findString(candidate, keys, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

async function jsonImage(payload) {
  const directValue = typeof payload === 'string' ? payload.trim() : (typeof payload?.data === 'string' ? payload.data.trim() : '');
  const encoded = findString(payload, ['base64', 'image_base64', 'imageBase64', 'base64Image', 'base64_data']) ||
    (directValue.startsWith('data:image/') ? directValue : '');
  if (encoded) {
    const clean = encoded.replace(/^data:image\/[^;]+;base64,/i, '').trim();
    try {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
    } catch {
      throw new Error('أعادت الخدمة بيانات صورة غير صالحة.');
    }
  }

  const imageUrl = (directValue.startsWith('https://') ? directValue : '') ||
    findString(payload, ['image_url', 'imageUrl', 'result_url', 'resultUrl', 'output_url', 'outputUrl', 'download_url', 'downloadUrl', 'url', 'image', 'output', 'result']);
  if (imageUrl && /^https:\/\//i.test(imageUrl) && isPublicHttpsUrl(imageUrl)) {
    const response = await fetch(imageUrl, { headers: { Accept: 'image/*, application/octet-stream' }, signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error(`تعذر تنزيل الصورة الناتجة (${response.status}).`);
    return response;
  }
  const message = payload?.error || payload?.message || payload?.detail || payload?.msg;
  throw new Error(message || 'لم تُرجع خدمة KYZZ رابطًا أو ملف صورة صالحًا.');
}

export async function onRequest({ request, params, env }) {
  if (request.method !== 'POST') return fail('طريقة الطلب غير مدعومة.', 405);

  const operation = String(params?.operation || '').trim().toLowerCase();
  if (!OPERATIONS.has(operation)) return fail('نوع التحويل غير مدعوم.', 404);

  const providerKey = String(env?.KYZZ_API_KEY || '').trim();
  if (!providerKey) return fail('خدمة الصور غير مهيأة. أضف KYZZ_API_KEY إلى أسرار Cloudflare Pages.', 503);

  try {
    const accessToken = String(request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const supabaseKey = String(request.headers.get('apikey') || '').trim();
    if (!accessToken || !supabaseKey) return fail('يلزم تسجيل الدخول لاستخدام تحويلات الصور.', 401);

    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!authResponse.ok) return fail('انتهت جلسة الحساب. سجّل الدخول مجددًا.', 401);
    const user = await authResponse.json().catch(() => null);
    if (!user?.id) return fail('تعذر التحقق من الحساب.', 401);

    const allowanceError = await checkAllowance(user.id, accessToken, supabaseKey);
    if (allowanceError) return fail(allowanceError.message, allowanceError.status);

    let incoming;
    try { incoming = await request.formData(); }
    catch { return fail('بيانات الصورة غير صالحة.', 400); }
    const media = incoming.get('media');
    if (!(media instanceof File) || !media.size) return fail('اختر صورة صالحة أولًا.', 400);
    if (media.size > MAX_SOURCE_BYTES) return fail('الحد الأقصى لحجم الصورة هو 20MB.', 413);
    const mediaType = String(media.type || '').toLowerCase();
    if (mediaType && !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(mediaType)) {
      return fail('صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP.', 415);
    }

    const form = new FormData();
    form.append('media', media, media.name || 'image.png');
    if (operation === 'edit-image') {
      const prompt = String(incoming.get('prompt') || '').trim();
      if (!prompt) return fail('اكتب وصف التعديل أولًا.', 400);
      if (prompt.length > 1200) return fail('وصف التعديل أطول من 1200 حرف.', 400);
      form.append('prompt', prompt);
    }

    const target = new URL(`https://api.kyzzz.xyz/api/ai-image/${operation}`);
    target.searchParams.set('apikey', providerKey);
    const upstream = await fetch(target, {
      method: 'POST',
      headers: { Accept: 'image/*, application/octet-stream, application/json' },
      body: form,
      signal: AbortSignal.timeout(150000)
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => '');
      let detail = '';
      try {
        const payload = JSON.parse(errorText);
        detail = payload?.error || payload?.message || payload?.detail || '';
      } catch { detail = errorText.trim().slice(0, 280); }
      return fail(detail || `رفضت خدمة KYZZ الطلب (${upstream.status}).`, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502);
    }

    let resultResponse = upstream;
    const type = (upstream.headers.get('content-type') || '').toLowerCase();
    if (type.includes('application/json') || type.includes('text/json') || type.startsWith('text/plain')) {
      const raw = await upstream.text().catch(() => '');
      let payload = null;
      try { payload = JSON.parse(raw); }
      catch { payload = raw.trim().startsWith('https://') ? { url: raw.trim() } : { message: raw.trim().slice(0, 260) }; }
      if (!payload) return fail('أعادت خدمة KYZZ استجابة غير مفهومة.', 502);
      resultResponse = await jsonImage(payload);
    }

    const bytes = new Uint8Array(await resultResponse.arrayBuffer());
    const mime = imageMime(bytes, resultResponse.headers.get('content-type') || '');
    if (!mime || !bytes.length) return fail('لم تُرجع خدمة KYZZ صورة قابلة للعرض.', 502);
    if (bytes.length > MAX_RESULT_BYTES) return fail('حجم الصورة الناتجة أكبر من الحد المسموح.', 413);

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|timed out/i.test(error?.message || '');
    return fail(
      timedOut ? 'استغرقت المعالجة وقتًا أطول من المسموح. أعد المحاولة.' : (error?.message || 'حدث خطأ أثناء معالجة الصورة.'),
      timedOut ? 504 : 502
    );
  }
}
