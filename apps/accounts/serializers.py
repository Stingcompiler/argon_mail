from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "full_name", "role", "is_active", "last_login"]
        read_only_fields = ["id", "last_login"]


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "role"]


class TeamMemberWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=10)

    class Meta:
        model = User
        fields = ["id", "email", "username", "full_name", "role", "is_active", "password"]
        extra_kwargs = {"username": {"required": False, "allow_null": True, "allow_blank": True}}

    def validate_email(self, value):
        return value.lower()

    def validate_username(self, value):
        value = (value or "").strip().lower() or None
        if value and User.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(username=value).exists():
            raise serializers.ValidationError("اسم المستخدم مستخدم لعضو آخر.")
        if value:
            import re

            from .models import USERNAME_RE

            if not re.match(USERNAME_RE, value):
                raise serializers.ValidationError("من 3 إلى 30 حرفًا: أحرف إنجليزية صغيرة وأرقام و _ . -، ويبدأ بحرف أو رقم.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": ["كلمة المرور مطلوبة للعضو الجديد."]})
        if attrs.get("password"):
            password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated):
        password = validated.pop("password")
        return User.objects.create_user(password=password, **validated)

    def update(self, instance, validated):
        password = validated.pop("password", None)
        for k, v in validated.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """`login` is an e-mail or a username. `email` is accepted for older clients."""

    login = serializers.CharField(max_length=254, required=False)
    email = serializers.CharField(max_length=254, required=False)
    password = serializers.CharField(trim_whitespace=False)

    def validate(self, attrs):
        ident = (attrs.get("login") or attrs.get("email") or "").strip().lower()
        if not ident:
            raise serializers.ValidationError({"login": ["أدخل البريد الإلكتروني أو اسم المستخدم."]})
        attrs["login"] = ident
        return attrs
