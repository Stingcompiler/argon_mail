import uuid

from django.conf import settings
from django.db import models


class PrivateFile(models.Model):
    """A customer or staff file attached to an order. Stored under
    PRIVATE_ROOT with a random name and never exposed by a public URL."""

    class Kind(models.TextChoices):
        ORDER_FIELD = "order_field", "مرفق من نموذج الطلب"
        ORDER_DOCUMENT = "order_document", "مستند أضافه الفريق"
        PAYMENT_PROOF = "payment_proof", "إثبات دفع"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey("orders.Order", on_delete=models.PROTECT, related_name="attachments")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    field_key = models.CharField(max_length=40, blank=True)
    field_label = models.CharField(max_length=120, blank=True)
    payment = models.ForeignKey("orders.PaymentEntry", null=True, blank=True, on_delete=models.PROTECT, related_name="proofs")
    original_name = models.CharField(max_length=200)
    content_type = models.CharField(max_length=60)
    size = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64)
    path = models.CharField(max_length=255, unique=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.original_name
