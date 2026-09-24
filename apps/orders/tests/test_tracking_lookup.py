import uuid
from unittest.mock import patch

from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.core.tests.factories import make_service, order_payload
from apps.core.text import normalize_name
from apps.core.throttles import ScopedIPThrottle

URL = "/api/v1/public/track/lookup/"


class NormalizeNameTests(APITestCase):
    def test_folds_common_arabic_variants(self):
        self.assertEqual(normalize_name("  أحمد   محمّد  عثمان "), normalize_name("احمد محمد عثمان"))
        self.assertEqual(normalize_name("فاطمة"), normalize_name("فاطمه"))
        self.assertEqual(normalize_name("مصطفى"), normalize_name("مصطفي"))
        self.assertEqual(normalize_name("إسراء"), normalize_name("اسراء"))
        self.assertEqual(normalize_name("Sara ALI"), normalize_name("sara ali"))
        self.assertNotEqual(normalize_name("أحمد محمد"), normalize_name("أحمد"))


class TrackingLookupTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service()
        self.codes = [self._order("أحمد محمّد عثمان", "+249912345678") for _ in range(2)]
        self.other = self._order("أحمد محمد عثمان", "+249911111111")  # same name, other phone
        self._order("سارة علي", "+249912345678")  # same phone, other name

    def _order(self, name, phone):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service, customer_name=name, customer_phone=phone),
                             format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()["code"]

    def lookup(self, name, phone):
        return self.client.post(URL, {"full_name": name, "phone": phone}, format="json")

    def test_name_and_phone_return_only_that_customers_orders(self):
        r = self.lookup("احمد محمد  عثمان", "+249 912 345 678")
        self.assertEqual(r.status_code, 200, r.content)
        codes = [o["code"] for o in r.json()["results"]]
        self.assertEqual(sorted(codes), sorted(self.codes))
        self.assertNotIn(self.other, codes)

    def test_response_has_no_personal_data(self):
        body = self.lookup("أحمد محمد عثمان", "+249912345678").content.decode()
        for secret in ("912345678", "عثمان", "customer", "answers", "phone"):
            self.assertNotIn(secret, body)
        row = self.lookup("أحمد محمد عثمان", "+249912345678").json()["results"][0]
        self.assertEqual(set(row), {"code", "service_name", "status", "created_at", "updated_at"})

    def test_name_alone_or_wrong_phone_finds_nothing(self):
        self.assertEqual(self.lookup("أحمد محمد عثمان", "+249900000000").status_code, 404)
        self.assertEqual(self.lookup("أحمد", "+249912345678").status_code, 404)  # partial name
        wrong_phone = self.lookup("أحمد محمد عثمان", "+249900000000").json()
        wrong_name = self.lookup("شخص آخر", "+249912345678").json()
        self.assertEqual(wrong_phone, wrong_name)  # same answer either way

    def test_invalid_input(self):
        r = self.client.post(URL, {"full_name": "أ", "phone": "0912"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("phone", r.json()["errors"])

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client.get(URL).status_code, 405)

    def test_lookup_is_throttled(self):
        rates = {**ScopedIPThrottle.THROTTLE_RATES, "tracking_lookup": "3/min"}
        with patch.object(ScopedIPThrottle, "THROTTLE_RATES", rates):
            codes = [self.lookup("أي اسم", "+249900000000").status_code for _ in range(5)]
        self.assertEqual(codes[:3], [404, 404, 404])
        self.assertEqual(codes[-1], 429)
