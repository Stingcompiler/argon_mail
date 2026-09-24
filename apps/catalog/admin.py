from django.contrib import admin

from .models import Category, Service, ServiceField


class FieldInline(admin.TabularInline):
    model = ServiceField
    extra = 0


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "status", "sort_order"]
    list_filter = ["status", "category"]
    inlines = [FieldInline]


admin.site.register(Category)
