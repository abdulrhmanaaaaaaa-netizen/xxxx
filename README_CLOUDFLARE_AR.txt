RemoveBG — Cloudflare Pages | ملفات الجذر مباشرة | بدون مكتبات npm
====================================================================

ارفع محتويات هذه الحزمة مباشرة إلى جذر مستودع GitHub، وليس داخل مجلد.
يجب أن ترى index.html مباشرة في صفحة المستودع الرئيسية.

الملفات الأساسية:
- index.html
- styles.css
- app.js
- config.js
- images/
- functions/api/image-process.js
- functions/_shared/kyzz-config.js (ملف خادمي للمفتاح)
- _routes.json

لا توجد مكتبات npm أو node_modules أو عملية بناء مطلوبة.

إعداد Cloudflare Pages:
1) Framework preset: None
2) Root directory: اتركه فارغًا
3) Build command: exit 0
4) Build output directory: .
5) اربط المشروع بمستودع GitHub عبر Git integration.

المفتاح:
- المفتاح موجود مسبقًا في functions/_shared/kyzz-config.js.
- لا تحتاج إلى إضافة KYZZ_API_KEY في لوحة Cloudflare حتى تعمل النسخة المرفقة.
- يمكن تجاوز المفتاح المضمّن بإضافة Cloudflare Secret بالاسم KYZZ_API_KEY.
- الملف داخل مجلد Functions الخادمي، ولا يُحمّل إلى المتصفح ولا يظهر في app.js أو طلبات صفحة الويب.
- مهم: لأن المفتاح موجود في ملفات المصدر، اجعل مستودع GitHub خاصًا. أي شخص يستطيع قراءة ملفات المستودع يمكنه رؤية المفتاح؛ لا توجد طريقة لإخفائه عن مالك أو قارئ المصدر نفسه.

مسارات الخدمة:
- POST /api/image-process
- تدعم التحويلات: to3d, toanime, tocyberpunk, todisney, toghibli, tohitam,
  tojepang, tolego, tomanga, tooil, topixar, tosketch.
- التعديل بالوصف والمؤثرات الجاهزة يستخدمان edit-image.

وضع العرض:
على الهواتف يتم فتح الموقع بعرض واجهة الكمبيوتر تلقائيًا. يمكن تكبير وتصغير الصفحة
باللمس، بينما تظل نسخة سطح المكتب هي التخطيط الافتراضي.

ملاحظات الخصوصية:
تُرسل نسخة الصورة إلى مزود المعالجة الخارجي لتنفيذ العملية المختارة. لا ترفع صورًا
خاصة أو حساسة إلا بعد مراجعة سياسة مزود الخدمة. مفتاح المزود لا يُرسل إلى المتصفح؛
تتم مخاطبة مزود الخدمة من الخادم فقط.
