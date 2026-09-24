from django.contrib import admin

from .models import PrivateFile


@admin.register(PrivateFile)
class PrivateFileAdmin(admin.ModelAdmin):
    list_display = ["original_name", "order", "kind", "size", "created_at"]
    readonly_fields = [f.name for f in PrivateFile._meta.fields]

    def has_add_permission(self, request):
        return False
