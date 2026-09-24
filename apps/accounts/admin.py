from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "username", "full_name", "role", "is_active"]
    search_fields = ["email", "username", "full_name"]
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("البيانات", {"fields": ("full_name", "role")}),
        ("الصلاحيات", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "full_name", "role", "password1", "password2")}),)
