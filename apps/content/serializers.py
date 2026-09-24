from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.phone import normalize_phone, whatsapp_link

from .models import FAQItem, SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Admin view. The public endpoint uses PublicSiteSettingsSerializer."""

    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def get_whatsapp_url(self, obj):
        return whatsapp_link(obj.whatsapp_phone, obj.whatsapp_text) if obj.show_whatsapp else ""

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
