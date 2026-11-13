RemoveBG — نشر النسخة مع خدمات Kyzzz

هذه النسخة تحتاج إلى Cloudflare Pages Advanced Mode لأن مفتاح Kyzzz يجب أن يبقى داخل كود الخادم، وليس في المتصفح.

1) ارفع الملفات كلها إلى مستودع GitHub، مع إبقاء المستودع خاصًا.
2) من Cloudflare افتح Workers & Pages ثم Create application ثم Pages ثم Connect to Git.
3) اختر المستودع الذي يحتوي index.html و styles.css و app.js و config.js و _worker.js في الجذر.
4) اجعل Build command فارغًا، وBuild output directory هو . (مجلد الجذر)، ثم احفظ وأنشئ النشر.
5) يجب أن يكون ملف _worker.js في مجلد الإخراج نفسه بجانب index.html. لا تضعه في مجلد فرعي.
6) لا تنشر هذا المشروع على GitHub Pages وحده؛ GitHub Pages لا ينفذ _worker.js أو واجهة /api/image-process.

اختبار جاهزية الخادم:
افتح https://YOUR-PROJECT.pages.dev/api/image-process
يجب أن تحصل على JSON فيه keyConfigured: true و status: ready. هذا يثبت وجود المفتاح فقط، وليس نجاح اتصال المزود.

اختبار العمليات:
بعد تسجيل الدخول، اختر صورة JPG أو PNG، ثم نفّذ استايلًا. سيرسل الموقع الصورة في multipart field باسم media، واسم مسار التحويل مطابقًا لمسارات Kyzzz، ويضيف prompt فقط لعملية edit-image.

المفتاح موجود خادميًا في _worker.js. لا تضعه في config.js أو app.js أو index.html. اجعل مستودع المصدر خاصًا لأن مالك المستودع يستطيع قراءة ملفات الخادم.
