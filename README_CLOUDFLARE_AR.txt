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
