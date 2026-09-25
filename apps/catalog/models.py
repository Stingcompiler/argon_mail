import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify


def unique_slug(model, value, instance_pk=None, field="slug", max_length=140):
    base = slugify(value, allow_unicode=True)[:max_length] or uuid.uuid4().hex[:8]
    slug, n = base, 2
    qs = model.objects.exclude(pk=instance_pk)
    while qs.filter(**{field: slug}).exists():
        suffix = f"-{n}"
        slug = base[: max_length - len(suffix)] + suffix
        n += 1
    return slug


class Category(models.Model):
    name = models.CharField("الاسم", max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, allow_unicode=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Category, self.name, self.pk, max_length=100)
        super().save(*args, **kwargs)


class Service(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "مسودة"
        PUBLISHED = "published", "منشورة"
        HIDDEN = "hidden", "مخفية"

    class PriceType(models.TextChoices):
        AFTER_REVIEW = "after_review", "بعد مراجعة الطلب"
        FIXED = "fixed", "سعر ثابت"
        STARTING_FROM = "starting_from", "يبدأ من"

    ICON_KEYS = ["package", "education", "travel", "document"]
    COLORS = ["sage", "sand", "blue", "rose"]

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="services")
    name = models.CharField("الاسم", max_length=120)
    slug = models.SlugField(max_length=140, unique=True, allow_unicode=True, blank=True)
    description = models.TextField("الوصف", max_length=4000)
    tagline = models.CharField("عبارة البطاقة", max_length=120, blank=True)
    requirements = models.TextField("المتطلبات", blank=True, max_length=4000)
    duration_text = models.CharField("المدة التقديرية", max_length=120, blank=True)
    price_type = models.CharField(max_length=20, choices=PriceType.choices, default=PriceType.AFTER_REVIEW)
    price_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))]
    )
    price_currency = models.CharField(max_length=3, blank=True, default="SDG")
    icon_key = models.CharField(max_length=20, default="package")
    image = models.ForeignKey("media_library.PublicAsset", null=True, blank=True, on_delete=models.PROTECT, related_name="services")
    color = models.CharField(max_length=10, default="sage")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT, db_index=True)
    is_featured = models.BooleanField("تظهر في الرئيسية", default=True)
    sort_order = models.PositiveIntegerField(default=0)
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=170, blank=True)
    # Incremented whenever the request form changes; stored on each order.
    form_version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price_type="after_review") | models.Q(price_amount__isnull=False),
                name="service_price_amount_required",
            )
        ]

    def __str__(self):
        return self.name

    @property
    def is_public(self):
        return self.status == self.Status.PUBLISHED

    @property
    def price_label(self):
        if self.price_type == self.PriceType.AFTER_REVIEW or self.price_amount is None:
            return "السعر بعد مراجعة التفاصيل"
        amount = f"{self.price_amount.normalize():f}"
        if self.price_type == self.PriceType.STARTING_FROM:
            return f"يبدأ من {amount} {self.price_currency}"
        return f"{amount} {self.price_currency}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Service, self.name, self.pk)
        if self.pk:
            old_slug = Service.objects.filter(pk=self.pk).values_list("slug", flat=True).first()
            if old_slug and old_slug != self.slug:
                ServiceSlugRedirect.objects.update_or_create(old_slug=old_slug, defaults={"service": self})
                ServiceSlugRedirect.objects.filter(old_slug=self.slug).delete()
        super().save(*args, **kwargs)


class ServiceField(models.Model):
    class Type(models.TextChoices):
        TEXT = "text", "نص قصير"
        TEXTAREA = "textarea", "نص طويل"
        NUMBER = "number", "رقم"
        DATE = "date", "تاريخ"
        SELECT = "select", "اختيار واحد"
        MULTISELECT = "multiselect", "اختيارات متعددة"
        ADDRESS = "address", "عنوان"
        FILE = "file", "ملف"
        IMAGE = "image", "صورة"

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="fields")
    key = models.CharField(max_length=40)
    label = models.CharField(max_length=120)
    help_text = models.CharField(max_length=240, blank=True)
    type = models.CharField(max_length=12, choices=Type.choices, default=Type.TEXT)
    required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    max_length = models.PositiveIntegerField(default=1000)
    max_files = models.PositiveSmallIntegerField(default=1)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [models.UniqueConstraint(fields=["service", "key"], name="unique_field_key_per_service")]

    def __str__(self):
        return self.label

    def as_snapshot(self):
        return {
            "key": self.key,
            "label": self.label,
            "type": self.type,
            "required": self.required,
            "options": list(self.options or []),
            "max_length": self.max_length,
            "max_files": self.max_files,
        }


class ServiceSlugRedirect(models.Model):
    """Old slugs keep working with a permanent redirect after a rename."""

    old_slug = models.SlugField(max_length=140, unique=True, allow_unicode=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="slug_redirects")
    created_at = models.DateTimeField(auto_now_add=True)
