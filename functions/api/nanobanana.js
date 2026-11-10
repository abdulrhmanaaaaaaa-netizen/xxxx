// Cloudflare Pages Function: POST /api/nanobanana
// Requires nodejs_compat because node-upload-images uses Node-compatible packages.
import axios from 'axios';
import { ImageUploadService } from 'node-upload-images';
import { Buffer } from 'node:buffer';

// node-upload-images shares this Axios installation. Use Fetch on Workers instead of Node's http adapter.
axios.defaults.adapter = 'fetch';

const ALLOWED_SUPABASE_HOST = 'skhvturpodaimjjpjmtx.supabase.co';
const NANO_API = 'https://api-faa.my.id/faa/nano-banana';
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_RESULT_BYTES = 30 * 1024 * 1024;
const UPLOAD_HOST = 'pixhost.to';

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

function allowedSignedUrl(value, userId) {
  try {
    const url = new URL(value);
    const prefix = '/storage/v1/object/sign/user-images/';
    if (url.protocol !== 'https:' || url.hostname !== ALLOWED_SUPABASE_HOST || !url.pathname.startsWith(prefix) || !url.searchParams.has('token')) return false;
    const owner = decodeURIComponent(url.pathname.slice(prefix.length).split('/')[0] || '');
    return !!userId && owner === String(userId);
  } catch { return false; }
}

function cairoDayStartISO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(item => item.type === type)?.value;
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(now).find(item => item.type === 'timeZoneName')?.value?.replace('GMT', '') || '+00:00';
  return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00${offset}`).toISOString();
}

async function checkAccountAllowance(userId, accessToken, apiKey) {
  const headers = { apikey: apiKey, Authorization: `Bearer ${accessToken}` };
  const profileUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/profiles`);
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

  const operationsUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/operations`);
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

function extensionFromMime(mime) {
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('gif')) return 'gif';
  return 'png';
}

function detectImageMime(buffer, header = '') {
  const declared = String(header || '').split(';')[0].trim().toLowerCase();
  if (declared.startsWith('image/')) return declared;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) return 'image/gif';
  return '';
}

function explainProviderError(buffer, contentType, status) {
  const raw = buffer.toString('utf8').trim().slice(0, 2000);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return data?.message || data?.error || data?.detail || `تعذر على Nano Banana تنفيذ الطلب (${status}).`;
    } catch {}
    if (!contentType.startsWith('image/')) return raw.slice(0, 260);
  }
  return `تعذر على Nano Banana تنفيذ الطلب (${status}).`;
}

export async function onRequest({ request }) {
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ success: true, service: 'Nano Banana', platform: 'Cloudflare Pages' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  }
  if (request.method !== 'POST') return jsonError('طريقة الطلب غير مدعومة.', 405);
  try {
    const body = await request.json();
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
    const sourceType = (sourceResponse.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!sourceType.startsWith('image/')) return jsonError('الملف المحفوظ ليس صورة مدعومة.', 415);
    const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer());
    if (!sourceBuffer.length || sourceBuffer.length > MAX_SOURCE_BYTES) return jsonError('حجم الصورة أكبر من الحد المسموح لخدمة الذكاء الاصطناعي.', 413);

    const uploadService = new ImageUploadService(UPLOAD_HOST);
    const filename = `removebg-${String(user.id).slice(0, 8)}-${Date.now()}.${extensionFromMime(sourceType)}`;
    const uploadResult = await uploadService.uploadFromBinary(sourceBuffer, filename);
    const directLink = String(uploadResult?.directLink || '').trim();
    if (!directLink) return jsonError('لم تُرجع Pixhost رابطًا مباشرًا للصورة.', 502);

    let pixhostUrl;
    try {
      pixhostUrl = new URL(directLink);
      if (pixhostUrl.protocol !== 'https:' || !(pixhostUrl.hostname === UPLOAD_HOST || pixhostUrl.hostname.endsWith(`.${UPLOAD_HOST}`))) throw new Error('invalid Pixhost URL');
    } catch {
      return jsonError('رابط الصورة الذي أعادته Pixhost غير صالح.', 502);
    }

    const nanoResponse = await axios.get(NANO_API, {
      params: { url: pixhostUrl.toString(), prompt },
      responseType: 'arraybuffer',
      timeout: 120000,
      maxContentLength: MAX_RESULT_BYTES,
      maxBodyLength: MAX_RESULT_BYTES,
      adapter: 'fetch',
      headers: { Accept: 'image/*, application/octet-stream' },
      validateStatus: () => true
    });

    const resultBytes = Buffer.from(nanoResponse.data || []);
    const contentType = String(nanoResponse.headers?.['content-type'] || '').toLowerCase();
    const resultType = detectImageMime(resultBytes, contentType);
    if (nanoResponse.status < 200 || nanoResponse.status >= 300 || !resultType) {
      return jsonError(explainProviderError(resultBytes, contentType, nanoResponse.status), 502);
    }
    if (!resultBytes.length || resultBytes.length > MAX_RESULT_BYTES) return jsonError('حجم الصورة الناتجة غير صالح.', 502);

    return new Response(resultBytes, {
      status: 200,
      headers: { 'Content-Type': resultType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch (error) {
    const timedOut = error?.code === 'ECONNABORTED' || error?.name === 'TimeoutError' || /timeout/i.test(error?.message || '');
    return jsonError(timedOut ? 'استغرقت معالجة Nano Banana وقتًا أطول من المسموح. أعد المحاولة.' : (error?.message || 'حدث خطأ أثناء رفع الصورة أو تعديلها.'), timedOut ? 504 : 502);
  }
}
