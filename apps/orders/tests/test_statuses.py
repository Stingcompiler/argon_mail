from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.tests.factories import make_user
from apps.orders.models import OrderStatus


class StatusManagementTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(make_user())

    def test_create_generates_key_and_appends(self):
        r = self.client.post("/api/v1/admin/statuses/", {"label": "بانتظار الشحن", "meaning": "in_progress"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertRegex(r.json()["key"], r"^in-progress-[0-9a-f]{6}$")
        self.assertEqual(r.json()["sort_order"], OrderStatus.objects.order_by("-sort_order").first().sort_order)

    def test_label_rules_and_key_immutable(self):
        self.assertEqual(self.client.post("/api/v1/admin/statuses/", {"label": "  ", "meaning": "new"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/admin/statuses/", {"label": "جديد", "meaning": "new"}, format="json").status_code, 400)
        s = OrderStatus.objects.get(key="ready")
        r = self.client.patch(f"/api/v1/admin/statuses/{s.pk}/", {"label": "جاهز للاستلام", "key": "other"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f"/api/v1/admin/statuses/{s.pk}/", {"label": "جاهز للاستلام"}, format="json")
        self.assertEqual(r.json()["label"], "جاهز للاستلام")

    def test_initial_status_cannot_be_deactivated(self):
        s = OrderStatus.objects.get(is_initial=True)
        r = self.client.patch(f"/api/v1/admin/statuses/{s.pk}/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_operator_reads_but_cannot_change(self):
        self.client.force_authenticate(make_user("op@example.com", Role.OPERATOR, "مشغل"))
        self.assertEqual(self.client.get("/api/v1/admin/statuses/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/admin/statuses/", {"label": "س", "meaning": "new"}, format="json").status_code, 403)


class AggregateOrderingTests(StatusManagementTests):
    """Meta.ordering is ignored in aggregate queries; lists must still be ordered."""

    def test_status_list_follows_sort_order(self):
        from apps.orders.models import OrderStatus

        first = OrderStatus.objects.order_by("sort_order").first()
        first.sort_order = 99
        first.save()
        keys = [s["key"] for s in self.client.get("/api/v1/admin/statuses/").json()]
        self.assertEqual(keys, list(OrderStatus.objects.order_by("sort_order", "id").values_list("key", flat=True)))
        self.assertEqual(keys[-1], first.key)

    def test_service_and_category_lists_follow_sort_order(self):
        from apps.catalog.models import Category, Service

        a = Category.objects.create(name="ب", sort_order=2)
        b = Category.objects.create(name="أ", sort_order=1)
        Service.objects.create(category=a, name="خدمة 2", description="و", sort_order=2)
        Service.objects.create(category=b, name="خدمة 1", description="و", sort_order=1)
        cats = [c["name"] for c in self.client.get("/api/v1/admin/categories/").json()]
        self.assertEqual(cats, ["أ", "ب"])
        names = [s["name"] for s in self.client.get("/api/v1/admin/services/").json()]
        self.assertEqual(names, ["خدمة 1", "خدمة 2"])
