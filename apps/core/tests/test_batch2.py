import json
import time
import uuid
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.tests.factories import make_service, make_user, order_payload
from apps.core.views import WORKER_HEARTBEAT_KEY
from apps.media_library.models import PrivateFile

PDF = b"%PDF-1.4\n" + b"0" * 100


class HealthTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_defaults_ok(self):
        r = self.client.get("/api/v1/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"status": "ok", "database": "ok", "worker": "not_required", "storage": "ok"})

    @override_settings(HEALTH_REQUIRE_WORKER=True)
    def test_worker_heartbeat(self):
        self.assertEqual(self.client.get("/api/v1/health/").json()["worker"], "unknown")  # just started
        cache.set(WORKER_HEARTBEAT_KEY, time.time(), None)
        r = self.client.get("/api/v1/health/")
        self.assertEqual((r.status_code, r.json()["worker"]), (200, "ok"))
        cache.set(WORKER_HEARTBEAT_KEY, time.time() - 600, None)
        r = self.client.get("/api/v1/health/")
        self.assertEqual((r.status_code, r.json()["worker"]), (503, "stale"))

    @override_settings(HEALTH_REQUIRE_DATA_MOUNT=True)
    def test_unmounted_disk_fails(self):
        r = self.client.get("/api/v1/health/")  # test DATA_ROOT is a temp dir, not a mount
        self.assertEqual((r.status_code, r.json()["storage"]), (503, "not_mounted"))

    def test_worker_command_writes_heartbeat(self):
        call_command("send_notifications")
        self.assertIsNotNone(cache.get(WORKER_HEARTBEAT_KEY))


class DiagnosticsTests(APITestCase):
    def test_admin_only_and_reports_client_ip(self):
        self.client.force_authenticate(make_user("op@example.com", Role.OPERATOR, "مشغل"))
        self.assertEqual(self.client.get("/api/v1/admin/diagnostics/").status_code, 403)
        self.client.force_authenticate(make_user())
        r = self.client.get("/api/v1/admin/diagnostics/", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.9")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["client_ip"], "203.0.113.9")  # NUM_PROXIES=1: last hop
        self.assertEqual(r.json()["num_proxies"], 1)


class OpsCommandTests(APITestCase):
    def setUp(self):
        cache.clear()

    def _order_with_file(self):
        service = make_service(fields=[{"key": "docs", "label": "مستند", "type": "file", "required": True}])
        payload = order_payload(service, answers={})
        r = self.client.post("/api/v1/public/orders/", {"payload": json.dumps(payload),
                             "file.docs": SimpleUploadedFile("a.pdf", PDF)}, format="multipart",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 201)
        return PrivateFile.objects.latest("created_at")

    def test_reconcile_detects_missing_corrupted_and_orphans(self):
        f = self._order_with_file()
        out = StringIO()
        call_command("reconcile_files", "--checksums", stdout=out)
        self.assertIn("missing files: 0  corrupted: 0", out.getvalue())
        path = Path(settings.PRIVATE_ROOT) / f.path
        path.write_bytes(PDF + b"tampered")
        orphan = path.parent / "orphan.pdf"
        orphan.write_bytes(PDF)
        out = StringIO()
        with self.assertRaises(SystemExit):
            call_command("reconcile_files", "--checksums", stdout=out)
        self.assertIn("corrupted: 1", out.getvalue())
        self.assertIn("orphans: 1", out.getvalue())
        path.unlink()
        out = StringIO()
        with self.assertRaises(SystemExit):
            call_command("reconcile_files", "--delete-orphans", stdout=out)
        self.assertIn("missing files: 1", out.getvalue())
        self.assertFalse(orphan.exists())

    def test_send_test_email(self):
        out = StringIO()
        call_command("send_test_email", "preedargon@gmail.com", stdout=out)
        self.assertEqual(mail.outbox[0].to, ["preedargon@gmail.com"])

    def test_final_failure_logged_at_error(self):
        from apps.notifications.models import MAX_ATTEMPTS, Notification
        from apps.notifications.services import deliver_due
        from django.utils import timezone

        s = __import__("apps.content.models", fromlist=["SiteSettings"]).SiteSettings.load()
        s.notify_emails = "ops@example.com"
        s.save()
        self.client.post("/api/v1/public/orders/", order_payload(make_service(name="خدمة ب")), format="json",
                         HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        with patch("apps.notifications.services.EmailMultiAlternatives.send", side_effect=OSError("down")), \
                self.assertLogs("apps.notifications.services", level="ERROR") as logs:
            for _ in range(MAX_ATTEMPTS):
                Notification.objects.update(next_attempt_at=timezone.now())
                deliver_due()
        self.assertTrue(any("gave up" in m for m in logs.output))
