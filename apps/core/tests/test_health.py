from rest_framework.test import APITestCase


class HealthTests(APITestCase):
    def test_health_ok(self):
        r = self.client.get("/api/v1/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["database"], "ok")


class InternalThrottleBypassTests(APITestCase):
    def test_internal_secret_skips_throttle(self):
        from unittest.mock import patch

        from django.core.cache import cache
        from django.test import override_settings

        from apps.core.throttles import ScopedIPThrottle

        cache.clear()
        rates = {**ScopedIPThrottle.THROTTLE_RATES, "public_read": "2/min"}
        with override_settings(INTERNAL_SECRET="abc"), patch.object(ScopedIPThrottle, "THROTTLE_RATES", rates):
            internal = [self.client.get("/api/v1/public/services/", HTTP_X_INTERNAL_SECRET="abc").status_code for _ in range(4)]
            wrong = [self.client.get("/api/v1/public/services/", HTTP_X_INTERNAL_SECRET="nope").status_code for _ in range(4)]
        self.assertEqual(internal, [200] * 4)
        self.assertEqual(wrong[-1], 429)


class TrailingSlashTests(APITestCase):
    def test_proxied_path_without_slash_is_served_not_redirected(self):
        r = self.client.get("/api/v1/health")
        self.assertEqual(r.status_code, 200)
