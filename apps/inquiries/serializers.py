from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.serializers import UserBriefSerializer
from apps.core.phone import normalize_phone, whatsapp_link

from .models import Inquiry


class InquiryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inquiry
        fields = ["name", "phone", "subject", "body"]

    def validate_phone(self, v):
        try:
            return normalize_phone(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

    def validate(self, attrs):
        for k in ("name", "subject", "body"):
            attrs[k] = attrs[k].strip()
            if not attrs[k]:
                raise serializers.ValidationError({k: ["هذا الحقل مطلوب."]})
        return attrs


class InquiryAdminSerializer(serializers.ModelSerializer):
    assignee = UserBriefSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source="assignee", queryset=get_user_model().objects.filter(is_active=True),
        allow_null=True, required=False, write_only=True,
    )
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = Inquiry
        fields = ["id", "name", "phone", "subject", "body", "status", "assignee", "assignee_id",
                  "internal_note", "whatsapp_url", "created_at", "updated_at"]
        read_only_fields = ["id", "name", "phone", "subject", "body", "created_at", "updated_at"]

    def get_whatsapp_url(self, obj):
        return whatsapp_link(obj.phone, f"مرحبًا {obj.name}، بخصوص رسالتك إلى بريد عرجون: {obj.subject}")
