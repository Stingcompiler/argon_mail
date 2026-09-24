from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

# Delay before attempt n+1 (n = attempts already made). After the last one
# the notification is marked failed and waits for a manual resend.
BACKOFF = [timedelta(minutes=1), timedelta(minutes=5), timedelta(minutes=15), timedelta(hours=1), timedelta(hours=3)]
MAX_ATTEMPTS = len(BACKOFF) + 1
LEASE = timedelta(minutes=10)


class Notification(models.Model):
    """Transactional outbox for admin e-mail alerts. Rows are created in the
    same DB transaction as the order or inquiry, so an alert is never lost and
    a mail failure never affects the save."""

    class Kind(models.TextChoices):
        NEW_ORDER = "new_order", "طلب جديد"
        NEW_INQUIRY = "new_inquiry", "رسالة جديدة"

    class Status(models.TextChoices):
        PENDING = "pending", "بانتظار الإرسال"
        SENDING = "sending", "قيد الإرسال"
        SENT = "sent", "أُرسل"
        FAILED = "failed", "فشل"
        SKIPPED = "skipped", "لم يُرسل (لا يوجد بريد مستلم)"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    dedupe_key = models.CharField(max_length=80, unique=True)
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    inquiry = models.ForeignKey("inquiries.Inquiry", null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    recipients = models.JSONField(default=list)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    html_body = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now, db_index=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class DeliveryAttempt(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name="delivery_attempts")
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField()
    success = models.BooleanField()
    error = models.CharField(max_length=500, blank=True)
    triggered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)

    class Meta:
        ordering = ["started_at"]
