import secrets
from decimal import Decimal

from django.core.validators import MinValueValidator

from django.conf import settings
from django.db import models

CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # no 0/O, 1/I
CODE_PREFIX = "ARJ-"
CODE_LENGTH = 8  # 32**8 ≈ 1.1e12 possibilities


def generate_tracking_code() -> str:
    return CODE_PREFIX + "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


class StatusMeaning(models.TextChoices):
    """Fixed internal meaning behind each editable status label."""

    NEW = "new", "جديد"
    IN_REVIEW = "in_review", "قيد المراجعة"
    WAITING_CUSTOMER = "waiting_customer", "بانتظار العميل"
    IN_PROGRESS = "in_progress", "قيد التنفيذ"
    READY = "ready", "جاهز للتسليم"
    COMPLETED = "completed", "مكتمل"
    CANCELLED = "cancelled", "ملغي"
    FAILED = "failed", "متعذر التنفيذ"


class OrderStatus(models.Model):
    key = models.SlugField(max_length=40, unique=True)
    label = models.CharField(max_length=60)
    meaning = models.CharField(max_length=20, choices=StatusMeaning.choices)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_initial = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["is_initial"], condition=models.Q(is_initial=True), name="single_initial_status"
            )
        ]

    def __str__(self):
        return self.label


class PaymentStatus(models.TextChoices):
    NOT_REQUIRED = "not_required", "غير مطلوب"
    AWAITING = "awaiting", "بانتظار الدفع"
    VERIFYING = "verifying", "قيد التحقق"
    PAID = "paid", "مدفوع"
    REFUNDED = "refunded", "مسترد"


CURRENCIES = [("SDG", "جنيه سوداني"), ("USD", "دولار أمريكي"), ("SAR", "ريال سعودي")]


class Order(models.Model):
    code = models.CharField(max_length=20, unique=True, editable=False)
    service = models.ForeignKey("catalog.Service", on_delete=models.PROTECT, related_name="orders")
    # Frozen copy of the service and its form as the customer saw them.
    service_snapshot = models.JSONField()
    form_version = models.PositiveIntegerField()
    customer_name = models.CharField(max_length=80)
    customer_phone = models.CharField(max_length=20, db_index=True)
    answers = models.JSONField(default=list)
    details = models.TextField(blank=True, max_length=4000)
    status = models.ForeignKey(OrderStatus, on_delete=models.PROTECT, related_name="orders")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="assigned_orders"
    )
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.NOT_REQUIRED)
    idempotency_key = models.UUIDField(unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    public_updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "-created_at"]), models.Index(fields=["assignee", "-created_at"])]

    def __str__(self):
        return self.code

    @property
    def service_name(self):
        return self.service_snapshot.get("name", "")


class OrderEvent(models.Model):
    class Kind(models.TextChoices):
        CREATED = "created", "إنشاء الطلب"
        STATUS_CHANGED = "status_changed", "تغيير الحالة"
        ASSIGNED = "assigned", "إسناد"
        NOTE_ADDED = "note_added", "ملاحظة"
        ATTACHMENT_ADDED = "attachment_added", "مرفق"
        QUOTE_CREATED = "quote_created", "عرض سعر"
        QUOTE_DECIDED = "quote_decided", "قرار عرض السعر"
        PAYMENT_STATUS = "payment_status", "حالة الدفع"
        PAYMENT_RECORDED = "payment_recorded", "تسجيل دفعة"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    is_public = models.BooleanField(default=False)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class OrderNote(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "عامة"
        INTERNAL = "internal", "داخلية"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    visibility = models.CharField(max_length=10, choices=Visibility.choices)
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class Quote(models.Model):
    """A versioned price offer. The customer approves outside the platform
    (WhatsApp, call); staff record that decision with a note."""

    class Status(models.TextChoices):
        PENDING = "pending", "بانتظار موافقة العميل"
        ACCEPTED = "accepted", "وافق العميل"
        REJECTED = "rejected", "رفض العميل"
        SUPERSEDED = "superseded", "استُبدل بعرض أحدث"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="quotes")
    version = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    currency = models.CharField(max_length=3, choices=CURRENCIES)
    note = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["version"]
        constraints = [models.UniqueConstraint(fields=["order", "version"], name="unique_quote_version")]


class PaymentEntry(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "نقدًا"
        BANK = "bank_transfer", "تحويل بنكي"
        MOBILE = "mobile_money", "تطبيق دفع"
        OTHER = "other", "أخرى"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, choices=CURRENCIES)
    method = models.CharField(max_length=20, choices=Method.choices)
    reference = models.CharField(max_length=120, blank=True)
    note = models.CharField(max_length=500, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
