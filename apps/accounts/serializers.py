from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "last_login"]
        read_only_fields = ["id", "last_login"]


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "role"]


class TeamMemberWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=10)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "password"]

    def validate_email(self, value):
        return value.lower()

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
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)
