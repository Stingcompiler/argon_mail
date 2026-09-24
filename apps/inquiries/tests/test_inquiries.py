import uuid

from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.core.tests.factories import make_user
from apps.inquiries.models import Inquiry


class InquiryTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_create_is_idempotent_and_admin_can_update(self):
        key = str(uuid.uuid4())
        data = {"name": "زائر", "phone": "+249911111111", "subject": "سؤال", "body": "مرحبًا"}
        a = self.client.post("/api/v1/public/inquiries/", data, format="json", HTTP_IDEMPOTENCY_KEY=key)
        b = self.client.post("/api/v1/public/inquiries/", data, format="json", HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual((a.status_code, b.status_code), (201, 200))
        self.assertEqual(Inquiry.objects.count(), 1)
        self.client.force_authenticate(make_user())
        pk = a.json()["id"]
        r = self.client.patch(f"/api/v1/admin/inquiries/{pk}/", {"status": "done", "internal_note": "تم", "subject": "x"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "done")
        self.assertEqual(r.json()["subject"], "سؤال")
        self.assertTrue(r.json()["whatsapp_url"].startswith("https://wa.me/249911111111?text="))
