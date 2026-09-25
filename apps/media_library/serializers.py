from rest_framework import serializers

from .models import PublicAsset


class PublicImageSerializer(serializers.ModelSerializer):
    """What the public site needs to render an image without layout shift."""

    url = serializers.CharField(read_only=True)
    alt = serializers.CharField(source="alt_text", read_only=True)

    class Meta:
        model = PublicAsset
        fields = ["url", "alt", "width", "height"]


class AssetSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)
    usage = serializers.SerializerMethodField()

    class Meta:
        model = PublicAsset
        fields = ["id", "url", "alt_text", "original_name", "content_type", "size", "width", "height", "usage", "created_at"]
        read_only_fields = ["id", "url", "original_name", "content_type", "size", "width", "height", "usage", "created_at"]

    def get_usage(self, obj) -> list[str]:
        return obj.usage()

    def validate_alt_text(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError("اكتب وصفًا للصورة لمن لا يراها ولمحركات البحث.")
        return v
