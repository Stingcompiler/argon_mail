from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.phone import normalize_phone, whatsapp_link
from apps.media_library.models import PublicAsset
from apps.media_library.serializers import PublicImageSerializer

from .models import FAQItem, Page, SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Admin view. The public endpoint uses PublicSiteSettingsSerializer."""

    whatsapp_url = serializers.SerializerMethodField()
    logo = serializers.PrimaryKeyRelatedField(queryset=PublicAsset.objects.all(), allow_null=True, required=False)
    hero_image = serializers.PrimaryKeyRelatedField(queryset=PublicAsset.objects.all(), allow_null=True, required=False)
    logo_data = PublicImageSerializer(source="logo", read_only=True)
    hero_image_data = PublicImageSerializer(source="hero_image", read_only=True)

    class Meta:
        model = SiteSettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def get_whatsapp_url(self, obj):
        return whatsapp_link(obj.whatsapp_phone, obj.whatsapp_text) if obj.show_whatsapp else ""

    def validate_navigation(self, v):
        import re

        if not isinstance(v, list) or not 1 <= len(v) <= 8:
            raise serializers.ValidationError("من 1 إلى 8 روابط.")
        out = []
        for item in v:
            if not isinstance(item, dict):
                raise serializers.ValidationError("صيغة غير صحيحة.")
            label = str(item.get("label", "")).strip()
            href = str(item.get("href", "")).strip()
            if not label or len(label) > 30:
                raise serializers.ValidationError("اسم الرابط مطلوب (حتى 30 حرفًا).")
            # Internal links only: no external URLs, schemes or protocol-relative paths.
            if not re.fullmatch(r"/[^\s:]*", href) or href.startswith("//"):
                raise serializers.ValidationError(f"«{label}»: الروابط داخلية فقط وتبدأ بـ /.")
            out.append({"label": label, "href": href, "enabled": bool(item.get("enabled", True))})
        if not any(i["enabled"] for i in out):
            raise serializers.ValidationError("فعّل رابطًا واحدًا على الأقل.")
        return out

    def validate_home_sections(self, v):
        from .models import HOME_SECTIONS

        if not isinstance(v, list) or sorted(str(i.get("key")) for i in v if isinstance(i, dict)) != sorted(HOME_SECTIONS):
            raise serializers.ValidationError("يجب أن تحتوي القائمة الأقسام الثلاثة مرة واحدة.")
        return [{"key": i["key"], "visible": bool(i.get("visible", True))} for i in v]

    def validate_notify_emails(self, v):
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError as DjangoError

        emails = [e.strip().lower() for e in (v or "").split(",") if e.strip()]
        if len(emails) > 10:
            raise serializers.ValidationError("الحد الأقصى 10 عناوين.")
        for e in emails:
            try:
                validate_email(e)
            except DjangoError:
                raise serializers.ValidationError(f"«{e}» ليس بريدًا صحيحًا.")
        return ", ".join(emails)

    def validate_max_file_mb(self, v):
        from django.conf import settings as dj

        if not 1 <= v <= dj.UPLOAD_HARD_MAX_MB:
            raise serializers.ValidationError(f"بين 1 و{dj.UPLOAD_HARD_MAX_MB} MB.")
        return v

    def validate_max_files_per_order(self, v):
        from django.conf import settings as dj

        if not 1 <= v <= dj.UPLOAD_HARD_MAX_FILES:
            raise serializers.ValidationError(f"بين 1 و{dj.UPLOAD_HARD_MAX_FILES}.")
        return v

    def validate_whatsapp_phone(self, v):
        if not v:
            return v
        try:
            return normalize_phone(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQItem
        fields = ["id", "question", "answer", "sort_order", "is_published"]


class PublicSiteSettingsSerializer(SiteSettingsSerializer):
    """Never exposes the internal alert recipients."""

    max_order_upload_mb = serializers.SerializerMethodField()

    def get_max_order_upload_mb(self, obj) -> int:
        from .models import upload_limits

        return upload_limits()["max_total_mb"]

    class Meta(SiteSettingsSerializer.Meta):
        exclude = ["id", "notify_emails", "notify_orders", "notify_messages"]


class PageLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["slug", "title"]


class PublicPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = ["slug", "title", "body", "seo_title", "seo_description", "needs_review", "updated_at"]


class AdminPageSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(max_length=80, allow_unicode=True, required=False, allow_blank=True)
    is_system = serializers.BooleanField(read_only=True)

    class Meta:
        model = Page
        fields = ["id", "slug", "title", "body", "status", "show_in_footer", "sort_order", "seo_title",
                  "seo_description", "needs_review", "is_system", "updated_at"]
        read_only_fields = ["id", "needs_review", "is_system", "updated_at"]

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError("اكتب عنوان الصفحة.")
        return v.strip()

    def validate(self, attrs):
        from django.utils.text import slugify

        inst = self.instance
        if inst and inst.is_system:
            if attrs.get("slug") not in (None, "", inst.slug):
                raise serializers.ValidationError({"slug": ["رابط صفحات الخصوصية والشروط ثابت."]})
            if attrs.get("status") == Page.Status.DRAFT:
                raise serializers.ValidationError({"status": ["صفحتا الخصوصية والشروط تبقيان منشورتين لأن نموذج الطلب يربط بهما."]})
            attrs.pop("slug", None)
        else:
            slug = attrs.get("slug") or (None if inst else slugify(attrs.get("title", ""), allow_unicode=True))
            if slug is not None:
                if not slug:
                    raise serializers.ValidationError({"slug": ["اكتب رابطًا للصفحة."]})
                if slug in Page.SYSTEM_SLUGS or Page.objects.exclude(pk=getattr(inst, "pk", None)).filter(slug=slug).exists():
                    raise serializers.ValidationError({"slug": ["هذا الرابط مستخدم."]})
                attrs["slug"] = slug
        return attrs

    def update(self, instance, validated):
        validated["needs_review"] = False  # the owner has reviewed the text
        return super().update(instance, validated)
