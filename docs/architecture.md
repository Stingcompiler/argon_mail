# البنية المعمارية

آخر تحديث: 24 سبتمبر 2026.

## الصورة العامة

النظام أحادي (monolith): مستودع واحد، مشروع Django واحد، خدمة Render واحدة. داخل الخدمة ثلاث عمليات يشغّلها `start.sh`: خادم Next، وGunicorn، وعامل تنبيهات البريد (`manage.py send_notifications --loop`). توقف أي منها يُسقط الخدمة فيعيد Render تشغيلها:

```
المتصفح ──HTTPS──▶ Render LB ──▶ Next.js (المنفذ $PORT، العام الوحيد)
                                   │  صفحات عامة: Server Components + Data Cache بالوسوم
                                   │  لوحة التحكم والمتابعة: مكوّنات عميل + TanStack Query
                                   │
                                   ├── rewrites: /api/*, /media/*, /django-admin/*, /django-static/*
                                   ▼
                            Gunicorn + Django/DRF (127.0.0.1:8000، داخلي فقط)
                                   │
                                   ├── PostgreSQL
                                   └── القرص الدائم DATA_ROOT (public/ و private/)
```

- المتصفح لا يرى Django مباشرة. كل شيء من أصل واحد، فلا CORS.
- Django يستمع على 127.0.0.1 فقط؛ ترويسة Host التي تصله هي `127.0.0.1:<port>`.
- Next.js لا يصل إلى قاعدة البيانات أبدًا، ولا يحتوي منطق أعمال.

## هيكل المستودع

| المسار | الدور |
| --- | --- |
| `config/` | إعدادات Django (`base`, `dev`, `prod`, `test`) والمسارات |
| `apps/core` | فحص الصحة، الأخطاء الموحدة، تقييد المعدل، الهاتف، idempotency، وسيط الشرطة المائلة |
| `apps/accounts` | المستخدم والأدوار ونقاط JWT وأمر `create_staff` |
| `apps/catalog` | المجالات والخدمات وحقول النماذج وتحويلات slug وأمر `seed_demo` |
| `apps/orders` | الطلبات والحالات والأحداث والملاحظات ومنطق الأعمال في `services.py` |
| `apps/inquiries` | رسائل نموذج التواصل |
| `apps/content` | إعدادات الموقع والأسئلة الشائعة |
| `apps/revalidation` | إبطال كاش Next بعد تعديل المحتوى العام |
| `frontend/` | تطبيق Next.js (App Router) |
| `frontend/src/lib/api/client.ts` | عميل API الموحد في المتصفح |
| `frontend/src/lib/server-api.ts` | جلب الخادم للصفحات العامة مع الوسوم |
| `frontend/src/contexts/` | `AuthProvider` و`UiProvider` و`Providers` |
| `frontend/src/hooks/` | hooks فوق TanStack Query |
| `frontend/src/legacy/` | المعاينة الأصلية كمرجع تصميم (`/design-preview` عند `ENABLE_DESIGN_PREVIEW=1`) |
| `build.sh`, `start.sh`, `render.yaml` | البناء والتشغيل على Render |
| `scripts/dev.sh`, `scripts/local-prod.sh` | التشغيل المحلي |

## الصفحات العامة وSEO

- الرئيسية والخدمات وتفاصيل الخدمة والصفحات الثابتة تُرندر على الخادم. المحتوى كامل في HTML الأولي.
- التخطيط العام يستدعي `connection()`، فلا تُرندر أي صفحة عامة وقت البناء (Django لا يعمل أثناء البناء على Render).
- البيانات تأتي من Data Cache في Next بمهلة 60 ثانية ووسوم: `services` و`service:<slug>` و`site`.
- عند حفظ خدمة أو مجال أو إعدادات أو سؤال، تجمع إشارات Django الوسوم وترسلها مرة واحدة بعد نجاح المعاملة إلى `/internal/revalidate` مع `X-Internal-Secret`. فشل الإرسال يُسجَّل ولا يُفشل الحفظ.
- `generateMetadata` تنتج العنوان والوصف وcanonical وOG. JSON-LD: `Organization` في التخطيط، `Service` و`BreadcrumbList` في صفحة الخدمة، `FAQPage` في الرئيسية.
- خدمة غير منشورة أو غير موجودة: 404 حقيقي. slug قديم: تحويل دائم 308 إلى الجديد.
- `sitemap.xml` من الخدمات المنشورة فقط، و`robots.txt` يمنع الإدارة والمتابعة والنجاح وAPI.
- الإدارة والمتابعة والنجاح: `noindex` في metadata وفي ترويسة `X-Robots-Tag`.
- الخط العربي مستضاف محليًا عبر `next/font/local` من حزمة fontsource.

## المصادقة (JWT)

```
دخول:   POST /api/v1/auth/login   ─▶ {access, user} + Set-Cookie arjoon_refresh (HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth/)
طلب:    Authorization: Bearer <access>  (access في ذاكرة الوحدة فقط)
401:    العميل يستدعي refresh مرة واحدة (مقفلة عبر Web Locks بين التبويبات) ثم يعيد الطلب
تجديد:  POST /api/v1/auth/refresh  ─▶ access جديد + refresh جديد، والقديم في قائمة الإبطال
خروج:   POST /api/v1/auth/logout   ─▶ إبطال refresh ومسح الـ cookie وإفراغ كاش ['admin'] وإبلاغ التبويبات
```

- نقاط المصادقة الثلاث ترفض أي طلب لا يحمل Origin أو Referer من `TRUSTED_ORIGINS`.
- الدور وحالة التفعيل تُقرأ من قاعدة البيانات في كل طلب. تغيير كلمة المرور يُبطل كل الرموز (`CHECK_REVOKE_TOKEN`).
- الموقع العام لا يستدعي نقاط المصادقة. محاولة استعادة الجلسة تبدأ فقط من صفحات `/admin`.
- عند انتهاء الجلسة أثناء العمل تبقى الشاشة مفتوحة وتظهر نافذة دخول فوقها، فلا تضيع المسودات.

## حالة الواجهة

| النوع | المكان |
| --- | --- |
| بيانات الخادم في الإدارة والمتابعة | TanStack Query، مفاتيح في `src/lib/query-keys.ts` |
| بيانات الصفحات العامة | Server Components + Data Cache |
| المستخدم والرمز | `AuthProvider` |
| التنبيهات المؤقتة | `UiProvider` |
| مسودات النماذج | حالة محلية في المكوّن |

## حدود الطلبات

- Next يمرّر أجسامًا حتى 22 MB (`experimental.middlewareClientMaxBodySize`).
- Django يرفض قبل القراءة: JSON فوق 1 MB، وmultipart فوق `UPLOAD_MAX_REQUEST_MB` (20) + 1 MB.
- الخادم يفرض أيضًا مجموع أحجام الملفات لكل طلب، والواجهة تتحقق منه مسبقًا.
- Gunicorn بخيوط ومهلة 120 ثانية لتحمل الرفع والتنزيل البطيء.

## تنبيهات البريد

```
حفظ الطلب/الرسالة ──(المعاملة نفسها)──▶ Notification(pending)
عامل البريد كل 15 ثانية: SELECT ... FOR UPDATE SKIP LOCKED + lease 10 دقائق
  نجاح ─▶ sent
  فشل  ─▶ pending بعد 1، 5، 15 دقيقة، ساعة، 3 ساعات ─▶ failed بعد 6 محاولات
لوحة التحكم ─▶ إعادة إرسال يدوية تُسجَّل باسم المستخدم
```

- البريد يُضبط بـ `EMAIL_URL`. دونه يُطبع البريد في السجل ولا يُرسل.
- تنبيه الطلب يحمل رقم الطلب والخدمة وعدد المرفقات ورابط لوحة التحكم فقط.
- تنبيه رسالة التواصل يحمل الرسالة كاملة (الاسم، الهاتف، الموضوع، النص) وزر رد عبر WhatsApp، بقرار من المالك.
- البريد HTML منسق بالعربية (RTL، ألوان الهوية) مع نسخة نصية بديلة. القوالب في `apps/notifications/templates/notifications/`.
- لا يُنشأ تنبيه مكرر للطلب نفسه (`dedupe_key` فريد، وidempotency الطلب).

## عناوين العملاء وتقييد المعدل

- Next يمرّر `X-Forwarded-For` كما وصله دون إضافة. موزّع Render يضيف عنوان العميل في آخر القائمة، لذلك `NUM_PROXIES=1`. يجب التحقق من ذلك بعد أول نشر.
- في التطوير المحلي لا يوجد موزّع، فالعنوان قابل للتزوير. هذا مقبول محليًا فقط.
- طلبات الخادم من Next إلى Django تحمل `X-Internal-Secret` وتُعفى من التقييد لأنها تخدم زوارًا كثيرين من عنوان واحد.

## التشغيل المحلي

```bash
cp .env.example .env   # ثم ضع أسرارًا محلية
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
(cd frontend && npm install)
createdb arjoon
scripts/dev.sh
```
