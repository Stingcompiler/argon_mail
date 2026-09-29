"""Prices and payments are for admins and operators; executors neither change
nor see them (review L1, docs/review-and-plan.md)."""
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.core.tests.factories import idem, make_service, make_user, order_payload
from apps.orders import services
from apps.orders.models import Order, PaymentEntry
from apps.media_library.models import PrivateFile

PDF = b"%PDF-1.4\n" + b"0" * 200


class MoneyVisibilityTests(APITestCase):
    def setUp(self):
        self.admin = make_user()
        self.operator = make_user("op@example.com", Role.OPERATOR, "مشغل")
        self.executor = make_user("exec@example.com", Role.EXECUTOR, "منفذ")
        r = self.client.post("/api/v1/public/orders/", order_payload(make_service()), format="json", **idem())
        self.order = Order.objects.get(code=r.json()["code"])
        services.assign(self.order, self.executor, self.admin)
        services.create_quote(self.order, self.admin, "15000", "SDG", "مراجعة")
        services.record_payment(self.order, self.admin, amount="5000", currency="SDG",
                                method=PaymentEntry._meta.get_field("method").choices[0][0])
        self.client.force_authenticate(self.admin)
        up = SimpleUploadedFile("proof.pdf", PDF, content_type="application/pdf")
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/attachments/", {"kind": "payment_proof", "file": up})
        self.assertEqual(r.status_code, 200)
        self.proof = PrivateFile.objects.get(order=self.order, kind=PrivateFile.Kind.PAYMENT_PROOF)

    def detail(self, user):
        self.client.force_authenticate(user)
        r = self.client.get(f"/api/v1/admin/orders/{self.order.pk}/")
        self.assertEqual(r.status_code, 200)
        return r.json()

    def test_admin_and_operator_see_money(self):
        for user in (self.admin, self.operator):
            d = self.detail(user)
            self.assertEqual(len(d["quotes"]), 1)
            self.assertEqual(len(d["payments"]), 1)
            self.assertIn("payment_status", d)
            self.assertTrue(any(a["kind"] == "payment_proof" for a in d["attachments"]))

    def test_executor_sees_no_money(self):
        d = self.detail(self.executor)
        for key in ("quotes", "payments", "payment_status", "payment_status_label"):
            self.assertNotIn(key, d)
        kinds = {e["kind"] for e in d["events"]}
        self.assertFalse(kinds & {"quote_created", "quote_decided", "payment_status", "payment_recorded"})
        self.assertFalse(any(a["kind"] == "payment_proof" for a in d["attachments"]))
        # not in the list either
        row = self.client.get("/api/v1/admin/orders/").json()["results"][0]
        self.assertNotIn("payment_status", row)

    def test_executor_cannot_get_a_payment_proof_link(self):
        self.client.force_authenticate(self.executor)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/attachments/{self.proof.pk}/link/")
        self.assertEqual(r.status_code, 404)
        self.client.force_authenticate(self.admin)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/attachments/{self.proof.pk}/link/")
        self.assertEqual(r.status_code, 200)

    def test_executor_actions_still_return_the_filtered_detail(self):
        self.client.force_authenticate(self.executor)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/notes/", {"body": "تم", "visibility": "internal"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("quotes", r.json())
