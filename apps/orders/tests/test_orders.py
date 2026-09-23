import uuid
from unittest.mock import patch

from django.core.cache import cache
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.tests.factories import idem, make_service, make_user, order_payload
from apps.core.throttles import ScopedIPThrottle
from apps.orders.models import Order, OrderStatus


class PublicOrderTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service(fields=[
            {"key": "dest", "label": "الوجهة", "type": "text", "required": True},
            {"key": "kind", "label": "النوع", "type": "select", "required": True, "options": ["أ", "ب"]},
            {"key": "tags", "label": "إضافات", "type": "multiselect", "required": False, "options": ["س", "ص"]},
            {"key": "count", "label": "العدد", "type": "number", "required": False},
        ])

    def create(self, key=None, **over):
        payload = order_payload(self.service, answers={"dest": "الخرطوم", "kind": "أ"}, **over)
        headers = {"HTTP_IDEMPOTENCY_KEY": str(key)} if key else idem()
        return self.client.post("/api/v1/public/orders/", payload, format="json", **headers)

    def test_create_order_returns_tracking_code(self):
        r = self.create()
        self.assertEqual(r.status_code, 201, r.content)
        code = r.json()["code"]
        self.assertRegex(code, r"^ARJ-[2-9A-HJ-NP-Z]{8}$")
        order = Order.objects.get(code=code)
        self.assertEqual(order.customer_phone, "+249912345678")
        self.assertEqual(order.status.meaning, "new")
        self.assertEqual(order.service_snapshot["name"], self.service.name)

    def test_invalid_form_creates_nothing(self):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service, answers={"kind": "ج"}),
                             format="json", **idem())
        self.assertEqual(r.status_code, 400)
        errors = r.json()["errors"]["answers"]
        self.assertIn("dest", errors)
        self.assertIn("kind", errors)
        self.assertFalse(Order.objects.exists())

    def test_invalid_phone_and_missing_consent(self):
        r = self.create(customer_phone="0912345678", consent=False)
        self.assertEqual(r.status_code, 400)
        self.assertIn("customer_phone", r.json()["errors"])
        self.assertIn("consent", r.json()["errors"])

    def test_all_errors_reported_in_one_round(self):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service, customer_phone="09", answers={}),
                             format="json", **idem())
        self.assertEqual(r.status_code, 400)
        self.assertIn("customer_phone", r.json()["errors"])
        self.assertIn("dest", r.json()["errors"]["answers"])

    def test_unknown_field_rejected(self):
        r = self.client.post("/api/v1/public/orders/",
                             order_payload(self.service, answers={"dest": "x", "kind": "أ", "evil": "1"}),
                             format="json", **idem())
        self.assertEqual(r.status_code, 400)

    def test_missing_idempotency_key_rejected(self):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service), format="json")
        self.assertEqual(r.status_code, 400)

    def test_retry_with_same_key_returns_same_order(self):
        key = uuid.uuid4()
        first = self.create(key=key)
        second = self.create(key=key)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["code"], second.json()["code"])
        self.assertEqual(Order.objects.count(), 1)

    def test_snapshot_survives_service_edit(self):
        code = self.create().json()["code"]
        self.service.name = "اسم جديد"
        self.service.save()
        self.service.fields.filter(key="dest").update(label="تغيّر")
        order = Order.objects.get(code=code)
        self.assertEqual(order.service_snapshot["name"], "خدمة تجريبية")
        self.assertEqual(order.answers[0]["label"], "الوجهة")
        self.assertEqual(self.client.get(f"/api/v1/public/track/{code}/").json()["service_name"], "خدمة تجريبية")

    def test_hidden_service_blocks_new_orders_but_tracking_works(self):
        code = self.create().json()["code"]
        self.service.status = "hidden"
        self.service.save()
        self.assertEqual(self.create().status_code, 409)
        self.assertEqual(self.client.get(f"/api/v1/public/services/{self.service.slug}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/public/track/{code}/").status_code, 200)

    def test_tracking_exposes_public_data_only(self):
        code = self.create(customer_name="فاطمة الزبونة").json()["code"]
        order = Order.objects.get(code=code)
        admin = make_user()
        self.client.force_authenticate(admin)
        self.client.post(f"/api/v1/admin/orders/{order.pk}/notes/", {"body": "سري للفريق", "visibility": "internal"}, format="json")
        self.client.post(f"/api/v1/admin/orders/{order.pk}/notes/", {"body": "تحديث للعميل", "visibility": "public"}, format="json")
        self.client.post(f"/api/v1/admin/orders/{order.pk}/status/", {"status": "in-progress"}, format="json")
        self.client.force_authenticate(None)
        r = self.client.get(f"/api/v1/public/track/{code.lower()}/")
        self.assertEqual(r.status_code, 200)
        body = r.content.decode()
        for secret in ("فاطمة", "912345678", "الخرطوم", "سري للفريق", "internal"):
            self.assertNotIn(secret, body)
        data = r.json()
        self.assertEqual(data["status"]["label"], "قيد التنفيذ")
        self.assertEqual([t["kind"] for t in data["timeline"]], ["created", "note", "status"])
        self.assertEqual(data["timeline"][1]["text"], "تحديث للعميل")
        self.assertEqual(set(data), {"code", "service_name", "status", "created_at", "updated_at", "timeline"})

    def test_unknown_tracking_code(self):
        self.assertEqual(self.client.get("/api/v1/public/track/ARJ-NOPE1234/").status_code, 404)

    def test_tracking_is_throttled(self):
        rates = {**ScopedIPThrottle.THROTTLE_RATES, "tracking": "3/min"}
        with patch.object(ScopedIPThrottle, "THROTTLE_RATES", rates):
            codes = [self.client.get("/api/v1/public/track/ARJ-AAAAAAAA/").status_code for _ in range(5)]
        self.assertEqual(codes[:3], [404, 404, 404])
        self.assertEqual(codes[-1], 429)


class AdminOrderPermissionTests(APITestCase):
    def setUp(self):
        self.service = make_service()
        self.admin = make_user()
        self.executor = make_user("exec@example.com", Role.EXECUTOR, "منفذ")
        self.other = make_user("other@example.com", Role.EXECUTOR, "منفذ آخر")
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service), format="json", **idem())
        self.order = Order.objects.get(code=r.json()["code"])

    def test_executor_cannot_open_unassigned_order(self):
        self.client.force_authenticate(self.executor)
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/{self.order.pk}/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/admin/orders/").json()["count"], 0)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/status/", {"status": "completed"}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_executor_sees_and_updates_assigned_order_only(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/assign/", {"assignee": self.executor.pk}, format="json")
        self.assertEqual(r.status_code, 200)
        self.client.force_authenticate(self.executor)
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/{self.order.pk}/").status_code, 200)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/status/", {"status": "completed"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"]["meaning"], "completed")
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/assign/", {"assignee": self.other.pk}, format="json")
        self.assertEqual(r.status_code, 403)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/{self.order.pk}/").status_code, 404)

    def test_executor_cannot_manage_services_or_inquiries(self):
        self.client.force_authenticate(self.executor)
        self.assertEqual(self.client.get("/api/v1/admin/services/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/admin/inquiries/").status_code, 403)
        self.assertEqual(self.client.get("/api/v1/admin/team/").status_code, 403)

    def test_status_change_is_logged_with_actor(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/status/",
                             {"status": "waiting-customer", "public_note": "نحتاج صورة الهوية"}, format="json")
        self.assertEqual(r.status_code, 200)
        events = r.json()["events"]
        self.assertEqual([e["kind"] for e in events], ["created", "status_changed", "note_added"])
        self.assertEqual(events[1]["actor"]["id"], self.admin.pk)
        self.assertEqual(events[1]["data"]["to"], "بانتظار العميل")

    def test_admin_filters(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/v1/admin/orders/?q=912345").json()["count"], 1)
        self.assertEqual(self.client.get(f"/api/v1/admin/orders/?q={self.order.code}").json()["count"], 1)
        self.assertEqual(self.client.get("/api/v1/admin/orders/?status=completed").json()["count"], 0)
        self.assertEqual(self.client.get("/api/v1/admin/orders/?assignee=none").json()["count"], 1)
        self.assertEqual(self.client.get("/api/v1/admin/orders/detail/").status_code, 404)

    def test_used_status_cannot_be_deleted(self):
        self.client.force_authenticate(self.admin)
        new = OrderStatus.objects.get(key="new")
        self.assertEqual(self.client.delete(f"/api/v1/admin/statuses/{new.pk}/").status_code, 409)
        unused = OrderStatus.objects.get(key="failed")
        self.assertEqual(self.client.delete(f"/api/v1/admin/statuses/{unused.pk}/").status_code, 204)

    def test_service_with_orders_cannot_be_deleted(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/v1/admin/services/{self.service.pk}/").status_code, 409)
