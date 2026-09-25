from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.content.models import Page
from apps.core.tests.factories import make_user


class PageTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(make_user())

    def test_legal_pages_seeded_published_and_flagged_for_review(self):
        self.client.force_authenticate(None)
        r = self.client.get("/api/v1/public/pages/privacy/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["needs_review"])
        links = [p["slug"] for p in self.client.get("/api/v1/public/site/").json()["pages"]]
        self.assertEqual(links[:2], ["privacy", "terms"])

    def test_editing_legal_page_clears_review_flag_but_keeps_slug_and_status(self):
        pk = Page.objects.get(slug="terms").pk
        r = self.client.patch(f"/api/v1/admin/pages/{pk}/", {"body": "## جديد\\nنص نهائي"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["needs_review"])
        self.assertEqual(self.client.patch(f"/api/v1/admin/pages/{pk}/", {"slug": "other"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"/api/v1/admin/pages/{pk}/", {"status": "draft"}, format="json").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/v1/admin/pages/{pk}/").status_code, 409)

    def test_custom_page_lifecycle(self):
        r = self.client.post("/api/v1/admin/pages/", {"title": "من نحن", "body": "نص", "status": "draft"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["slug"], "من-نحن")
        pk = r.json()["id"]
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/public/pages/من-نحن/").status_code, 404)  # draft is private
        self.client.force_authenticate(make_user("a2@example.com", Role.ADMIN, "م"))
        self.client.patch(f"/api/v1/admin/pages/{pk}/", {"status": "published"}, format="json")
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/public/pages/من-نحن/").status_code, 200)

    def test_custom_page_cannot_take_reserved_or_used_slug(self):
        for slug in ("privacy", "terms"):
            r = self.client.post("/api/v1/admin/pages/", {"title": "س", "slug": slug}, format="json")
            self.assertEqual(r.status_code, 400)
        self.client.post("/api/v1/admin/pages/", {"title": "أ", "slug": "a"}, format="json")
        self.assertEqual(self.client.post("/api/v1/admin/pages/", {"title": "ب", "slug": "a"}, format="json").status_code, 400)

    def test_executor_cannot_edit_pages(self):
        self.client.force_authenticate(make_user("e@example.com", Role.EXECUTOR, "منفذ"))
        self.assertEqual(self.client.get("/api/v1/admin/pages/").status_code, 403)
