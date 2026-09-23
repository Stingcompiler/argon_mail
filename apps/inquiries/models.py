from django.conf import settings
from django.db import models


class Inquiry(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "جديدة"
        IN_PROGRESS = "in_progress", "قيد المتابعة"
        DONE = "done", "تمت المعالجة"

    name = models.CharField(max_length=80)
    phone = models.CharField(max_length=20, db_index=True)
    subject = models.CharField(max_length=140)
    body = models.TextField(max_length=4000)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT)
    internal_note = models.TextField(blank=True, max_length=4000)
    idempotency_key = models.UUIDField(unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "inquiries"

    def __str__(self):
        return self.subject
