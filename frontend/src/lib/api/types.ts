// Mirrors the DRF serializers in apps/*/serializers.py. See docs/api-contract.md.

export type Role = 'admin' | 'operator' | 'executor';
export type User = { id: number; email: string; username: string | null; full_name: string; role: Role; is_active: boolean; last_login: string | null };
export type UserBrief = { id: number; full_name: string; role: Role };

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'address' | 'file' | 'image';
export type ServiceField = { key: string; label: string; help_text: string; type: FieldType; required: boolean; options: string[]; max_length: number; max_files: number };
export type CategoryBrief = { name: string; slug: string };
export type Category = { id: number; name: string; slug: string; sort_order: number; services_count?: number };

export type PublicService = {
  slug: string; name: string; category: CategoryBrief; description: string; tagline: string;
  icon_key: string; color: string; price_label: string; duration_text: string; is_featured: boolean; updated_at: string;
};
export type PublicServiceDetail = PublicService & {
  requirements: string; price_type: PriceType; price_amount: string | null; price_currency: string;
  seo_title: string; seo_description: string; form_version: number; fields: ServiceField[];
};

export type PriceType = 'after_review' | 'fixed' | 'starting_from';
export type ServiceStatus = 'draft' | 'published' | 'hidden';
export type AdminService = {
  id: number; category: number; category_name: string; name: string; slug: string; description: string; tagline: string;
  requirements: string; duration_text: string; price_type: PriceType; price_amount: string | null; price_currency: string;
  price_label: string; icon_key: string; color: string; status: ServiceStatus; is_featured: boolean; sort_order: number;
  seo_title: string; seo_description: string; form_version: number; fields: ServiceField[]; orders_count: number;
  created_at: string; updated_at: string;
};
export type AdminServiceInput = Omit<AdminService, 'id' | 'category_name' | 'price_label' | 'form_version' | 'orders_count' | 'created_at' | 'updated_at'> & { id?: number };

export type StatusMeaning = 'new' | 'in_review' | 'waiting_customer' | 'in_progress' | 'ready' | 'completed' | 'cancelled' | 'failed';
export type StatusBrief = { key: string; label: string; meaning: StatusMeaning };
export type OrderStatus = StatusBrief & { id: number; sort_order: number; is_active: boolean; is_initial: boolean; orders_count: number };

export type TrackingItem = { kind: 'created' | 'status' | 'note'; title: string; text: string; at: string; meaning?: StatusMeaning };
export type TrackingSummary = { code: string; service_name: string; status: StatusBrief; created_at: string; updated_at: string };
export type Tracking = { code: string; service_name: string; status: StatusBrief; created_at: string; updated_at: string; timeline: TrackingItem[] };

export type Answer = { key: string; label: string; type: FieldType; value: string | string[] };
export type OrderListItem = {
  id: number; code: string; customer_name: string; customer_phone: string; service_name: string;
  status: StatusBrief; assignee: UserBrief | null; payment_status: PaymentStatus; created_at: string; updated_at: string;
};
export type OrderNote = { id: number; visibility: 'public' | 'internal'; body: string; author: UserBrief; created_at: string };
export type OrderEventKind = 'created' | 'status_changed' | 'assigned' | 'note_added' | 'attachment_added' | 'quote_created' | 'quote_decided' | 'payment_status' | 'payment_recorded';
export type OrderEvent = { id: number; kind: OrderEventKind; is_public: boolean; data: Record<string, unknown>; actor: UserBrief | null; created_at: string };
export type PaymentStatus = 'not_required' | 'awaiting' | 'verifying' | 'paid' | 'refunded';
export type Currency = 'SDG' | 'USD' | 'SAR';
export type Attachment = {
  id: string; kind: 'order_field' | 'order_document' | 'payment_proof'; field_key: string; field_label: string; payment: number | null;
  original_name: string; content_type: string; size: number; uploaded_by: UserBrief | null; created_at: string;
};
export type Quote = {
  id: number; version: number; amount: string; currency: Currency; note: string; status: 'pending' | 'accepted' | 'rejected' | 'superseded';
  created_by: UserBrief; created_at: string; decided_by: UserBrief | null; decided_at: string | null; decision_note: string;
};
export type Payment = {
  id: number; amount: string; currency: Currency; method: 'cash' | 'bank_transfer' | 'mobile_money' | 'other'; method_label: string;
  reference: string; note: string; recorded_by: UserBrief; created_at: string;
};
export type OrderDetail = OrderListItem & {
  answers: Answer[]; details: string; service_snapshot: { name: string; category: string; price_label: string; slug: string };
  form_version: number; public_updated_at: string; notes: OrderNote[]; events: OrderEvent[]; whatsapp_url: string;
  attachments: Attachment[]; quotes: Quote[]; payments: Payment[]; payment_status_label: string;
};
export type StorageStatus = { used: number; quota: number; percent: number; disk_free: number; warning: boolean };
export type OrderFilters = { q?: string; status?: string; service?: string; assignee?: string; created_after?: string; created_before?: string; page?: number };

export type InquiryStatus = 'new' | 'in_progress' | 'done';
export type Inquiry = {
  id: number; name: string; phone: string; subject: string; body: string; status: InquiryStatus;
  assignee: UserBrief | null; internal_note: string; whatsapp_url: string; created_at: string; updated_at: string;
};

export type SiteSettings = {
  name: string; tagline: string; whatsapp_phone: string; whatsapp_text: string; show_whatsapp: boolean; whatsapp_url: string;
  email: string; address: string; hero_eyebrow: string; hero_title: string; hero_text: string; about: string;
  seo_title: string; seo_description: string; notify_emails?: string; notify_orders?: boolean; notify_messages?: boolean; max_file_mb: number; max_files_per_order: number; max_order_upload_mb?: number; updated_at: string;
};
export type FAQItem = { id: number; question: string; answer: string; sort_order: number; is_published: boolean };
export type PublicSite = { settings: SiteSettings; faq: FAQItem[] };

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type NotificationStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
export type AdminNotification = {
  id: number; kind: 'new_order' | 'new_inquiry'; kind_label: string; status: NotificationStatus; status_label: string;
  subject: string; recipients: string[]; attempts: number; next_attempt_at: string; last_error: string; sent_at: string | null;
  created_at: string; order: number | null; order_code: string | null; inquiry: number | null;
  delivery_attempts: { started_at: string; finished_at: string; success: boolean; error: string; triggered_by: UserBrief | null }[];
};
