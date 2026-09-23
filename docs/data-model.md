# نموذج البيانات

آخر تحديث: 24 سبتمبر 2026. المصدر الموثوق هو ملفات `apps/*/models.py` والترحيلات.

## accounts

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| User | email فريد، full_name، role (admin/operator/executor)، is_active | الدخول بالبريد. الأعضاء يُعطّلون ولا يُحذفون |

## catalog

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| Category | name فريد، slug، sort_order | لا يُحذف وفيه خدمات (PROTECT) |
| Service | category، name، slug فريد (عربي مسموح)، description، requirements، duration_text، price_type، price_amount (عشري)، price_currency، icon_key، color، status (draft/published/hidden)، is_featured، seo_title، seo_description، form_version | قيد: السعر مطلوب إن لم يكن «بعد المراجعة». تغيير الحقول يرفع form_version |
| ServiceField | service، key (ثابت)، label، help_text، type، required، options (JSON)، max_length، sort_order | key فريد داخل الخدمة ويبقى ثابتًا عند التعديل |
| ServiceSlugRedirect | old_slug فريد، service | يُنشأ تلقائيًا عند تغيير slug |

أنواع الحقول المدعومة الآن: نص قصير، نص طويل، رقم، تاريخ، اختيار واحد، اختيارات متعددة، عنوان. الملف والصورة تُضاف مع مرحلة المرفقات.

## orders

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| OrderStatus | key ثابت، label قابل للتعديل، meaning (8 معانٍ ثابتة)، sort_order، is_active، is_initial | حالة أولى واحدة فقط. لا تُحذف إن استُخدمت (PROTECT) |
| Order | code فريد `ARJ-XXXXXXXX`، service (PROTECT)، service_snapshot (JSON)، form_version، customer_name، customer_phone (+E.164)، answers (JSON)، details، status، assignee، idempotency_key فريد، public_updated_at | المفتاح الداخلي منفصل عن رقم المتابعة |
| OrderEvent | order، kind (created/status_changed/assigned/note_added)، actor، is_public، data | سجل إضافي فقط، لا يُعدَّل |
| OrderNote | order، author، visibility (public/internal)، body | الداخلية لا تظهر في أي استجابة عامة |

- رقم المتابعة: 8 رموز من أبجدية بلا أحرف ملتبسة (32^8 احتمال) بـ `secrets`، مع إعادة المحاولة عند التصادم.
- نسخة الخدمة: الاسم والمجال والسعر والمدة وتعريف الحقول وقت الإنشاء. الإجابات تحمل تسمية الحقل كما رآها العميل.

## inquiries

| الكيان | الحقول المهمة |
| --- | --- |
| Inquiry | name، phone، subject، body، status (new/in_progress/done)، assignee، internal_note، idempotency_key فريد |

## content

| الكيان | الحقول المهمة |
| --- | --- |
| SiteSettings (pk=1) | الاسم، العبارة، رقم WhatsApp ونصه وإظهاره، البريد، العنوان، نصوص المقدمة، نص «عن المنصة»، SEO الرئيسية |
| FAQItem | question، answer، sort_order، is_published |

## لم يُنفّذ بعد

عروض الأسعار وإصداراتها، سجل الدفع وإثباته، المرفقات الخاصة، الوسائط العامة، الصفحات والأقسام والتنقل، إشعارات البريد ومحاولاتها، سجل تدقيق عام للإدارة.
