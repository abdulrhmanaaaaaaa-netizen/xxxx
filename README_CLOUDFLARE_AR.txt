RemoveBG Studio — نسخة Cloudflare Pages بدون مكتبات npm

هذه النسخة لا تستخدم Axios أو node-upload-images أو أي اعتماديات npm خارجية.
دالة Nano Banana تستخدم واجهات Cloudflare Workers المدمجة فقط:
fetch وFormData وBlob وURL وUint8Array وTextDecoder.

1) بنية الملفات

index.html
styles.css
app.js
config.js
build.mjs
.nvmrc
.gitignore
images/
functions/
  api/
    nanobanana.js

لا يوجد package.json أو package-lock.json أو node_modules، ولا تحتاج إلى npm install.

2) إعدادات Cloudflare Pages

افتح Cloudflare Dashboard ثم Workers & Pages ثم مشروع Pages المتصل بـ GitHub:

- Root directory: اتركه فارغًا إذا كانت الملفات في جذر المستودع.
- Build command: node build.mjs
- Build output directory: dist
- Production branch: اختر فرع النشر الحالي لديك، مثل main.
- Node.js version في بيئة البناء: 22 (يقرأ من .nvmrc، ويمكن ضبط NODE_VERSION=22 في متغيرات البناء إذا احتجت).

لا تستخدم npm install ولا npm run build في هذه النسخة، لأن package.json غير موجود عمدًا.

3) دوال Cloudflare Pages

يجب أن يبقى مجلد functions في جذر المستودع بجوار index.html، ولا تنقله إلى dist.
الملف functions/api/nanobanana.js ينشئ المسار /api/nanobanana.

لا تحتاج الدالة إلى nodejs_compat؛ فهي لا تستورد مكتبات Node أو وحدات npm، وتستخدم Web APIs المدمجة في Cloudflare Workers.

يجب نشر المشروع عبر Git integration أو Wrangler حتى تُضمّن Pages Functions. لا يكفي رفع ملفات ثابتة باستخدام Direct Upload.

4) النطاق الفرعي

لا تغيّر DNS ولا إعداد النطاق الفرعي الحالي. يستخدم المحرر المسار النسبي:
/api/nanobanana

لذلك يعمل تلقائيًا على النطاق المرتبط بمشروع Pages.

5) طريقة عمل Nano Banana

- يتحقق المسار من جلسة Supabase وهوية المستخدم.
- يتحقق من ملكية رابط الصورة الموقّع والحد اليومي والحساب الموقوف.
- يحمّل الصورة من Supabase Storage.
- يرفع الصورة إلى Pixhost عبر واجهة API الرسمية باستخدام FormData المدمج.
- يحاول استخراج رابط الصورة المباشر من صفحة Pixhost، ويستخدم رابط الصورة المصغرة المباشر كخيار احتياطي إذا تعذّر استخراج الرابط الأصلي.
- يرسل الرابط والوصف إلى api-faa.my.id/faa/nano-banana باستخدام fetch.
- يعيد بايتات الصورة الناتجة إلى المحرر.

6) حدود Pixhost

واجهة Pixhost API الرسمية تقبل JPEG وPNG وGIF وWEBP وAVIF وبحد أقصى 10 ميجابايت للصورة.
رابط الصورة المصغرة الاحتياطي قد يكون بعرض أقصى 500 بكسل؛ إذا تعذر استخراج الصورة الأصلية من صفحة العرض، فقد تنخفض دقة الإدخال إلى النموذج. اختبر التحويل على صورة غير حساسة بعد النشر.

الرفع إلى Pixhost خدمة خارجية عامة. لا تستخدم صورًا خاصة أو حساسة، ولا تضع مفاتيح سرية في الواجهة.

7) الاختبار

بعد النشر افتح:
https://نطاقك-الفرعي/api/nanobanana

يجب أن تظهر استجابة شبيهة بـ:
{"success":true,"service":"Nano Banana","platform":"Cloudflare Pages","dependencies":"none"}

هذا يفحص نشر الدالة فقط. لا يختبر معالجة صورة فعلية؛ جرّب التحرير من داخل حسابك بعد التأكد من ظهور الاستجابة.
