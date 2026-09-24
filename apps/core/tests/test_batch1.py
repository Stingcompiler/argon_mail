"""Regression tests for the pre-deploy fixes in docs/audit-report.md (batch 1)."""
import json
import os
import subprocess
import sys
import uuid
from importlib import reload
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import clear_url_caches
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.content.models import SiteSettings
from apps.core.tests.factories import make_service, make_user, order_payload
from apps.notifications.models import Notification

PDF = b"%PDF-1.4\n" + b"0" * 200


class RequestSizeLimitTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service()

    @override_settings(API_MAX_BODY_BYTES=1024)
    def test_large_json_body_rejected_before_parsing(self):
        payload = order_payload(self.service, details="x" * 5000)
        r = self.client.post("/api/v1/public/orders/", payload, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 413)
        self.assertEqual(r.json()["code"], "payload_too_large")

    def test_large_json_login_rejected(self):
        body = json.dumps({"email": "a@b.co", "password": "x" * (2 * 1024 * 1024)})
        r = self.client.post("/api/v1/auth/login/", body, content_type="application/json", HTTP_ORIGIN=settings.SITE_URL)
        self.assertEqual(r.status_code, 413)

    def test_multipart_over_request_cap_rejected(self):
        r = self.client.post("/api/v1/public/orders/", {"payload": "{}"}, format="multipart",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()),
                             CONTENT_LENGTH=str((settings.UPLOAD_MAX_REQUEST_MB + 2) * 1024 * 1024))
        self.assertEqual(r.status_code, 413)

    def test_normal_requests_unaffected(self):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service), format="json",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 201)


class OrderTotalUploadCapTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service(fields=[
            {"key": "docs", "label": "مستندات", "type": "file", "required": True, "max_files": 3}])
        s = SiteSettings.load()
        s.max_file_mb, s.max_files_per_order = 5, 5
        s.save()

    @override_settings(UPLOAD_MAX_REQUEST_MB=1)
    def test_total_size_over_cap_rejected(self):
        big = PDF + b"0" * (600 * 1024)
        payload = order_payload(self.service, answers={})
        r = self.client.post("/api/v1/public/orders/", {
            "payload": json.dumps(payload),
            "file.docs": [SimpleUploadedFile("a.pdf", big), SimpleUploadedFile("b.pdf", big)],
        }, format="multipart", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertIn(r.status_code, (400, 413))
        if r.status_code == 400:
            self.assertIn("مجموع أحجام الملفات", json.dumps(r.json(), ensure_ascii=False))

    def test_public_settings_expose_total_cap(self):
        r = self.client.get("/api/v1/public/site/")
        self.assertEqual(r.json()["settings"]["max_order_upload_mb"], settings.UPLOAD_MAX_REQUEST_MB)


class RoleBoundAdminFlagsTests(APITestCase):
    def test_flags_follow_role_and_activity(self):
        u = make_user("boss@example.com", Role.ADMIN, "مدير")
        self.assertTrue(u.is_staff and u.is_superuser)
        u.role = Role.EXECUTOR
        u.save()
        u.refresh_from_db()
        self.assertFalse(u.is_staff or u.is_superuser)
        u.role = Role.ADMIN
        u.is_active = False
        u.save()
        u.refresh_from_db()
        self.assertFalse(u.is_staff or u.is_superuser)

    def test_demotion_via_team_api_removes_django_admin_rights(self):
        owner = make_user()
        other = make_user("second@example.com", Role.ADMIN, "مدير ثانٍ")
        self.client.force_authenticate(owner)
        r = self.client.patch(f"/api/v1/admin/team/{other.pk}/", {"role": "executor"}, format="json")
        self.assertEqual(r.status_code, 200)
        other.refresh_from_db()
        self.assertFalse(other.is_staff or other.is_superuser)

    def test_operator_created_by_command_has_no_admin_flags(self):
        from django.core.management import call_command

        with patch.dict(os.environ, {"STAFF_PASSWORD": "Str0ng-pass-phrase!"}):
            call_command("create_staff", "op@example.com", "مشغل", "--role", "operator")
        u = User.objects.get(email="op@example.com")
        self.assertFalse(u.is_staff or u.is_superuser)


class DjangoAdminToggleTests(APITestCase):
    def _reload_urls(self):
        import config.urls

        clear_url_caches()
        reload(config.urls)

    def tearDown(self):
        self._reload_urls()

    def test_django_admin_can_be_disabled(self):
        with override_settings(ENABLE_DJANGO_ADMIN=False):
            self._reload_urls()
            self.assertEqual(self.client.get("/django-admin/login/").status_code, 404)
        with override_settings(ENABLE_DJANGO_ADMIN=True):
            self._reload_urls()
            self.assertEqual(self.client.get("/django-admin/login/").status_code, 200)


class DefaultAlertRecipientTests(APITestCase):
    @override_settings(DEFAULT_ALERT_EMAILS=["preedargon@gmail.com"])
    def test_fallback_recipient_used_when_dashboard_setting_empty(self):
        cache.clear()
        s = SiteSettings.load()
        s.notify_emails = ""
        s.save()
        service = make_service()
        r = self.client.post("/api/v1/public/orders/", order_payload(service), format="json",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        n = Notification.objects.get(order__code=r.json()["code"])
        self.assertEqual((n.status, n.recipients), ("pending", ["preedargon@gmail.com"]))


class ProductionSettingsGuardTests(APITestCase):
    """Importing prod settings must fail fast on unsafe configuration."""

    BASE_ENV = {
        "DJANGO_SETTINGS_MODULE": "config.settings.prod",
        "DATABASE_URL": "postgres:///unused",
        "DJANGO_SECRET_KEY": "k" * 60,
        "JWT_SIGNING_KEY": "j" * 60,
        "INTERNAL_SECRET": "s" * 40,
        "SITE_URL": "https://arjoon.example",
        "TRUSTED_ORIGINS": "https://arjoon.example",
    }

    def run_import(self, **overrides):
        env = {k: v for k, v in os.environ.items() if k not in self.BASE_ENV}
        env.update(self.BASE_ENV)
        env.update(overrides)
        return subprocess.run(
            [sys.executable, "-c", "import django; django.setup(); print('ok')"],
            cwd=settings.BASE_DIR, env=env, capture_output=True, text=True,
        )

    def test_valid_configuration_starts(self):
        r = self.run_import()
        self.assertEqual(r.returncode, 0, r.stderr[-500:])

    def test_unsafe_configurations_refuse_to_start(self):
        cases = {
            "http site": {"SITE_URL": "http://arjoon.example", "TRUSTED_ORIGINS": "http://arjoon.example"},
            "site not trusted": {"TRUSTED_ORIGINS": "https://other.example"},
            "no internal secret": {"INTERNAL_SECRET": ""},
            "weak secret key": {"DJANGO_SECRET_KEY": "change-me"},
            "jwt key reused": {"JWT_SIGNING_KEY": "k" * 60},
            "no jwt key": {"JWT_SIGNING_KEY": ""},
        }
        for name, override in cases.items():
            with self.subTest(name):
                r = self.run_import(**override)
                self.assertNotEqual(r.returncode, 0, name)
                self.assertIn("Production configuration error", r.stderr)
