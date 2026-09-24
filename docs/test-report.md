# تقرير الاختبار

آخر تحديث: 24 سبتمبر 2026.

## الاختبارات الآلية

| المجموعة | العدد | يعمل في |
| --- | --- | --- |
| اختبارات Django (API، صلاحيات، ملفات، بريد، إعدادات إنتاج، صحة) | 105 | CI `backend` + محليًا |
| فحص TypeScript والبناء | — | CI `frontend` |
| إشراف `start.sh` (إيقاف لطيف، انهيار عملية، متغيرات ناقصة) | 3 سيناريوهات | CI `scripts` (bash 5) |
| اختبار دخان من طرف إلى طرف | 16 فحصًا | CI `e2e` + محليًا |
| Lighthouse على الجوال | 3 صفحات | CI `e2e` |

تشغيل محلي:

```bash
.venv/bin/python manage.py test --settings=config.settings.test
BASE=http://127.0.0.1:3108 scripts/smoke.sh
```

## مصفوفة القبول (الخطة، القسم 8)

| الحالة | التحقق |
| --- | --- |
| إنشاء مجال وخدمة جديدة | `catalog/tests` + smoke (الخدمة تظهر في HTML) |
| نموذج غير صحيح | `orders/tests` (جولة أخطاء واحدة، لا طلب ناقص) |
| النقر المتكرر | `orders/tests`، `media_library/tests` |
| تعديل الخدمة بعد الطلب | `orders/tests` |
| إخفاء خدمة | `orders/tests` |
| متابعة رقم صحيح | `orders/tests` + smoke (لا يظهر اسم العميل) |
| رقم غير صحيح أو محاولات كثيفة | `orders/tests` (404 و429) |
| منفذ يفتح طلبًا غير مسند | `orders/tests` |
| تنزيل مرفق دون صلاحية | `media_library/tests` |
| ملاحظة داخلية | `orders/tests` |
| إثبات دفع | `media_library/tests` |
| فشل البريد | `notifications/tests` |
| إعادة تشغيل الخدمة | `test-start.sh` + `notifications/tests` (استعادة lease) + تجربة الاستعادة |
| تجاوز حدود الملف أو القرص | `media_library/tests`، `core/tests/test_batch1.py` + smoke (12 MB عبر التمرير) |
| استعادة النسخ | تجربة يدوية موثقة في `docs/backup-restore.md` |
| مسودة أو صفحة خاصة | `catalog/tests` + smoke (robots) |
| عرض هاتف | يدوي: 375px بلا تمرير أفقي (24 سبتمبر) |
| انتهاء access أثناء التحرير | يدوي عبر الكود؛ **لا اختبار آلي للواجهة بعد** |
| refresh مبطل | `accounts/tests` |
| الرموز في المتصفح | `accounts/tests` (HttpOnly)؛ التخزين في المتصفح بمراجعة الكود |
| HTML الأولي لصفحة خدمة | smoke |
| slug غير موجود أو مشوّه | smoke (404، لا 500) |
| نشر خدمة من الإدارة | `revalidation/tests` + تحقق يدوي عبر التمرير |
| الوصول الخارجي لمنفذ Django | بنيوي: Gunicorn على 127.0.0.1 |
| تحديث القائمة بعد تغيير الحالة | **لا اختبار آلي للواجهة بعد** |

## الأداء وLighthouse

قياس يدوي محلي (عرض 375px، دون تقييد شبكة): LCP 212ms، CLS 0.

نتائج Lighthouse على الجوال تُنتَج في كل تشغيل لـ CI (مهمة `e2e`، ملخص التشغيل وأداة `e2e-reports`). أول نتيجة مسجلة:

LIGHTHOUSE_RESULTS

## ما لم يُختبر

- أي شيء على Render نفسه (لم يحدث نشر).
- شاشات لوحة التحكم في المتصفح (تحتاج دخول المالك)، ولا توجد اختبارات Playwright بعد (الدفعة 3).
- إرسال بريد فعلي عبر SMTP (ينتظر `EMAIL_URL`).
