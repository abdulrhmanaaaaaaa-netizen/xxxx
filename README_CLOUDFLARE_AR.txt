RemoveBG — Cloudflare Pages | الحزمة الكاملة
================================================

ارفع محتويات هذه الحزمة مباشرة إلى جذر مستودع GitHub، وليس داخل مجلد إضافي.
يجب أن يظهر index.html مباشرة في الجذر.

الملفات الأساسية:
- index.html وstyles.css وapp.js وconfig.js
- images/ (معاينات الاستايلات والمؤثرات والشعار المحلي)
- functions/api/image-process.js
- functions/_shared/kyzz-config.js
- _routes.json

لا تحتاج إلى مكتبات npm أو عملية بناء. إعداد Cloudflare Pages:
1) Framework preset: None
2) Root directory: فارغ
3) Build command: exit 0
4) Build output directory: .

مفتاح الخدمة:
- يوجد مفتاح Kyzzz داخل functions/_shared/kyzz-config.js ويُستخدم من الخادم فقط.
- لا تضف المفتاح إلى index.html أو app.js أو config.js.
- ملف الخادم لا يُقدّم كملف ثابت لزوار الموقع، لكن من يقرأ مستودع المصدر يستطيع رؤية قيمته؛ اجعل المستودع خاصًا.
- الأوامر التي أرسلتها تتضمن مفتاح Kyzzz واحدًا مكررًا في جميع الطلبات؛ لم يظهر مفتاح Kyzzz ثانٍ مختلف.
- قيمة Supabase الموجودة في config.js هي مفتاح نشر عام (publishable) لتسجيل الدخول، وليست مفتاح Kyzzz السري.

مسار المعالجة الخادمي:
POST /api/image-process
التحويلات: to3d, toanime, tocyberpunk, todisney, toghibli, tohitam, tojepang,
tolego, tomanga, tooil, topixar, tosketch.
التعديل الحر والمؤثرات الجاهزة تستخدم edit-image وترسل الصورة والوصف في multipart/form-data.

الوصول من الهاتف:
تفتح الواجهة بتخطيط سطح المكتب تلقائيًا، وتسمح بالتكبير والتصغير باللمس.

الصور:
- لكل تحويل صورة معاينة مناسبة باسمه الصحيح.
- تُحمّل صور المعاينة المحلية مباشرة مع رقم إصدار لتجنب استخدام نسخ مخزنة قديمة.
- الشعار محلي داخل images/ ولا يعتمد على مستضيف خارجي.

ملاحظة الاختبار:
تم فحص الملفات والمسارات والعمليات محليًا بمحاكاة طلبات الخادم. لم يُجرَ اتصال حي بمزود Kyzzz أو نشر على حساب Cloudflare، لذا يجب اختبار طلب حقيقي بعد النشر.
