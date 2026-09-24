from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
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


USERNAME_RE = r"^[A-Za-z0-9][A-Za-z0-9_.-]{2,29}$"


class User(AbstractUser):
    # Optional login alias. Stored lower-case so it is unique regardless of
    # case; e-mail stays the primary identifier (USERNAME_FIELD).
    username = models.CharField(
        "اسم المستخدم", max_length=30, unique=True, null=True, blank=True,
        validators=[RegexValidator(USERNAME_RE, "من 3 إلى 30 حرفًا: أحرف إنجليزية صغيرة وأرقام و _ . -، ويبدأ بحرف أو رقم.")],
    )
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

    def save(self, *args, **kwargs):
        self.username = (self.username or "").strip().lower() or None
        # Django-admin access always follows the dashboard role, so demoting
        # or deactivating someone also removes their superuser rights.
        self.is_staff = self.is_superuser = bool(self.is_active and self.role == Role.ADMIN)
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.is_active and self.role == Role.ADMIN

    @property
    def is_operator_or_admin(self):
        return self.is_active and self.role in (Role.ADMIN, Role.OPERATOR)
