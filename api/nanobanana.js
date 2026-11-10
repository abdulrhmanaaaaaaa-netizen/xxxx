// Vercel serverless route for Nano Banana image editing.
// Accepts a short-lived signed image URL from the existing private Supabase bucket.
// No API key is embedded in the browser.

const ALLOWED_SUPABASE_HOST = 'skhvturpodaimjjpjmtx.supabase.co';
const IMAGE_HOST = 'https://imgbb.com/json';
const NANO_API = 'https://johan-vex-apis.vercel.app/api/tools/nanobanan';
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_RESULT_BYTES = 30 * 1024 * 1024;

function sendError(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ success:false, error:message }));
}

function isAllowedSignedUrl(value, userId) {
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
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone:'Africa/Cairo', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const part = type => dateParts.find(item => item.type === type)?.value;
  const offset = new Intl.DateTimeFormat('en-US', { timeZone:'Africa/Cairo', timeZoneName:'longOffset' }).formatToParts(now).find(item => item.type === 'timeZoneName')?.value?.replace('GMT', '') || '+00:00';
  return new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00${offset}`).toISOString();
}

async function checkAccountAllowance(userId, accessToken, apiKey) {
  const headers = { apikey:apiKey, Authorization:`Bearer ${accessToken}` };
  const profileUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/profiles`);
  profileUrl.searchParams.set('id', `eq.${userId}`);
  profileUrl.searchParams.set('select', 'plan,is_banned,daily_limit');
  const profileResponse = await fetch(profileUrl, { headers, signal:AbortSignal.timeout(10000) });
  if (!profileResponse.ok) return { status:503, message:'تعذر التحقق من حالة الحساب. حاول مرة أخرى.' };
  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (profile?.is_banned) return { status:403, message:'هذا الحساب موقوف عن استخدام الخدمة.' };
  if (profile?.plan === 'pro') return null;
  const parsedLimit = Number(profile?.daily_limit ?? 5);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 5;
  if (limit <= 0) return null;

  const operationsUrl = new URL(`https://${ALLOWED_SUPABASE_HOST}/rest/v1/operations`);
  operationsUrl.searchParams.set('user_id', `eq.${userId}`);
  operationsUrl.searchParams.set('created_at', `gte.${cairoDayStartISO()}`);
  operationsUrl.searchParams.set('select', 'id');
  operationsUrl.searchParams.set('limit', '1000');
  const operationsResponse = await fetch(operationsUrl, { headers, signal:AbortSignal.timeout(10000) });
  if (!operationsResponse.ok) return { status:503, message:'تعذر التحقق من الحد اليومي. حاول مرة أخرى.' };
  const operations = await operationsResponse.json().catch(() => null);
  if (!Array.isArray(operations)) return { status:503, message:'تعذر التحقق من سجل العمليات.' };
  if (operations.length >= limit) return { status:429, message:`وصلت إلى الحد اليومي المسموح (${limit} عمليات).` };
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return sendError(res, 405, 'طريقة الطلب غير مدعومة.');

  let deleteUrl = '';
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const imageUrl = String(body.imageUrl || '').trim();
    const prompt = String(body.prompt || '').trim();
    const accessToken = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const apiKey = String(req.headers?.apikey || '').trim();
    if (!accessToken || !apiKey) return sendError(res, 401, 'يلزم تسجيل الدخول لاستخدام تعديل الصور.');
    const authResponse = await fetch(`https://${ALLOWED_SUPABASE_HOST}/auth/v1/user`, { headers:{ apikey:apiKey, Authorization:`Bearer ${accessToken}` }, signal:AbortSignal.timeout(12000) });
    if (!authResponse.ok) return sendError(res, 401, 'انتهت جلسة الحساب. سجّل الدخول مجددًا.');
    const user = await authResponse.json().catch(() => null);
    if (!user?.id) return sendError(res, 401, 'تعذر التحقق من الحساب.');
    const allowanceError = await checkAccountAllowance(user.id, accessToken, apiKey);
    if (allowanceError) return sendError(res, allowanceError.status, allowanceError.message);
    if (!isAllowedSignedUrl(imageUrl, user.id)) return sendError(res, 403, 'رابط الصورة لا يطابق مساحة تخزين الحساب الحالي.');
    if (!prompt || prompt.length > 5000) return sendError(res, 400, 'وصف التعديل مفقود أو أطول من الحد المسموح.');

    const sourceResponse = await fetch(imageUrl, { signal:AbortSignal.timeout(25000) });
    if (!sourceResponse.ok) return sendError(res, 502, 'تعذر تحميل الصورة من مساحة التخزين.');
    const sourceType = (sourceResponse.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!sourceType.startsWith('image/')) return sendError(res, 415, 'الملف المحفوظ ليس صورة مدعومة.');
    const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
    if (!sourceBytes.length || sourceBytes.length > MAX_SOURCE_BYTES) return sendError(res, 413, 'حجم الصورة المرسلة إلى خدمة الذكاء الاصطناعي أكبر من الحد المسموح.');

    const extension = sourceType.includes('webp') ? 'webp' : sourceType.includes('jpeg') ? 'jpg' : 'png';
    const uploadForm = new FormData();
    uploadForm.append('source', new Blob([sourceBytes], { type:sourceType }), `source.${extension}`);
    uploadForm.append('type', 'file');
    uploadForm.append('action', 'upload');
    const uploadResponse = await fetch(IMAGE_HOST, {
      method:'POST',
      headers:{ 'User-Agent':'Mozilla/5.0' },
      body:uploadForm,
      signal:AbortSignal.timeout(30000)
    });
    const uploadData = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok || !uploadData?.image?.url) {
      return sendError(res, 502, uploadData?.error?.message || uploadData?.message || 'فشل رفع الصورة إلى خدمة معالجة الصور.');
    }
    deleteUrl = String(uploadData.image.delete_url || '');

    const nanoUrl = new URL(NANO_API);
    nanoUrl.searchParams.set('url', uploadData.image.url);
    nanoUrl.searchParams.set('prompt', prompt);
    const nanoResponse = await fetch(nanoUrl, {
      method:'GET',
      headers:{ 'Accept':'application/json' },
      signal:AbortSignal.timeout(55000)
    });
    const nanoData = await nanoResponse.json().catch(() => null);
    if (!nanoResponse.ok || !nanoData?.success || !nanoData?.result_url) {
      return sendError(res, 502, nanoData?.error || nanoData?.message || `فشلت خدمة Nano Banana (${nanoResponse.status}).`);
    }

    let resultUrl;
    try {
      resultUrl = new URL(nanoData.result_url);
      if (resultUrl.protocol !== 'https:') throw new Error('invalid protocol');
    } catch { return sendError(res, 502, 'أعادت الخدمة رابط نتيجة غير صالح.'); }

    const resultResponse = await fetch(resultUrl, { signal:AbortSignal.timeout(30000) });
    if (!resultResponse.ok) return sendError(res, 502, 'تعذر تنزيل الصورة الناتجة.');
    const resultType = (resultResponse.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!resultType.startsWith('image/')) return sendError(res, 502, 'نتيجة Nano Banana ليست ملف صورة.');
    const resultBytes = Buffer.from(await resultResponse.arrayBuffer());
    if (!resultBytes.length || resultBytes.length > MAX_RESULT_BYTES) return sendError(res, 502, 'حجم النتيجة غير صالح.');

    res.statusCode = 200;
    res.setHeader('Content-Type', resultType);
    res.setHeader('Content-Length', String(resultBytes.length));
    res.setHeader('Cache-Control', 'no-store');
    res.end(resultBytes);
  } catch (error) {
    console.error('Nano Banana API route:', error);
    return sendError(res, 500, error?.name === 'TimeoutError' ? 'انتهت مهلة خدمة تعديل الصور. جرّب مرة أخرى.' : (error?.message || 'حدث خطأ أثناء تعديل الصورة.'));
  } finally {
    if (deleteUrl) {
      try { await fetch(deleteUrl, { method:'GET', signal:AbortSignal.timeout(5000) }); }
      catch (error) { console.warn('ImgBB cleanup failed:', error?.message || error); }
    }
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit:'1mb' } },
  maxDuration: 60
};
