from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.phone import normalize_phone, whatsapp_link

from .models import FAQItem, SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def get_whatsapp_url(self, obj):
        return whatsapp_link(obj.whatsapp_phone, obj.whatsapp_text) if obj.show_whatsapp else ""

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
