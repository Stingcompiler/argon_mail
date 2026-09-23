from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["subject", "status", "attempts", "created_at", "sent_at"]
    list_filter = ["status", "kind"]
