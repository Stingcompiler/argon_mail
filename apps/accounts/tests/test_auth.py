from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.throttles import ScopedIPThrottle
from apps.core.tests.factories import ORIGIN, PASSWORD, make_user


@override_settings(TRUSTED_ORIGINS=[ORIGIN])
class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user()

    def login(self, **extra):
        return self.client.post(
            "/api/v1/auth/login/", {"email": "ADMIN@example.com", "password": PASSWORD}, format="json",
            HTTP_ORIGIN=ORIGIN, **extra,
        )

    def test_login_returns_access_and_sets_httponly_refresh_cookie(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.json())
        self.assertNotIn("refresh", r.json())
        cookie = r.cookies["arjoon_refresh"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/v1/auth/")

    def test_login_rejects_untrusted_origin(self):
        r = self.client.post("/api/v1/auth/login/", {"email": "admin@example.com", "password": PASSWORD},
                             format="json", HTTP_ORIGIN="https://evil.example")
        self.assertEqual(r.status_code, 403)

    def test_login_rejects_missing_origin(self):
        r = self.client.post("/api/v1/auth/login/", {"email": "admin@example.com", "password": PASSWORD}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_wrong_password(self):
        r = self.client.post("/api/v1/auth/login/", {"email": "admin@example.com", "password": "nope"},
                             format="json", HTTP_ORIGIN=ORIGIN)
        self.assertEqual(r.status_code, 401)

    def test_refresh_rotates_and_old_token_is_blacklisted(self):
        self.login()
        old = self.client.cookies["arjoon_refresh"].value
        r = self.client.post("/api/v1/auth/refresh/", HTTP_ORIGIN=ORIGIN)
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(self.client.cookies["arjoon_refresh"].value, old)
        self.client.cookies["arjoon_refresh"] = old
        r = self.client.post("/api/v1/auth/refresh/", HTTP_ORIGIN=ORIGIN)
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()["code"], "session_expired")

    def test_logout_invalidates_refresh(self):
        self.login()
        token = self.client.cookies["arjoon_refresh"].value
        self.assertEqual(self.client.post("/api/v1/auth/logout/", HTTP_ORIGIN=ORIGIN).status_code, 204)
        self.client.cookies["arjoon_refresh"] = token
        self.assertEqual(self.client.post("/api/v1/auth/refresh/", HTTP_ORIGIN=ORIGIN).status_code, 401)

    def test_password_change_revokes_refresh_and_access(self):
        access = self.login().json()["access"]
        self.user.set_password("An0ther-long-passphrase")
        self.user.save()
        self.assertEqual(self.client.post("/api/v1/auth/refresh/", HTTP_ORIGIN=ORIGIN).status_code, 401)
        r = self.client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r.status_code, 401)

    def test_deactivated_user_loses_access_immediately(self):
        access = self.login().json()["access"]
        self.user.is_active = False
        self.user.save()
        r = self.client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r.status_code, 401)

    def test_role_change_applies_without_new_token(self):
        access = self.login().json()["access"]
        self.user.role = Role.EXECUTOR
        self.user.save()
        r = self.client.get("/api/v1/admin/services/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(r.status_code, 403)

    def test_admin_api_requires_token(self):
        self.assertEqual(self.client.get("/api/v1/admin/orders/").status_code, 401)

    def test_login_is_throttled(self):
        rates = {**ScopedIPThrottle.THROTTLE_RATES, "auth": "3/min"}
        with patch.object(ScopedIPThrottle, "THROTTLE_RATES", rates):
            codes = [self.client.post("/api/v1/auth/login/", {"email": "x@example.com", "password": "x"},
                                      format="json", HTTP_ORIGIN=ORIGIN).status_code for _ in range(5)]
        self.assertEqual(codes[-1], 429)
