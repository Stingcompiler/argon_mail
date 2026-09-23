from django.apps import AppConfig


class RevalidationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.revalidation"

    def ready(self):
        from . import signals  # noqa: F401
