import time
from unittest.mock import patch

from rest_framework.test import APITestCase

from apps.content.models import Page
from apps.core import preview
from apps.core.tests.factories import make_service, make_user


class AppearanceTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(make_user())

    def test_defaults_are_public(self):
        s = self.client.get("/api/v1/public/site/").json()["settings"]
        self.assertEqual([n["href"] for n in s["navigation"]], ["/", "/services", "/about", "/contact"])
        self.assertEqual([h["key"] for h in s["home_sections"]], ["services", "how", "faq"])

    def test_navigation_internal_links_only(self):
        ok = [{"label": "خدماتنا", "href": "/services", "enabled": True}, {"label": "عنا", "href": "/p/من-نحن", "enabled": False}]
        r = self.client.patch("/api/v1/admin/settings/", {"navigation": ok}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        for bad in ("https://evil.example", "//evil.example", "javascript:alert(1)", "services", ""):
            r = self.client.patch("/api/v1/admin/settings/", {"navigation": [{"label": "س", "href": bad}]}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        r = self.client.patch("/api/v1/admin/settings/", {"navigation": [{"label": "س", "href": "/", "enabled": False}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_home_sections_must_be_the_three_once(self):
        good = [{"key": "faq", "visible": True}, {"key": "services", "visible": False}, {"key": "how", "visible": True}]
        self.assertEqual(self.client.patch("/api/v1/admin/settings/", {"home_sections": good}, format="json").status_code, 200)
        for bad in (good[:2], good + [{"key": "faq"}], [{"key": "x"}, {"key": "how"}, {"key": "faq"}]):
            self.assertEqual(self.client.patch("/api/v1/admin/settings/", {"home_sections": bad}, format="json").status_code, 400)


class PreviewTests(APITestCase):
    def setUp(self):
        self.admin = make_user()
        self.draft = make_service(name="خدمة مسودة", status="draft")
        self.page = Page.objects.create(slug="مسودة", title="صفحة مسودة", body="نص", status="draft")

    def link(self, url):
        self.client.force_authenticate(self.admin)
        r = self.client.post(url)
        self.client.force_authenticate(None)
        return r.json()["url"].split("preview=")[1]

    def test_service_preview_link(self):
        token = self.link(f"/api/v1/admin/services/{self.draft.pk}/preview-link/")
        base = f"/api/v1/public/services/{self.draft.slug}/"
        self.assertEqual(self.client.get(base).status_code, 404)
        self.assertEqual(self.client.get(base, {"preview": token}).status_code, 200)
        other = make_service(name="مسودة أخرى", status="draft")
        self.assertEqual(self.client.get(f"/api/v1/public/services/{other.slug}/", {"preview": token}).status_code, 404)
        self.assertEqual(self.client.get(base, {"preview": token[:-2] + "xx"}).status_code, 404)
        with patch("django.core.signing.time.time", return_value=time.time() + preview.PREVIEW_MAX_AGE + 5):
            self.assertEqual(self.client.get(base, {"preview": token}).status_code, 404)

    def test_page_preview_link_and_kind_binding(self):
        token = self.link(f"/api/v1/admin/pages/{self.page.pk}/preview-link/")
        base = f"/api/v1/public/pages/{self.page.slug}/"
        self.assertEqual(self.client.get(base).status_code, 404)
        self.assertEqual(self.client.get(base, {"preview": token}).status_code, 200)
        # A page token does not open a service with the same numeric id.
        svc_token = preview.make("page", self.draft.pk)
        self.assertEqual(self.client.get(f"/api/v1/public/services/{self.draft.slug}/", {"preview": svc_token}).status_code, 404)

    def test_preview_link_requires_staff(self):
        self.assertEqual(self.client.post(f"/api/v1/admin/services/{self.draft.pk}/preview-link/").status_code, 401)
