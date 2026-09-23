from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "مدير"
    OPERATOR = "operator", "مشغّل"
    EXECUTOR = "executor", "منفذ"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("البريد الإلكتروني مطلوب.")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Role.ADMIN)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField("البريد الإلكتروني", unique=True)
    full_name = models.CharField("الاسم", max_length=120)
    role = models.CharField("الدور", max_length=16, choices=Role.choices, default=Role.EXECUTOR)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]
    objects = UserManager()

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name or self.email

    @property
    def is_admin(self):
        return self.is_active and self.role == Role.ADMIN

    @property
    def is_operator_or_admin(self):
        return self.is_active and self.role in (Role.ADMIN, Role.OPERATOR)
