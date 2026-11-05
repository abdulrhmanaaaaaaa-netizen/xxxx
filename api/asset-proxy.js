const MAX_BYTES = 4 * 1024 * 1024; // Stay below Vercel's 4.5 MB function response limit.
const REDIRECT_HOSTS = new Set([
  'api.openverse.org', 'images.unsplash.com', 'cdn.jsdelivr.net', 'i.postimg.cc',
  'live.staticflickr.com', 'upload.wikimedia.org', 'images.pexels.com',
  'images.openverse.org', 'media.openverse.org'
]);

function sendError(res, status, message) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json({ error: message });
}

function validSource(url) {
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
  if (url.hostname === 'images.unsplash.com') return /^\/photo-[a-zA-Z0-9-]+/.test(url.pathname);
  if (url.hostname === 'i.postimg.cc') return /\.(png|jpe?g|webp)$/i.test(url.pathname);
  if (url.hostname === 'cdn.jsdelivr.net') return /^\/npm\/openmoji@[0-9.]+\/color\/svg\/[0-9A-F-]+\.svg$/i.test(url.pathname);
  if (url.hostname === 'api.openverse.org') {
    return /^\/v1\/(?:images\/[0-9a-f-]{36}\/thumb|thumbs\/[0-9a-f-]{36})\/?$/i.test(url.pathname);
  }
  if (url.hostname === 'live.staticflickr.com') return /^\/[0-9]+\/[0-9]+_[a-f0-9]+(?:_[a-z])?\.(?:jpe?g|png|webp)$/i.test(url.pathname);
  if (url.hostname === 'upload.wikimedia.org') return url.pathname.startsWith('/wikipedia/commons/') && /\.(?:jpe?g|png|webp|svg)$/i.test(url.pathname) && !url.pathname.includes('..');
  if (url.hostname === 'images.pexels.com') return /^\/photos\/[0-9]+\//i.test(url.pathname);
  if (url.hostname === 'images.openverse.org' || url.hostname === 'media.openverse.org') return /\.(?:jpe?g|png|webp)$/i.test(url.pathname) || /^\/[^/]+\//.test(url.pathname);
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendError(res, 405, 'الطلب غير مدعوم.');
  }

  try {
    const raw = String(req.query?.url || '');
    if (!raw || raw.length > 4096) return sendError(res, 400, 'رابط المورد غير صالح.');
    let target = new URL(raw);
    if (!validSource(target)) return sendError(res, 403, 'مصدر الصورة غير مسموح به عبر الوسيط.');

    let response = null;
    for (let hop = 0; hop <= 3; hop++) {
      response = await fetch(target, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml;q=0.9,*/*;q=0.5' }
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || hop === 3) return sendError(res, 502, 'تعذر فتح مصدر الصورة.');
        const next = new URL(location, target);
        if (next.protocol !== 'https:' || !REDIRECT_HOSTS.has(next.hostname) || next.username || next.password) {
          return sendError(res, 502, 'أعاد مصدر الصورة رابطًا غير مسموح به.');
        }
        target = next;
        continue;
      }
      break;
    }

    if (!response?.ok) return sendError(res, response?.status === 404 ? 404 : 502, 'تعذر تحميل المورد من مصدره.');
    const type = response.headers.get('content-type') || '';
    if (!type.toLowerCase().startsWith('image/')) return sendError(res, 415, 'المورد المستلم ليس صورة.');
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_BYTES) return sendError(res, 413, 'حجم المورد أكبر من 4MB. سيحاول المحرر فتح المصدر مباشرة إذا كان يسمح بذلك.');
    if (!response.body) return sendError(res, 502, 'مصدر الصورة لم يُرجع محتوى قابلاً للقراءة.');
    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      totalBytes += part.value.byteLength;
      if (totalBytes > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return sendError(res, 413, 'حجم المورد أكبر من 4MB. سيحاول المحرر فتح المصدر مباشرة إذا كان يسمح بذلك.');
      }
      chunks.push(Buffer.from(part.value));
    }
    const buffer = Buffer.concat(chunks, totalBytes);
    if (!buffer.length) return sendError(res, 502, 'ملف الصورة المستلم فارغ.');

    res.setHeader('Content-Type', type.split(';')[0]);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Asset proxy error:', error?.message || error);
    return sendError(res, 502, 'تعذر تحميل المورد الخارجي. تحقق من الاتصال أو جرّب موردًا آخر.');
  }
};
