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

أنواع الحقول المدعومة: نص قصير، نص طويل، رقم، تاريخ، اختيار واحد، اختيارات متعددة، عنوان، ملف (PDF أو صورة)، صورة. لحقلي الملف والصورة `max_files` بين 1 و10.

## orders

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| OrderStatus | key ثابت، label قابل للتعديل، meaning (8 معانٍ ثابتة)، sort_order، is_active، is_initial | حالة أولى واحدة فقط. لا تُحذف إن استُخدمت (PROTECT) |
| Order | code فريد `ARJ-XXXXXXXX`، service (PROTECT)، service_snapshot (JSON)، form_version، customer_name، customer_phone (+E.164)، answers (JSON)، details، status، assignee، payment_status، idempotency_key فريد، public_updated_at | المفتاح الداخلي منفصل عن رقم المتابعة. حالة الدفع مستقلة عن حالة التنفيذ |
| Quote | order، version (فريد مع الطلب)، amount عشري، currency (SDG/USD/SAR)، note، status (pending/accepted/rejected/superseded)، created_by، decided_by، decided_at، decision_note | العرض الجديد يستبدل المعلّق. القرار يُسجَّل مرة واحدة مع طريقة الموافقة الخارجية |
| PaymentEntry | order، amount، currency، method، reference، note، recorded_by | تسجيل الدفعة لا يغيّر حالة الدفع؛ التغيير إجراء منفصل |
| OrderEvent | order، kind (created، status_changed، assigned، note_added، attachment_added، quote_created، quote_decided، payment_status، payment_recorded)، actor، is_public، data | سجل إضافي فقط، لا يُعدَّل |
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
| SiteSettings (pk=1) | الاسم، العبارة، رقم WhatsApp ونصه وإظهاره، البريد، العنوان، نصوص المقدمة، نص «عن المنصة»، SEO الرئيسية، max_file_mb، max_files_per_order، notify_emails، notify_orders، notify_messages (الثلاثة الأخيرة لا تظهر في API العام) |
| FAQItem | question، answer، sort_order، is_published |

## media_library

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| PrivateFile | id (UUID)، order (PROTECT)، kind (order_field/order_document/payment_proof)، field_key، field_label، payment، original_name، content_type، size، sha256، path فريد، uploaded_by | يُخزَّن تحت PRIVATE_ROOT باسم عشوائي وصلاحية 0600، ولا يُقدَّم برابط عام |

## notifications

| الكيان | الحقول المهمة | القواعد |
| --- | --- | --- |
| Notification | kind (new_order/new_inquiry)، dedupe_key فريد، order أو inquiry، recipients، subject، body، status (pending/sending/sent/failed/skipped)، attempts، next_attempt_at، locked_until، last_error، sent_at | يُنشأ في معاملة حفظ الطلب أو الرسالة، مع `html_body`. تنبيه الطلب لا يحمل بيانات العميل؛ تنبيه الرسالة يحمل نصها كاملًا بقرار المالك |
| DeliveryAttempt | notification، started_at، finished_at، success، error، triggered_by | سجل دائم لكل محاولة، آلية أو يدوية |

## لم يُنفّذ بعد

الوسائط العامة، الصفحات والأقسام والتنقل، سياسة الاحتفاظ وحذف المرفقات، سجل تدقيق عام للإدارة.
