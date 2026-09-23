from django.db import models


class SiteSettings(models.Model):
    """Singleton (pk=1) holding editable identity, contact and home copy."""

    name = models.CharField(max_length=80, default="بريد عرجون")
    tagline = models.CharField(max_length=120, default="نقرّب لك المسافات")
    whatsapp_phone = models.CharField(max_length=20, blank=True)
    whatsapp_text = models.CharField(max_length=300, default="مرحبًا، أود الاستفسار عن خدمات بريد عرجون.")
    show_whatsapp = models.BooleanField(default=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=200, blank=True)
    hero_eyebrow = models.CharField(max_length=120, default="من السودان، أقرب إليك")
    hero_title = models.CharField(max_length=160, default="خدمات متنوعة.\nومسافات أقرب.")
    hero_text = models.TextField(
        max_length=600,
        default="كل ما تحتاجه لإنجاز خطوتك القادمة، في مكان واحد.\nاختر خدمتك، أرسل طلبك، ودع التفاصيل علينا.",
    )
    about = models.TextField(
        max_length=2000, default="منصة تجمع خدمات متنوعة في تجربة بسيطة، وتضع وضوح الخطوات في المقدمة."
    )
    notify_emails = models.CharField("بريد التنبيهات", max_length=500, blank=True,
                                     help_text="عناوين مفصولة بفاصلة")
    notify_orders = models.BooleanField("تنبيه عند طلب جديد", default=True)
    notify_messages = models.BooleanField("تنبيه عند رسالة جديدة", default=True)
    max_file_mb = models.PositiveSmallIntegerField("حجم الملف الأقصى MB", default=5)
    max_files_per_order = models.PositiveSmallIntegerField("عدد الملفات لكل طلب", default=5)
    seo_title = models.CharField(max_length=70, default="بريد عرجون | خدمات تقرّب المسافات")
    seo_description = models.CharField(max_length=170, default="خدمات متنوعة، وطلب تتابعه بسهولة.")
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class FAQItem(models.Model):
    question = models.CharField(max_length=200)
    answer = models.TextField(max_length=2000)
    sort_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question


def upload_limits():
    """Owner settings, capped by the hard ceilings in settings."""
    from django.conf import settings as dj

    s = SiteSettings.load()
    max_mb = max(1, min(s.max_file_mb, dj.UPLOAD_HARD_MAX_MB))
    max_files = max(1, min(s.max_files_per_order, dj.UPLOAD_HARD_MAX_FILES))
    return {"max_file_bytes": max_mb * 1024 * 1024, "max_file_mb": max_mb, "max_files": max_files}
