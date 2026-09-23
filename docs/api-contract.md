# عقد API

آخر تحديث: 24 سبتمبر 2026. كل المسارات تحت `/api/v1/` على الأصل نفسه. مخطط OpenAPI متاح في التطوير على `/api/v1/schema/`.

## قواعد عامة

- JSON فقط. التواريخ ISO 8601 بالمنطقة الزمنية.
- شكل الخطأ الموحد:
  ```json
  {"detail": "رسالة للمستخدم", "code": "invalid", "errors": {"field": ["رسالة"]}}
  ```
- الأكواد: 400 تحقق، 401 رمز مفقود أو منتهٍ (`session_expired` عند التجديد)، 403 صلاحية أو مصدر غير موثوق، 404، 409 تعارض (خدمة غير متاحة أو حذف محمي)، 429 تجاوز المعدل.
- الترقيم في القوائم الإدارية: `?page=` و`?page_size=` (حد 100)، والاستجابة `{count, next, previous, results}`.
- نقاط الإنشاء العامة تتطلب ترويسة `Idempotency-Key` بقيمة UUID. تكرار المفتاح يعيد السجل الأصلي بكود 200.

## المصادقة

| الطريقة والمسار | الوصف | ملاحظات |
| --- | --- | --- |
| POST `auth/login/` | `{email, password}` → `{access, user}` + cookie | يتطلب Origin موثوقًا، throttle `auth` |
| POST `auth/refresh/` | cookie → `{access, user}` + cookie جديد | يبطل القديم |
| POST `auth/logout/` | يبطل refresh ويمسح cookie | 204 |
| GET `auth/me/` | المستخدم الحالي | Bearer |

## العامة (بلا مصادقة)

| الطريقة والمسار | الوصف | throttle |
| --- | --- | --- |
| GET `health/` | حالة الخدمة وقاعدة البيانات | — |
| GET `public/site/` | `{settings, faq}` | public_read |
| GET `public/categories/` | المجالات التي فيها خدمات منشورة | public_read |
| GET `public/services/` | الخدمات المنشورة. تصفية: `category__slug`, `is_featured` | public_read |
| GET `public/services/<slug>/` | تفاصيل خدمة منشورة مع الحقول | public_read |
| GET `public/service-redirects/<slug>/` | `{slug}` الجديد لرابط قديم | — |
| POST `public/orders/` | إنشاء طلب → `{code, service_name, created_at}` | order_create |
| GET `public/track/<code>/` | `{code, service_name, status, created_at, updated_at, timeline}` فقط | tracking |
| POST `public/inquiries/` | إنشاء رسالة → `{id}` | inquiry_create |

جسم إنشاء الطلب (JSON). عند وجود ملفات يُرسل الطلب `multipart/form-data`: الجسم نفسه كنص JSON في الحقل `payload`، وكل ملف في `file.<field_key>` (يتكرر للملفات المتعددة). طلب multipart أكبر من (عدد الملفات المسموح × حجم الملف + 1 MB) يُرفض بـ 413 قبل قراءته. تكرار `Idempotency-Key` لطلب مكتمل يعيد الطلب الأصلي دون قراءة الملفات.

```json
{"service": "slug", "customer_name": "...", "customer_phone": "+249...", "answers": {"field_key": "قيمة أو [قيم]"}, "details": "", "consent": true}
```

أخطاء الحقول تعود في جولة واحدة: `errors.customer_phone` و`errors.answers.<key>`، و`errors.answers.files` لتجاوز عدد الملفات، و`errors.files` لامتلاء التخزين.

الملفات: PDF وPNG وJPG وWebP فقط، ويُتحقق من التوقيع الثنائي وتطابق الامتداد. حقل «صورة» يقبل الصور فقط.

## الإدارة (Bearer)

| المورد | الطرق | الأدوار |
| --- | --- | --- |
| `admin/orders/` | GET قائمة. تصفية: `q` (رقم/اسم/هاتف)، `status`، `service`، `assignee` (id أو `me` أو `none`)، `created_after`، `created_before` | الكل؛ المنفذ يرى المسند إليه فقط |
| `admin/orders/summary/` | GET `{total, by_meaning}` | الكل |
| `admin/orders/<id>/` | GET تفاصيل كاملة مع الملاحظات والأحداث ورابط WhatsApp | الكل ضمن النطاق |
| `admin/orders/<id>/status/` | POST `{status: key, public_note?}` | الكل ضمن النطاق |
| `admin/orders/<id>/assign/` | POST `{assignee: id\|null}` | مدير، مشغّل |
| `admin/orders/<id>/notes/` | POST `{body, visibility}` | الكل ضمن النطاق |
| `admin/orders/<id>/attachments/` | POST multipart `file`، `kind` (order_document أو payment_proof)، `payment` اختياري. إثبات الدفع لا يغيّر حالة الدفع | الكل ضمن النطاق للمستندات؛ الإثبات للمدير والمشغّل |
| `admin/orders/<id>/attachments/<uuid>/link/` | POST → `{url, expires_in}` رابط موقّع لخمس دقائق | الكل ضمن النطاق |
| `admin/orders/<id>/quotes/` | POST `{amount, currency, note}` يستبدل العرض المعلّق | مدير، مشغّل |
| `admin/orders/<id>/quotes/<qid>/decision/` | POST `{decision: accepted\|rejected, note}` مرة واحدة | مدير، مشغّل |
| `admin/orders/<id>/payment-status/` | POST `{payment_status, note}` | مدير، مشغّل |
| `admin/orders/<id>/payments/` | POST `{amount, currency, method, reference, note}` | مدير، مشغّل |
| `admin/storage/` | GET `{used, quota, percent, disk_free, warning}` | مدير، مشغّل |
| `files/download/?t=<token>` | GET تنزيل بالرابط الموقّع. يعيد التحقق من صلاحية المستخدم الحالية. `Content-Disposition: attachment` و`Cache-Control: private, no-store` و`CSP: sandbox` | بلا Bearer |
| `admin/statuses/` | GET للجميع؛ POST/PATCH/DELETE للمدير. الحذف 409 إن استُخدمت | — |
| `admin/services/` | CRUD. `fields` قائمة تستبدل الحقول مع الحفاظ على `key` | مدير، مشغّل |
| `admin/categories/` | CRUD. الحذف 409 إن احتوى خدمات | مدير، مشغّل |
| `admin/inquiries/` | GET، PATCH `{status, internal_note, assignee_id}`. بحث `q`، تصفية `status` | مدير، مشغّل |
| `admin/settings/` | GET مدير ومشغّل؛ PATCH مدير | — |
| `admin/faq/` | CRUD | مدير، مشغّل |
| `admin/staff/` | GET أعضاء مفعّلون (للإسناد) | الكل |
| `admin/team/` | GET، POST، PATCH. لا حذف | مدير |

## داخلي (Next.js)

| المسار | الوصف |
| --- | --- |
| POST `/internal/revalidate` | `{tags: [...]}` مع `X-Internal-Secret`. يستدعيه Django فقط |
