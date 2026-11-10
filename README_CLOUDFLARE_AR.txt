RemoveBG Studio — حزمة Cloudflare Pages فقط

هذه الحزمة مخصصة لمشروع Cloudflare Pages المرتبط بمستودع GitHub، سواء كان المشروع منشورًا على pages.dev أو مربوطًا بنطاق فرعي خاص بك.
لا تحتاج إلى Vercel، ولا إلى مجلد api الخاص بـ Vercel.

1) شكل الملفات في جذر مستودع GitHub

index.html
styles.css
app.js
config.js
package.json
build.mjs
images/
functions/
  api/
    nanobanana.js

مهم: يجب أن يكون مجلد functions في جذر المستودع بجوار index.html، وليس داخل dist أو أي مجلد آخر. Cloudflare Pages ينشئ المسار /api/nanobanana من الملف functions/api/nanobanana.js.

2) إعدادات البناء في Cloudflare Pages

افتح Cloudflare Dashboard ثم Workers & Pages ثم مشروع Pages الحالي:

- Settings > Builds & deployments.
- Root directory: اتركه فارغًا إذا كان index.html في جذر المستودع.
- Build command: npm run build
- Build output directory: dist
- Production branch: نفس الفرع الذي تستخدمه حاليًا للنشر (غالبًا main).

أعد النشر عبر Git integration بعد رفع الملفات إلى GitHub. لا تستخدم الرفع المباشر من لوحة Pages لهذه الحزمة؛ وظائف Pages يجب أن تدخل عملية النشر من مستودع Git المتصل أو من Wrangler.

3) توافق Node.js للدالة

افتح Settings > Functions في مشروع Pages، واضبط Compatibility date على تاريخ حديث (2026-11-10 أو أحدث)، وأضف nodejs_compat إلى Compatibility flags في Production وPreview عند الحاجة.

Cloudflare يجعل توافق Node.js مفعّلًا افتراضيًا للمشروعات ذات compatibility date من 2026-08-04 فما بعد. أدرجت هذه الخطوة للتأكد من أن الحزم التي تعتمد على واجهات Node.js تعمل في الدالة.

لم أضع wrangler.toml في هذه النسخة عمدًا؛ حتى لا أفرض اسم مشروع أو إعدادات Wrangler قد تستبدل إعدادات مشروعك الحالي في لوحة Cloudflare. اترك إعدادات النطاق الفرعي وربط DNS كما هي.

4) النطاق الفرعي

لا تغيّر DNS ولا تضف نطاقًا مختلفًا إلى الكود. يطلب الموقع الدالة باستخدام المسار النسبي:

/api/nanobanana

لذلك سيصبح العنوان تلقائيًا على نفس النطاق الذي فتحت منه الموقع، مثل:

https://subdomain.example.com/api/nanobanana

استبدل المثال باسم نطاقك الفعلي عند الاختبار فقط. إذا كان النطاق الفرعي مربوطًا بالفعل بمشروع Pages، فسيعمل عليه الموقع والدالة معًا بعد نشر البناء.

5) اختبار نشر المسار

بعد نجاح النشر، افتح في المتصفح:

https://نطاقك-الفرعي/api/nanobanana

يجب أن تظهر استجابة JSON قريبة من:

{"success":true,"service":"Nano Banana","platform":"Cloudflare Pages"}

هذا الاختبار يتحقق من أن Function منشورة ومسارها صحيح. لا يشغّل تعديل صورة؛ التعديل الفعلي يُرسل POST من المحرر بعد تسجيل الدخول.

إذا ظهر 404، فغالبًا لم تُنشر Functions أو أن مجلد functions ليس في جذر المستودع أو أن إعداد Root directory غير صحيح.

6) ما الموجود في الدالة

- تتحقق من جلسة Supabase والهوية وملكية الصورة والحد اليومي.
- تقرأ صورة المستخدم من رابط التخزين الموقّع.
- تستخدم ImageUploadService من node-upload-images لرفع النسخة إلى pixhost.to.
- تستدعي https://api-faa.my.id/faa/nano-banana عبر Axios مع responseType=arraybuffer وtimeout=120000.
- تعيد الصورة الناتجة إلى المحرر.

7) ملاحظات مهمة

- يجب أن تبقى قيم Supabase الحالية في config.js كما هي؛ لا تضع مفاتيح سرية في المتصفح.
- لم يتم تغيير قاعدة البيانات أو الجداول أو bucket.
- رفع الصورة إلى Pixhost خدمة خارجية، والمقتطف المستخدم لا يوفّر حذفًا تلقائيًا للصورة المرفوعة. لا تستخدم صورًا خاصة أو حساسة.
- تم التحقق محليًا من بناء dist ومطابقة مراجع الصور وصياغة ملفات JavaScript. لم أتمكن من إجراء نشر فعلي على حساب Cloudflare أو تنفيذ تحويل حي على Nano Banana من هنا.
