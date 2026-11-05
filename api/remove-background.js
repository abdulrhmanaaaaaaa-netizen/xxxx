const PIXELCUT_ENDPOINT = 'https://api.developer.pixelcut.ai/v1/remove-background';
const MAX_RESULT_BYTES = 30 * 1024 * 1024;

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function getBearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function getCairoDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const localAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  const offset = localAsUtc - now.getTime();
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offset);
}

async function supabaseFetch(url, token, anonKey, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
}

function encodeStoragePath(path) {
  return String(path).split('/').map(encodeURIComponent).join('/');
}

function absoluteStorageUrl(value, baseUrl) {
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return value;
  const base = String(baseUrl).replace(/\/$/, '');
  if (value.startsWith('/storage/v1/')) return base + value;
  if (value.startsWith('/object/')) return base + '/storage/v1' + value;
  return base + '/storage/v1/' + String(value).replace(/^\/+/, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'الطلب غير مدعوم.');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'user-images';
  const pixelcutKey = process.env.PIXELCUT_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return sendError(res, 503, 'إعدادات التحقق من الحساب غير مكتملة في متغيرات الاستضافة.');
  }
  if (!pixelcutKey) {
    return sendError(res, 503, 'خدمة إزالة الخلفية غير مفعّلة بعد. يجب على مالك المشروع إعداد PIXELCUT_API_KEY في متغيرات Vercel.');
  }

  const token = getBearerToken(req);
  if (!token) return sendError(res, 401, 'انتهت الجلسة. سجّل الدخول ثم أعد المحاولة.');
  let storedResultPath = null;
  let authenticatedUserId = null;

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') return sendError(res, 400, 'بيانات الطلب غير صالحة.');

    const userResponse = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, token, supabaseKey);
    if (!userResponse.ok) return sendError(res, 401, 'تعذر التحقق من جلسة الحساب. سجّل الدخول من جديد.');
    const user = await userResponse.json();
    if (!user?.id) return sendError(res, 401, 'جلسة الحساب غير صالحة.');
    authenticatedUserId = user.id;

    const rawImageUrl = String(body.image_url || '');
    if (!rawImageUrl || rawImageUrl.length > 8000) return sendError(res, 400, 'رابط الصورة المؤقت غير صالح.');

    const imageUrl = new URL(rawImageUrl);
    const projectUrl = new URL(supabaseUrl);
    if (imageUrl.protocol !== 'https:' || imageUrl.origin !== projectUrl.origin) {
      return sendError(res, 400, 'يجب أن تكون الصورة من مساحة التخزين المرتبطة بالمشروع.');
    }

    let decodedPath;
    try { decodedPath = decodeURIComponent(imageUrl.pathname); }
    catch { return sendError(res, 400, 'مسار الصورة غير صالح.'); }
    const prefix = `/storage/v1/object/sign/${bucket}/`;
    if (!decodedPath.startsWith(prefix)) {
      return sendError(res, 400, 'يجب استخدام رابط تخزين مؤقت صادر من Supabase.');
    }
    const objectPath = decodedPath.slice(prefix.length);
    if (!objectPath.startsWith(`${user.id}/orig-`) || objectPath.includes('..')) {
      return sendError(res, 403, 'لا يمكن معالجة ملف لا يخص هذا الحساب.');
    }

    const profileUrl = new URL('/rest/v1/profiles', projectUrl);
    profileUrl.search = new URLSearchParams({ id: `eq.${user.id}`, select: 'plan,daily_limit,is_banned' }).toString();
    const profileResponse = await supabaseFetch(profileUrl, token, supabaseKey);
    if (!profileResponse.ok) return sendError(res, 503, 'تعذر قراءة إعدادات الحساب من Supabase.');
    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (profile?.is_banned) return sendError(res, 403, 'هذا الحساب موقوف عن استخدام الخدمة.');

    if (profile?.plan !== 'pro') {
      const dailyLimit = Number(profile?.daily_limit ?? 5);
      if (dailyLimit > 0) {
        const dayStart = getCairoDayStart();
        const operationsUrl = new URL('/rest/v1/operations', projectUrl);
        operationsUrl.search = new URLSearchParams({
          user_id: `eq.${user.id}`,
          created_at: `gte.${dayStart.toISOString()}`,
          select: 'id'
        }).toString();
        const operationsResponse = await supabaseFetch(operationsUrl, token, supabaseKey, { headers: { Range: '0-999' } });
        if (!operationsResponse.ok) return sendError(res, 503, 'تعذر التحقق من الحد اليومي. أعد المحاولة لاحقًا.');
        const operations = await operationsResponse.json();
        if (Array.isArray(operations) && operations.length >= dailyLimit) {
          return sendError(res, 429, `وصلت إلى الحد اليومي المسموح (${dailyLimit} عمليات).`);
        }
      }
    }

    const pixelcutResponse = await fetch(PIXELCUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': pixelcutKey
      },
      body: JSON.stringify({ image_url: imageUrl.toString(), format: 'png' })
    });

    if (!pixelcutResponse.ok) {
      const detail = await pixelcutResponse.text().catch(() => '');
      if (pixelcutResponse.status === 401 || pixelcutResponse.status === 403) {
        return sendError(res, 502, 'رفض مزوّد المعالجة مفتاح API. راجع إعداده في متغيرات Vercel.');
      }
      if (pixelcutResponse.status === 402) {
        return sendError(res, 502, 'رصيد خدمة معالجة الصور غير كافٍ أو أن الفوترة غير مفعّلة.');
      }
      if (pixelcutResponse.status === 429) {
        return sendError(res, 429, 'خدمة المعالجة مشغولة أو تجاوزت حد الطلبات. حاول لاحقًا.');
      }
      console.error('Pixelcut request failed:', pixelcutResponse.status, detail.slice(0, 500));
      return sendError(res, 502, 'تعذر إتمام المعالجة لدى مزوّد الخدمة. حاول لاحقًا.');
    }

    const payload = await pixelcutResponse.json();
    const resultUrl = String(payload?.result_url || '');
    if (!resultUrl) return sendError(res, 502, 'لم يُرجع مزوّد الخدمة رابط النتيجة.');

    const parsedResult = new URL(resultUrl);
    if (parsedResult.protocol !== 'https:' || !(parsedResult.hostname === 'pixelcut.app' || parsedResult.hostname.endsWith('.pixelcut.app'))) {
      return sendError(res, 502, 'أعاد مزوّد الخدمة رابط نتيجة غير موثوق.');
    }

    const resultResponse = await fetch(parsedResult);
    if (!resultResponse.ok) return sendError(res, 502, 'تعذر تنزيل الصورة المعالجة من مزوّد الخدمة.');
    const resultType = resultResponse.headers.get('content-type') || '';
    if (!resultType.toLowerCase().startsWith('image/')) return sendError(res, 502, 'النتيجة المستلمة ليست ملف صورة.');
    const declaredLength = Number(resultResponse.headers.get('content-length') || 0);
    if (declaredLength > MAX_RESULT_BYTES) return sendError(res, 502, 'حجم الصورة الناتجة أكبر من الحد المسموح.');
    const resultBuffer = Buffer.from(await resultResponse.arrayBuffer());
    if (!resultBuffer.length || resultBuffer.length > MAX_RESULT_BYTES) {
      return sendError(res, 502, 'حجم الصورة الناتجة غير صالح.');
    }

    // Store the image directly in the user's Supabase bucket. The browser only receives a small JSON response,
    // avoiding Vercel's 4.5 MB response-body limit for large PNG exports.
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    storedResultPath = `${user.id}/res-${suffix}.png`;
    const storagePath = encodeStoragePath(storedResultPath);
    const storageBase = supabaseUrl.replace(/\/$/, '');
    const uploadResponse = await supabaseFetch(`${storageBase}/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath}`, token, supabaseKey, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', 'x-upsert': 'false', 'cache-control': '3600' },
      body: resultBuffer
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text().catch(() => '');
      console.error('Supabase result upload failed:', uploadResponse.status, detail.slice(0, 500));
      storedResultPath = null;
      return sendError(res, 502, 'تمت المعالجة، لكن تعذر حفظ النتيجة في مساحة التخزين. تحقق من صلاحيات الرفع.');
    }

    const signedResponse = await supabaseFetch(`${storageBase}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${storagePath}`, token, supabaseKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 900 })
    });
    if (!signedResponse.ok) {
      const detail = await signedResponse.text().catch(() => '');
      console.error('Supabase signed URL failed:', signedResponse.status, detail.slice(0, 500));
      throw new Error('تم حفظ النتيجة، لكن تعذر إنشاء رابط تنزيل مؤقت.');
    }
    const signedData = await signedResponse.json();
    const signedUrl = absoluteStorageUrl(signedData?.signedURL || signedData?.signedUrl || signedData?.url || signedData?.signed_url, storageBase);
    if (!signedUrl) throw new Error('تم حفظ النتيجة، لكن لم يرجع التخزين رابطًا صالحًا.');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ path: storedResultPath, signed_url: signedUrl, content_type: 'image/png' });
  } catch (error) {
    if (storedResultPath && authenticatedUserId) {
      try {
        const storageBase = supabaseUrl.replace(/\/$/, '');
        await supabaseFetch(`${storageBase}/storage/v1/object/${encodeURIComponent(bucket)}`, token, supabaseKey, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: [storedResultPath] })
        });
      } catch {}
    }
    console.error('Background removal proxy error:', error?.message || error);
    return sendError(res, 500, error?.message || 'حدث خطأ غير متوقع أثناء معالجة الصورة.');
  }
};
