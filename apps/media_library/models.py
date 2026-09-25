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


class PublicAsset(models.Model):
    """An image shown on the public site (service image, logo, hero). Stored
    under MEDIA_ROOT with a random name, re-encoded without metadata, served
    at /media/. Separate from PrivateFile, which is never public."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    path = models.CharField(max_length=255, unique=True)
    original_name = models.CharField(max_length=200)
    alt_text = models.CharField("النص البديل", max_length=200)
    content_type = models.CharField(max_length=40)
    size = models.PositiveIntegerField()
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.alt_text or self.original_name

    @property
    def url(self):
        return f"{settings.MEDIA_URL}{self.path}"

    def usage(self) -> list[str]:
        from apps.content.models import SiteSettings

        used = [f"صورة الخدمة: {s.name}" for s in self.services.all()]
        site = SiteSettings.objects.filter(pk=1).first()
        if site and site.logo_id == self.pk:
            used.append("شعار الموقع")
        if site and site.hero_image_id == self.pk:
            used.append("صورة المقدمة")
        return used
