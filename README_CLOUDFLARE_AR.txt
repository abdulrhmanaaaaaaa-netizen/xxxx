RemoveBG — Cloudflare Pages | ملفات الجذر مباشرة | بدون مكتبات npm
====================================================================

ارفع محتويات هذه الحزمة مباشرة إلى جذر مستودع GitHub، وليس داخل مجلد.
يجب أن ترى index.html مباشرة في صفحة المستودع الرئيسية.

الملفات:
- index.html
- styles.css
- app.js
- config.js
- images/
- functions/api/nanobanana.js
- functions/api/ai-image/[operation].js
- _routes.json

لا يوجد package.json أو package-lock.json أو node_modules أو build.mjs.
لا تحتاج إلى npm install أو تثبيت أي مكتبات.

إعداد Cloudflare Pages (Git Integration):
1) Framework preset: None
2) Root directory: اتركه فارغًا
3) Build command: exit 0
4) Build output directory: .
5) Production branch: الفرع المرتبط بالنشر (مثل main)

بعد حفظ أي Commit إلى الفرع المرتبط، Cloudflare ينشر تلقائيًا.
لا تستخدم Direct Upload إذا كنت تريد الاستمرار في النشر التلقائي من GitHub.

تأكد أن مجلد functions في جذر المستودع، وبداخله api/nanobanana.js.
ملف _routes.json يجعل Pages Functions تعمل على /api/* فقط.

فحص الشاشة البيضاء:
- /index.html
- /styles.css?v=20261111-rootfix1
- /config.js?v=20261111-rootfix1
- /app.js?v=20261111-rootfix1
- /api/nanobanana

أضيفت رسالة تشخيص داخل الصفحة عند تعذر تحميل app.js أو config.js أو styles.css،
وعند حدوث خطأ أثناء تشغيل التطبيق. كما أصبح ظهور شاشة تسجيل الدخول لا ينتظر اتصال Supabase.

لا توجد مكتبات JavaScript خارجية مطلوبة لتشغيل الموقع. الخطوط الخارجية اختيارية فقط،
ويستخدم الموقع بدائل خطوط محلية من النظام عند عدم توفر اتصال Google Fonts.

تنبيه خصوصية: Nano Banana يرفع نسخة الصورة إلى Pixhost ثم يرسل رابطها إلى مزود المعالجة الخارجي.


إعداد تحويلات KYZZ AI (13 خدمة)
================================
أضيفت الخدمات التالية عبر المسار /api/ai-image/:operation:
- to3d، edit-image، toanime، tocyberpunk، todisney، toghibli، tohitam،
  tojepang، tolego، tomanga، tooil، topixar، tosketch.

حماية المفتاح:
1) افتح Cloudflare Dashboard ثم Workers & Pages واختر مشروع Pages.
2) افتح Settings ثم Variables and Secrets.
3) أضف Secret باسم KYZZ_API_KEY، والصق قيمة المفتاح التي تملكها.
4) أضفه إلى Production، وإلى Preview إذا كنت تختبر معاينات الفروع.
5) أعد نشر المشروع بعد حفظ السر.

لا تضع مفتاح KYZZ في config.js أو app.js أو أي ملف داخل GitHub؛
الواجهة ترسل الطلب إلى Pages Function، وهي تضيف المفتاح من Secret على الخادم.

تتطلب الخدمات تسجيل الدخول وتستخدم الحد اليومي نفسه وسجل العمليات الموجودين
في حساب RemoveBG. يجب أن يكون مجلد functions/api/ai-image في جذر المستودع.
