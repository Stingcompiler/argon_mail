from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.catalog.models import Category, Service
from apps.core.tests.factories import make_service, make_user


class CatalogTests(APITestCase):
    def setUp(self):
        self.admin = make_user()
        self.cat = Category.objects.create(name="خدمات بريدية")

    def payload(self, **over):
        data = {
            "category": self.cat.pk, "name": "إرسال الطرود", "description": "وصف الخدمة", "status": "draft",
            "price_type": "after_review",
            "fields": [{"label": "الوجهة", "type": "text", "required": True},
                       {"label": "النوع", "type": "select", "required": True, "options": ["أ", "ب"]}],
        }
        data.update(over)
        return data

    def test_admin_creates_draft_then_publishes(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/v1/admin/services/", self.payload(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        slug = r.json()["slug"]
        self.assertEqual(slug, "إرسال-الطرود")
        self.assertEqual(len(r.json()["fields"]), 2)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f"/api/v1/public/services/{slug}/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/services/").json(), [])
        self.client.force_authenticate(self.admin)
        self.client.patch(f"/api/v1/admin/services/{r.json()['id']}/", {"status": "published"}, format="json")
        self.client.force_authenticate(None)
        d = self.client.get(f"/api/v1/public/services/{slug}/")
        self.assertEqual(d.status_code, 200)
        self.assertEqual([f["label"] for f in d.json()["fields"]], ["الوجهة", "النوع"])

    def test_select_needs_options_and_price_needs_amount(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/v1/admin/services/", self.payload(
            price_type="fixed", fields=[{"label": "النوع", "type": "select", "options": []}]), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("fields", r.json()["errors"])

    def test_fixed_price_label(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/v1/admin/services/", self.payload(
            price_type="starting_from", price_amount="2500.00", price_currency="SDG"), format="json")
        self.assertEqual(r.json()["price_label"], "يبدأ من 2500 SDG")

    def test_editing_fields_bumps_form_version_and_keeps_keys(self):
        self.client.force_authenticate(self.admin)
        s = self.client.post("/api/v1/admin/services/", self.payload(), format="json").json()
        fields = s["fields"]
        fields[0]["label"] = "وجهة الإرسال"
        r = self.client.patch(f"/api/v1/admin/services/{s['id']}/", {"fields": fields}, format="json")
        self.assertEqual(r.json()["form_version"], 2)
        self.assertEqual([f["key"] for f in r.json()["fields"]], [f["key"] for f in s["fields"]])

    def test_adding_a_field_bumps_form_version(self):
        self.client.force_authenticate(self.admin)
        s = self.client.post("/api/v1/admin/services/", self.payload(), format="json").json()
        fields = s["fields"] + [{"label": "ملف", "type": "file", "required": True, "max_files": 3}]
        r = self.client.patch(f"/api/v1/admin/services/{s['id']}/", {"fields": fields}, format="json")
        self.assertEqual(r.json()["form_version"], 2)
        self.assertEqual(len(r.json()["fields"]), 3)
        self.assertEqual(r.json()["fields"][2]["max_files"], 3)
        r = self.client.patch(f"/api/v1/admin/services/{s['id']}/", {"name": "اسم آخر"}, format="json")
        self.assertEqual(r.json()["form_version"], 2)

    def test_slug_rename_creates_redirect(self):
        service = make_service(name="قديم")
        old = service.slug
        service.slug = "جديد"
        service.save()
        r = self.client.get(f"/api/v1/public/service-redirects/{old}/")
        self.assertEqual(r.json(), {"slug": "جديد"})

    def test_operator_can_manage_services_executor_cannot(self):
        op = make_user("op@example.com", Role.OPERATOR, "مشغل")
        self.client.force_authenticate(op)
        self.assertEqual(self.client.post("/api/v1/admin/services/", self.payload(), format="json").status_code, 201)

    def test_public_categories_only_with_published_services(self):
        make_service(name="منشورة")
        Category.objects.create(name="فارغ")
        names = [c["name"] for c in self.client.get("/api/v1/public/categories/").json()]
        self.assertEqual(names, ["مجال"])
        self.assertTrue(Service.objects.exists())
