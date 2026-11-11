RemoveBG — Cloudflare Pages (Root Layout / No npm)
=================================================

محتويات المشروع موجودة مباشرة في جذر المستودع:
- index.html
- styles.css
- app.js
- config.js
- images/
- functions/api/nanobanana.js
- _routes.json

لا توجد package.json أو package-lock.json أو node_modules أو build.mjs.
لا يحتاج هذا المشروع إلى npm install أو إلى أمر بناء.

إعدادات Cloudflare Pages مع Git integration:
1) Framework preset: None
2) Root directory: اتركه فارغًا
3) Build command: اتركه فارغًا (موصى به للموقع الثابت دون عملية بناء).
   إذا كانت لوحة Cloudflare لا تسمح بتركه فارغًا، استخدم: exit 0
4) Build output directory: .
5) Production branch: الفرع الذي تستخدمه للنشر (غالبًا main).

مهم:
- يجب أن يكون مجلد functions في جذر المستودع، بجوار index.html، وليس داخل مجلد آخر.
- يجب النشر عبر Cloudflare Pages Git integration حتى يتم تجميع Pages Functions.
- لا تستخدم Dashboard Drag-and-drop لنشر Functions؛ Cloudflare لا يدعم تجميع مجلد functions بهذه الطريقة.
- لا تضع الملفات داخل public أو dist. هذا الإصدار يستخدم الجذر نفسه كدليل الملفات المنشورة.
- _routes.json يجعل دوال Pages تعمل فقط مع المسارات /api/* بدلاً من تمرير كل ملفات الصور والواجهة عبر Function.

Nano Banana:
المسار: /api/nanobanana
يستخدم دالة Pages الموجودة في functions/api/nanobanana.js.
الدالة لا تستورد مكتبات npm؛ تعتمد على fetch وFormData وBlob وواجهات Web القياسية.

التحقق بعد النشر:
1) افتح https://YOUR-SUBDOMAIN/ وتحقق من ظهور واجهة الموقع.
2) افتح https://YOUR-SUBDOMAIN/api/nanobanana للتحقق من نشر المسار.
   هذه الخطوة تتحقق من وجود الدالة فقط ولا تنفذ تعديل صورة فعليًا.
3) جرّب رفع صورة غير حساسة ثم استخدم Nano Banana.

تنبيه خصوصية:
ترسل ميزة Nano Banana الصورة إلى Pixhost ثم إلى مزود Nano Banana الخارجي للمعالجة.
لا تستخدم صورًا شخصية أو خاصة لا ترغب في إرسالها إلى خدمات خارجية.
