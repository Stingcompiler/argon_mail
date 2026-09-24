"""Send one e-mail through the configured backend to verify EMAIL_URL.

    python manage.py send_test_email preedargon@gmail.com
"""
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test e-mail to verify the mail configuration."

    def add_arguments(self, parser):
        parser.add_argument("to")

    def handle(self, to, **opts):
        backend = settings.EMAIL_BACKEND.rsplit(".", 1)[-1]
        try:
            send_mail("اختبار بريد عرجون", "إذا وصلتك هذه الرسالة فإعدادات البريد تعمل.",
                      settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        except Exception as exc:
            raise CommandError(f"Sending failed via {backend}: {type(exc).__name__}: {exc}")
        self.stdout.write(self.style.SUCCESS(f"Sent to {to} via {backend}."))
        if backend == "EmailBackend" and "console" in settings.EMAIL_BACKEND:
            self.stdout.write("Note: console backend — the message was printed, not delivered. Set EMAIL_URL.")
