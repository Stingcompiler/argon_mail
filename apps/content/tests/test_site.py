from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.tests.factories import make_user


class SiteTests(APITestCase):
    def test_public_site_and_admin_only_edit(self):
        r = self.client.get("/api/v1/public/site/")
        self.assertEqual(r.json()["settings"]["name"], "بريد عرجون")
        self.assertEqual(len(r.json()["faq"]), 3)
        self.client.force_authenticate(make_user("op@example.com", Role.OPERATOR, "مشغل"))
        self.assertEqual(self.client.patch("/api/v1/admin/settings/", {"name": "x"}, format="json").status_code, 403)
        self.client.force_authenticate(make_user())
        r = self.client.patch("/api/v1/admin/settings/", {"whatsapp_phone": "00249 91 234 5678"}, format="json")
        self.assertEqual(r.json()["whatsapp_phone"], "+249912345678")
        self.assertTrue(r.json()["whatsapp_url"].startswith("https://wa.me/249912345678"))
