import re
import uuid

from django.db import transaction
from rest_framework import serializers

from .models import Category, Service, ServiceField


class CategorySerializer(serializers.ModelSerializer):
    services_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "sort_order", "services_count"]
        read_only_fields = ["id", "slug"]


class CategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["name", "slug"]


class PublicFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceField
        fields = ["key", "label", "help_text", "type", "required", "options", "max_length"]


class PublicServiceListSerializer(serializers.ModelSerializer):
    category = CategoryBriefSerializer(read_only=True)

    class Meta:
        model = Service
        fields = [
            "slug", "name", "category", "description", "tagline", "icon_key", "color",
            "price_label", "duration_text", "is_featured", "updated_at",
        ]


class PublicServiceDetailSerializer(PublicServiceListSerializer):
    fields = PublicFieldSerializer(many=True, read_only=True)

    class Meta(PublicServiceListSerializer.Meta):
        fields = PublicServiceListSerializer.Meta.fields + [
            "requirements", "price_type", "price_amount", "price_currency",
            "seo_title", "seo_description", "form_version", "fields",
        ]


class AdminFieldSerializer(serializers.ModelSerializer):
    key = serializers.CharField(max_length=40, required=False, allow_blank=True)

    class Meta:
        model = ServiceField
        fields = ["key", "label", "help_text", "type", "required", "options", "max_length"]

    def validate_key(self, v):
        if v and not re.fullmatch(r"[a-z0-9_]{1,40}", v):
            raise serializers.ValidationError("معرّف الحقل غير صالح.")
        return v

    def validate_label(self, v):
        if not v.strip():
            raise serializers.ValidationError("اسم الحقل مطلوب.")
        return v.strip()

    def validate(self, attrs):
        options = attrs.get("options") or []
        if not isinstance(options, list) or any(not isinstance(o, str) for o in options):
            raise serializers.ValidationError({"options": ["الخيارات يجب أن تكون قائمة نصوص."]})
        options = [o.strip() for o in options if o.strip()]
        if len(set(options)) != len(options):
            raise serializers.ValidationError({"options": ["توجد خيارات مكررة."]})
        if attrs.get("type") in ("select", "multiselect"):
            if not options:
                raise serializers.ValidationError({"options": ["أضف خيارًا واحدًا على الأقل."]})
            if len(options) > 50:
                raise serializers.ValidationError({"options": ["الحد الأقصى 50 خيارًا."]})
        else:
            options = []
        attrs["options"] = options
        if not 1 <= attrs.get("max_length", 1000) <= 5000:
            raise serializers.ValidationError({"max_length": ["الحد بين 1 و5000 حرف."]})
        return attrs


class AdminServiceSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    category_name = serializers.CharField(source="category.name", read_only=True)
    fields = AdminFieldSerializer(many=True, required=False)
    slug = serializers.SlugField(max_length=140, allow_unicode=True, required=False, allow_blank=True)
    orders_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Service
        fields = [
            "id", "category", "category_name", "name", "slug", "description", "tagline", "requirements",
            "duration_text", "price_type", "price_amount", "price_currency", "price_label", "icon_key",
            "color", "status", "is_featured", "sort_order", "seo_title", "seo_description",
            "form_version", "fields", "orders_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "form_version", "price_label", "created_at", "updated_at"]

    def validate_slug(self, v):
        if v and Service.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(slug=v).exists():
            raise serializers.ValidationError("هذا الرابط مستخدم لخدمة أخرى.")
        return v

    def validate_fields(self, fields):
        keys = [f.get("key") for f in fields if f.get("key")]
        if len(keys) != len(set(keys)):
            raise serializers.ValidationError("معرّفات الحقول مكررة.")
        if len(fields) > 40:
            raise serializers.ValidationError("الحد الأقصى 40 حقلًا.")
        return fields

    def validate(self, attrs):
        def val(name, default=None):
            return attrs.get(name, getattr(self.instance, name, default) if self.instance else default)

        if val("price_type", "after_review") != Service.PriceType.AFTER_REVIEW and val("price_amount") is None:
            raise serializers.ValidationError({"price_amount": ["أدخل قيمة السعر."]})
        if val("price_type", "after_review") != Service.PriceType.AFTER_REVIEW and not val("price_currency"):
            raise serializers.ValidationError({"price_currency": ["اختر العملة."]})
        if "icon_key" in attrs and attrs["icon_key"] not in Service.ICON_KEYS:
            raise serializers.ValidationError({"icon_key": ["أيقونة غير مدعومة."]})
        if "color" in attrs and attrs["color"] not in Service.COLORS:
            raise serializers.ValidationError({"color": ["لون غير مدعوم."]})
        for name in ("name", "description"):
            if name in attrs and not attrs[name].strip():
                raise serializers.ValidationError({name: ["هذا الحقل مطلوب."]})
        return attrs

    def _sync_fields(self, service, fields_data):
        existing = {f.key: f for f in service.fields.all()}
        before = [f.as_snapshot() for f in service.fields.all()]
        keep = set()
        for order, data in enumerate(fields_data):
            key = data.pop("key", "") or f"f_{uuid.uuid4().hex[:8]}"
            keep.add(key)
            field = existing.get(key) or ServiceField(service=service, key=key)
            for k, v in data.items():
                setattr(field, k, v)
            field.sort_order = order
            field.save()
        service.fields.exclude(key__in=keep).delete()
        after = [f.as_snapshot() for f in service.fields.all()]
        if before != after and service.pk and before:
            Service.objects.filter(pk=service.pk).update(form_version=service.form_version + 1)
            service.form_version += 1

    @transaction.atomic
    def create(self, validated):
        fields_data = validated.pop("fields", [])
        service = Service.objects.create(**validated)
        self._sync_fields(service, fields_data)
        return service

    @transaction.atomic
    def update(self, instance, validated):
        fields_data = validated.pop("fields", None)
        if validated.get("slug") == "":
            validated.pop("slug")
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if fields_data is not None:
            self._sync_fields(instance, fields_data)
        return instance
