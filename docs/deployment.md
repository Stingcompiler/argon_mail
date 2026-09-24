# دليل النشر على Render

آخر تحديث: 24 سبتمبر 2026. لم يُنفَّذ نشر فعلي بعد؛ هذا الدليل مبني على `render.yaml` والسكربتات المختبرة محليًا وفي CI.

## ما يُنشأ

| المورد | من `render.yaml` |
| --- | --- |
| خدمة ويب واحدة `arjoon-mail` | Next.js على `$PORT` + Gunicorn على 127.0.0.1:8000 + عامل البريد |
| قرص دائم 10 GB | مركّب على `/var/data` (المرفقات الخاصة تحت `/var/data/private`) |
| PostgreSQL 16 `arjoon-db` | يُربط تلقائيًا بـ `DATABASE_URL` |

قيود القرص الدائم على Render: مثيل واحد فقط، ولا نشر بلا توقف (يتوقف القديم قبل بدء الجديد)، والقرص غير متاح أثناء البناء أو `preDeployCommand`. خطّط لنوافذ نشر قصيرة.

## قبل النشر الأول

1. اختر الخطة والمنطقة. Node + Gunicorn + العامل يحتاجون ذاكرة؛ ابدأ بخطة 2 GB وقِس الاستهلاك بعد النشر، ثم خفّض إن أمكن. المنطقة الأقرب لمستخدمي السودان غالبًا Frankfurt.
2. جهّز النطاق وسجلات DNS.
3. جهّز مزود بريد SMTP (مثل Gmail بكلمة مرور تطبيق، أو مزود معاملات) لقيمة `EMAIL_URL`.
4. تأكد أن CI على `main` أخضر.

## الخطوات

1. في Render: **New → Blueprint** واختر المستودع؛ يقرأ `render.yaml`.
2. اضبط المتغيرات ذات `sync: false`:

   | المتغير | القيمة |
   | --- | --- |
   | `SITE_URL` | `https://النطاق` (يجب أن يبدأ بـ https) |
   | `TRUSTED_ORIGINS` | نفس `SITE_URL` |
   | `EMAIL_URL` | `smtp+tls://USER:PASSWORD@smtp.example.com:587` |
   | `DEFAULT_FROM_EMAIL` | `بريد عرجون <no-reply@النطاق>` |
   | `SENTRY_DSN` | اختياري |

   `DJANGO_SECRET_KEY` و`JWT_SIGNING_KEY` و`INTERNAL_SECRET` تُولَّد تلقائيًا. `DEFAULT_ALERT_EMAILS=preedargon@gmail.com` مضبوط مسبقًا.
3. انشر. التسلسل: `build.sh` (يتحقق من Node 22، يبني Next وcollectstatic) ← `preDeployCommand` (migrate وcreatecachetable) ← `start.sh`.
4. الإنتاج يرفض البدء إذا كانت القيم ناقصة أو ضعيفة، وتظهر الرسالة في السجل: `Production configuration error: ...` أو `start.sh: missing required env var ...`.

## بعد النشر الأول

1. **الصحة:** `https://النطاق/api/v1/health/` يجب أن يعيد `{"status":"ok","database":"ok","worker":"ok","storage":"ok"}`. قيمة `worker` تكون `unknown` لأول 15 ثانية. `storage: not_mounted` يعني أن القرص غير مركّب.
2. **حساب المدير الأول** من Render Shell (كلمة المرور تُطلب تفاعليًا ولا تُكتب في السجل):

   ```bash
   python manage.py create_staff preedargon@gmail.com "مدير المنصة" --role admin
   ```

3. **البريد:**

   ```bash
   python manage.py send_test_email preedargon@gmail.com
   ```

   ثم اضبط المستلمين من «المحتوى والإعدادات» في لوحة التحكم.
4. **التحقق من `NUM_PROXIES`:** بعد الدخول إلى لوحة التحكم افتح `https://النطاق/api/v1/admin/diagnostics/` في المتصفح نفسه (يحتاج جلسة مدير عبر الواجهة؛ الأسهل من أدوات المطوّر: `fetch('/api/v1/admin/diagnostics/', {headers:{Authorization:'Bearer ...'}})`، أو طلب من عميل API). المطلوب:
   - `client_ip` = عنوانك العام الحقيقي (قارنه بموقع مثل whatismyip).
   - `is_secure: true` و`x_forwarded_proto: https`.
   - أرسل الطلب نفسه بترويسة `X-Forwarded-For: 1.2.3.4` مزيفة: يجب أن يبقى `client_ip` عنوانك الحقيقي.
   إن اختلف، عدّل `NUM_PROXIES` في Render وأعد النشر، وسجّل النتيجة في `docs/decisions.md`.
5. **الموقع:** افتح الرئيسية وصفحة خدمة، وقدّم طلبًا تجريبيًا بملف، وتابعه برقم المتابعة، وتأكد من وصول تنبيه البريد.
6. **النسخ الاحتياطي:** نفّذ أول نسخة واستعادة تجريبية حسب `docs/backup-restore.md`.
7. **Search Console:** سجّل النطاق وأرسل `https://النطاق/sitemap.xml`.

## التحديث والتراجع

- كل دمج في `main` يطلق نشرًا تلقائيًا (Render auto-deploy). راقب CI قبل الدمج.
- الترحيلات تعمل قبل تحويل الحركة؛ فشل البناء لا يغيّر القاعدة. لكن النسخة القديمة لا تعمل أثناء النشر (قيد القرص).
- **التراجع:** من Render → Deploys → Rollback إلى نشر سابق. إذا كان النشر الجديد يحتوي ترحيلًا غير متوافق مع الكود القديم، خذ نسخة احتياطية قبل النشر واستعِدها عند التراجع. اكتب الترحيلات متوافقة للخلف (أضف قبل أن تحذف).
- خذ نسخة احتياطية يدوية قبل أي نشر يحتوي ترحيلات.

## المراقبة

- **Sentry** (اختياري): أخطاء Django وفشل التنبيه النهائي (مستوى ERROR) تُرسل عند ضبط `SENTRY_DSN`. لا تُرسل بيانات شخصية (`send_default_pii=False`). الواجهة غير مربوطة بـ Sentry بعد.
- **Render**: فعّل تنبيهات فشل النشر وفحص الصحة في إعدادات الخدمة.
- **لوحة التحكم**: الجرس يعرض التنبيهات الفاشلة، والشريط الجانبي يعرض استهلاك التخزين ويحذّر عند 85%.
