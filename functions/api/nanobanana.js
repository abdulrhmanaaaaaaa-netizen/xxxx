// Cloudflare Pages Function: /api/nanobanana
// Uses only Cloudflare Workers Web APIs: fetch, FormData, Blob, URL and Uint8Array.

const ALLOWED_SUPABASE_HOST = 'skhvturpodaimjjpjmtx.supabase.co';
const PIXHOST_UPLOAD_API = 'https://api.pixhost.to/images';
const NANO_API = 'https://api-faa.my.id/faa/nano-banana';
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_RESULT_BYTES = 30 * 1024 * 1024;
const PIXHOST_HOST_SUFFIXES = ['.pixhost.to', '.pixhost.cc', '.pixho.st'];

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function jsonError(message, status = 500) {
  return jsonResponse({ success: false, error: message }, status);
}

function allowedSignedUrl(value, userId) {
  try {
    const url = new URL(value);
    const prefix = '/storage/v1/object/sign/user-images/';
    if (
      url.protocol !== 'https:' ||
      url.hostname !== ALLOWED_SUPABASE_HOST ||
      !url.pathname.startsWith(prefix) ||
      !url.searchParams.has('token')
    ) return false;

    const owner = decodeURIComponent(url.pathname.slice(prefix.length).split('/')[0] || '');
    return Boolean(userId) && owner === String(userId);
  } catch {
    return false;
  }
}

function isPixhostUrl(value) {
  try {
    const url = new URL(value);
    const hostAllowed = PIXHOST_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix)) ||
      ['pixhost.to', 'pixhost.cc', 'pixho.st'].includes(url.hostname);
    return url.protocol === 'https:' && hostAllowed && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

function cairoDayStartISO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const get = type => parts.find(item => item.type === type)?.value;
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo', timeZoneName: 'longOffset'
  }).formatToParts(now).find(item => item.type === 'timeZoneName')?.value?.replace('GMT', '') || '+00:00';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00${offset}`).toISOString();
}

async function checkAccountAllowance(userId, accessToken, apiKey) {
  const headers = { apikey: apiKey, Authorization: `Bearer ${accessToken}` };
  const profileUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${userId}`);
  profileUrl.searchParams.set('select', 'plan,is_banned,daily_limit');

  const profileResponse = await fetch(profileUrl, {
    headers,
    signal: AbortSignal.timeout(10000)
  });
  if (!profileResponse.ok) return { status: 503, message: 'تعذر التحقق من حالة الحساب. حاول مرة أخرى.' };

  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (profile?.is_banned) return { status: 403, message: 'هذا الحساب موقوف عن استخدام الخدمة.' };
  if (profile?.plan === 'pro') return null;

  const parsedLimit = Number(profile?.daily_limit ?? 5);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 5;
  if (limit <= 0) return null;

  const operationsUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/operations`);
  operationsUrl.searchParams.set('user_id', `eq.${userId}`);
  operationsUrl.searchParams.set('created_at', `gte.${cairoDayStartISO()}`);
  operationsUrl.searchParams.set('select', 'id');
  operationsUrl.searchParams.set('limit', '1000');

  const operationsResponse = await fetch(operationsUrl, {
    headers,
    signal: AbortSignal.timeout(10000)
  });
  if (!operationsResponse.ok) return { status: 503, message: 'تعذر التحقق من الحد اليومي. حاول مرة أخرى.' };

  const operations = await operationsResponse.json().catch(() => null);
  if (!Array.isArray(operations)) return { status: 503, message: 'تعذر التحقق من سجل العمليات.' };
  if (operations.length >= limit) return { status: 429, message: `وصلت إلى الحد اليومي المسموح (${limit} عمليات).` };
  return null;
}

function safeFileExtension(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/avif') return 'avif';
  return 'png';
}

function bytesToAscii(bytes, start, end) {
  let value = '';
  for (let index = start; index < end && index < bytes.length; index++) value += String.fromCharCode(bytes[index]);
  return value;
}

function detectImageMime(bytes, declaredType = '') {
  if (bytes.length >= 8 && bytesToAscii(bytes, 1, 4) === 'PNG') return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytesToAscii(bytes, 0, 4) === 'RIFF' && bytesToAscii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytesToAscii(bytes, 0, 6))) return 'image/gif';
  if (bytes.length >= 12 && bytesToAscii(bytes, 4, 8) === 'ftyp' && /^(avif|avis)$/.test(bytesToAscii(bytes, 8, 12))) return 'image/avif';

  const declared = String(declaredType).split(';')[0].trim().toLowerCase();
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(declared) ? declared : '';
}

function decodeHtmlUrl(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/gi, '"')
    .trim();
}

function extractAttribute(tag, attribute) {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] || '';
}

function resolvePixhostCandidates(html, fallbackUrl, baseUrl) {
  const candidates = [];
  const add = (value, score) => {
    const decoded = decodeHtmlUrl(value);
    if (!decoded) return;
    try {
      const parsed = new URL(decoded, baseUrl);
      const absolute = parsed.toString();
      const looksLikeImage = /\.(?:png|jpe?g|webp|gif|avif)$/i.test(parsed.pathname) || /\/images\//i.test(parsed.pathname);
      if (isPixhostUrl(absolute) && looksLikeImage) candidates.push({ url: absolute, score });
    } catch {}
  };

  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imageTags) {
    const id = extractAttribute(tag, 'id').toLowerCase();
    const className = extractAttribute(tag, 'class').toLowerCase();
    const alt = extractAttribute(tag, 'alt').toLowerCase();
    const source = extractAttribute(tag, 'src') || extractAttribute(tag, 'data-src');
    const srcset = extractAttribute(tag, 'srcset');
    const srcsetUrl = srcset ? srcset.split(',')[0].trim().split(/\s+/)[0] : '';
    const value = source || srcsetUrl;
    if (!value) continue;

    if (/logo|avatar|icon|favicon|thumb/i.test(`${id} ${className} ${alt} ${value}`)) continue;
    let score = 10;
    if (id === 'image' || id.includes('main-image')) score += 100;
    if (className.includes('main-image') || className.includes('image-container')) score += 50;
    if (/\/images\//i.test(value)) score += 25;
    if (/\/thumbs?\//i.test(value) || /thumb/i.test(value)) score -= 60;
    add(value, score);
  }

  const anchorTags = html.match(/<a\b[^>]*>/gi) || [];
  for (const tag of anchorTags) {
    const href = extractAttribute(tag, 'href');
    if (/\.(?:png|jpe?g|webp|gif|avif)(?:[?#]|$)/i.test(href)) add(href, 20);
  }

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const property = (extractAttribute(tag, 'property') || extractAttribute(tag, 'name')).toLowerCase();
    if (property === 'og:image' || property === 'twitter:image') add(extractAttribute(tag, 'content'), 5);
  }

  add(fallbackUrl, -100);
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.url || '';
}

async function getPixhostImageUrl(showUrl, thumbnailUrl) {
  if (!isPixhostUrl(showUrl) || !isPixhostUrl(thumbnailUrl)) {
    throw new Error('أعادت Pixhost روابط غير صالحة.');
  }

  try {
    const pageResponse = await fetch(showUrl, {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(12000)
    });
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      const directUrl = resolvePixhostCandidates(html, thumbnailUrl, showUrl);
      if (directUrl) return directUrl;
    }
  } catch {
    // Use Pixhost's documented direct thumbnail URL if the image page is unavailable.
  }

  return thumbnailUrl;
}

async function uploadToPixhost(imageBytes, mimeType, filename) {
  const form = new FormData();
  form.append('img', new Blob([imageBytes], { type: mimeType }), filename);
  form.append('content_type', '0');
  form.append('max_th_size', '500');

  const response = await fetch(PIXHOST_UPLOAD_API, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(120000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || `فشل رفع الصورة إلى Pixhost (${response.status}).`;
    throw new Error(message);
  }
  if (!payload?.show_url || !payload?.th_url) throw new Error('لم تُرجع Pixhost روابط الصورة المطلوبة.');
  return payload;
}

function explainProviderError(bytes, contentType, status) {
  const raw = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 2000))).trim();
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return data?.message || data?.error || data?.detail || `تعذر على Nano Banana تنفيذ الطلب (${status}).`;
    } catch {
      if (!contentType.startsWith('image/')) return raw.slice(0, 260);
    }
  }
  return `تعذر على Nano Banana تنفيذ الطلب (${status}).`;
}

export async function onRequest({ request }) {
  if (request.method === 'GET') {
    return jsonResponse({ success: true, service: 'Nano Banana', platform: 'Cloudflare Pages', dependencies: 'none' });
  }
  if (request.method !== 'POST') return jsonError('طريقة الطلب غير مدعومة.', 405);

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError('بيانات الطلب غير صالحة.', 400);
    }

    const imageUrl = String(body?.imageUrl || '').trim();
    const prompt = String(body?.prompt || '').trim();
    const accessToken = String(request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const apiKey = String(request.headers.get('apikey') || '').trim();

    if (!accessToken || !apiKey) return jsonError('يلزم تسجيل الدخول لاستخدام تعديل الصور.', 401);

    const authResponse = await fetch(`https://${ALLOWED_SUPABASE_HOST}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!authResponse.ok) return jsonError('انتهت جلسة الحساب. سجّل الدخول مجددًا.', 401);

    const user = await authResponse.json().catch(() => null);
    if (!user?.id) return jsonError('تعذر التحقق من الحساب.', 401);

    const allowanceError = await checkAccountAllowance(user.id, accessToken, apiKey);
    if (allowanceError) return jsonError(allowanceError.message, allowanceError.status);
    if (!allowedSignedUrl(imageUrl, user.id)) return jsonError('رابط الصورة لا يطابق مساحة تخزين الحساب الحالي.', 403);
    if (!prompt || prompt.length > 5000) return jsonError('وصف التعديل مفقود أو أطول من الحد المسموح.', 400);

    const sourceResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(25000) });
    if (!sourceResponse.ok) return jsonError('تعذر تحميل الصورة من مساحة التخزين.', 502);

    const sourceBuffer = new Uint8Array(await sourceResponse.arrayBuffer());
    if (!sourceBuffer.length) return jsonError('ملف الصورة فارغ.', 400);
    if (sourceBuffer.length > MAX_SOURCE_BYTES) return jsonError('الحد الأقصى لرفع الصورة إلى Pixhost هو 10 ميجابايت.', 413);

    const sourceType = detectImageMime(sourceBuffer, sourceResponse.headers.get('content-type') || '');
    if (!sourceType) return jsonError('صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP أو GIF أو AVIF.', 415);

    const filename = `removebg-${String(user.id).slice(0, 8)}-${Date.now()}.${safeFileExtension(sourceType)}`;
    const pixhostUpload = await uploadToPixhost(sourceBuffer, sourceType, filename);
    const pixhostImageUrl = await getPixhostImageUrl(pixhostUpload.show_url, pixhostUpload.th_url);

    const nanoUrl = new URL(NANO_API);
    nanoUrl.searchParams.set('url', pixhostImageUrl);
    nanoUrl.searchParams.set('prompt', prompt);

    const nanoResponse = await fetch(nanoUrl, {
      method: 'GET',
      headers: { Accept: 'image/*, application/octet-stream' },
      signal: AbortSignal.timeout(120000)
    });

    const resultBytes = new Uint8Array(await nanoResponse.arrayBuffer());
    const resultType = detectImageMime(resultBytes, nanoResponse.headers.get('content-type') || '');
    const responseType = (nanoResponse.headers.get('content-type') || '').toLowerCase();

    if (!nanoResponse.ok || !resultType) {
      return jsonError(explainProviderError(resultBytes, responseType, nanoResponse.status), 502);
    }
    if (!resultBytes.length || resultBytes.length > MAX_RESULT_BYTES) return jsonError('حجم الصورة الناتجة غير صالح.', 502);

    return new Response(resultBytes, {
      status: 200,
      headers: {
        'Content-Type': resultType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|timed out/i.test(error?.message || '');
    return jsonError(
      timedOut ? 'استغرقت المعالجة وقتًا أطول من المسموح. أعد المحاولة.' : (error?.message || 'حدث خطأ أثناء رفع الصورة أو تعديلها.'),
      timedOut ? 504 : 502
    );
  }
}
