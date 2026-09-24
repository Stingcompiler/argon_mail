import json
import time
import uuid
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.catalog.models import ServiceField
from apps.content.models import SiteSettings
from apps.core.tests.factories import make_service, make_user
from apps.media_library import signing as file_signing
from apps.media_library.models import PrivateFile
from apps.orders.models import Order, PaymentStatus

PDF = b"%PDF-1.4\n%test\n" + b"0" * 200
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 200
EXE = b"MZ\x90\x00" + b"0" * 200


def upload(name, content, ctype="application/pdf"):
    return SimpleUploadedFile(name, content, content_type=ctype)


def private_files():
    root = Path(settings.PRIVATE_ROOT)
    return sorted(p for p in root.rglob("*") if p.is_file()) if root.exists() else []


class OrderUploadTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service(fields=[
            {"key": "dest", "label": "الوجهة", "type": "text", "required": True},
            {"key": "docs", "label": "المستندات", "type": "file", "required": True, "max_files": 2},
            {"key": "photo", "label": "الصورة الشخصية", "type": "image", "required": False},
        ])

    def post(self, files, key=None, **over):
        payload = {"service": self.service.slug, "customer_name": "عميل", "customer_phone": "+249912345678",
                   "answers": {"dest": "الخرطوم"}, "details": "", "consent": True, **over}
        data = {"payload": json.dumps(payload)}
        data.update(files)
        return self.client.post("/api/v1/public/orders/", data, format="multipart",
                                HTTP_IDEMPOTENCY_KEY=str(key or uuid.uuid4()))

    def test_valid_files_stored_privately_and_linked(self):
        before = len(private_files())
        r = self.post({"file.docs": [upload("شهادة.pdf", PDF), upload("هوية.png", PNG, "image/png")],
                       "file.photo": upload("me.png", PNG, "image/png")})
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get(code=r.json()["code"])
        files = list(order.attachments.all())
        self.assertEqual(len(files), 3)
        self.assertEqual({f.content_type for f in files}, {"application/pdf", "image/png"})
        self.assertEqual(len(private_files()), before + 3)
        for f in files:
            path = Path(settings.PRIVATE_ROOT) / f.path
            self.assertTrue(path.exists())
            self.assertNotIn(f.original_name, f.path)  # random stored name
            self.assertEqual(oct(path.stat().st_mode & 0o777), "0o600")
        answer = next(a for a in order.answers if a["key"] == "docs")
        self.assertEqual(answer["value"], ["شهادة.pdf", "هوية.png"])

    def test_disguised_executable_rejected(self):
        r = self.post({"file.docs": upload("invoice.pdf", EXE)})
        self.assertEqual(r.status_code, 400)
        self.assertIn("docs", r.json()["errors"]["answers"])
        self.assertFalse(Order.objects.exists())

    def test_extension_must_match_content(self):
        r = self.post({"file.docs": upload("scan.pdf", PNG, "image/png")})
        self.assertEqual(r.status_code, 400)

    def test_image_field_rejects_pdf(self):
        r = self.post({"file.docs": upload("a.pdf", PDF), "file.photo": upload("b.pdf", PDF)})
        self.assertEqual(r.status_code, 400)
        self.assertIn("photo", r.json()["errors"]["answers"])

    def test_required_file_and_field_max(self):
        r = self.post({})
        self.assertIn("docs", r.json()["errors"]["answers"])
        r = self.post({"file.docs": [upload("1.pdf", PDF), upload("2.pdf", PDF), upload("3.pdf", PDF)]})
        self.assertEqual(r.status_code, 400)
        self.assertIn("docs", r.json()["errors"]["answers"])

    def test_owner_limits_applied(self):
        s = SiteSettings.load()
        s.max_file_mb = 1
        s.save()
        big = upload("big.pdf", PDF + b"0" * (1024 * 1024))
        r = self.post({"file.docs": big})
        self.assertEqual(r.status_code, 400)
        self.assertIn("الحد المسموح", json.dumps(r.json(), ensure_ascii=False))

    def test_oversized_request_rejected_before_parsing(self):
        payload = json.dumps({"service": self.service.slug})
        r = self.client.post("/api/v1/public/orders/", {"payload": payload}, format="multipart",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()), CONTENT_LENGTH=str(500 * 1024 * 1024))
        self.assertEqual(r.status_code, 413)

    def test_failed_validation_leaves_no_files(self):
        before = private_files()
        r = self.post({"file.docs": upload("ok.pdf", PDF)}, customer_phone="0912")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(private_files(), before)

    def test_db_failure_removes_written_files(self):
        before = private_files()
        with patch("apps.orders.services.PrivateFile.objects.create", side_effect=RuntimeError("db down")):
            with self.assertRaises(RuntimeError):
                self.post({"file.docs": upload("ok.pdf", PDF)})
        self.assertEqual(private_files(), before)
        self.assertFalse(Order.objects.exists())

    def test_retry_does_not_duplicate_files(self):
        key = uuid.uuid4()
        a = self.post({"file.docs": upload("a.pdf", PDF)}, key=key)
        b = self.post({"file.docs": upload("a.pdf", PDF)}, key=key)
        self.assertEqual((a.status_code, b.status_code), (201, 200))
        self.assertEqual(PrivateFile.objects.count(), 1)

    @override_settings(STORAGE_QUOTA_BYTES=100)
    def test_full_storage_rejected_clearly(self):
        r = self.post({"file.docs": upload("a.pdf", PDF)})
        self.assertEqual(r.status_code, 400)
        self.assertIn("مساحة التخزين", json.dumps(r.json(), ensure_ascii=False))
        self.assertFalse(Order.objects.exists())

    def test_json_orders_still_work_for_services_without_files(self):
        s = make_service(name="بلا ملفات")
        r = self.client.post("/api/v1/public/orders/", {
            "service": s.slug, "customer_name": "عميل", "customer_phone": "+249912345678",
            "answers": {"dest": "x"}, "consent": True}, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 201)

    def test_tracking_never_exposes_attachments(self):
        code = self.post({"file.docs": upload("سري.pdf", PDF)}).json()["code"]
        body = self.client.get(f"/api/v1/public/track/{code}/").content.decode()
        self.assertNotIn("سري", body)
        self.assertNotIn("attachments", body)


class DownloadTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.executor = make_user("e@example.com", Role.EXECUTOR, "منفذ")
        service = make_service(fields=[{"key": "docs", "label": "مستند", "type": "file", "required": True}])
        payload = {"service": service.slug, "customer_name": "عميل", "customer_phone": "+249912345678",
                   "answers": {}, "consent": True}
        r = self.client.post("/api/v1/public/orders/", {"payload": json.dumps(payload), "file.docs": upload("a.pdf", PDF)},
                             format="multipart", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.order = Order.objects.get(code=r.json()["code"])
        self.file = self.order.attachments.get()

    def link(self, user):
        self.client.force_authenticate(user)
        r = self.client.post(f"/api/v1/admin/orders/{self.order.pk}/attachments/{self.file.pk}/link/")
        self.client.force_authenticate(None)
        return r

    def test_admin_gets_short_link_and_downloads(self):
        r = self.link(self.admin)
        self.assertEqual(r.status_code, 200)
        d = self.client.get(r.json()["url"])
        self.assertEqual(d.status_code, 200)
        self.assertEqual(b"".join(d.streaming_content), PDF)
        self.assertIn("attachment", d["Content-Disposition"])
        self.assertEqual(d["Cache-Control"], "private, no-store")
        self.assertIn("sandbox", d["Content-Security-Policy"])

    def test_no_or_forged_token_rejected(self):
        self.assertEqual(self.client.get("/api/v1/files/download/").status_code, 403)
        forged = file_signing.make_token(self.file.pk, self.admin.pk)[:-2] + "xx"
        self.assertEqual(self.client.get(f"/api/v1/files/download/?t={forged}").status_code, 403)

    def test_expired_token_rejected(self):
        token = file_signing.make_token(self.file.pk, self.admin.pk)
        with patch("django.core.signing.time.time", return_value=time.time() + file_signing.MAX_AGE + 5):
            self.assertEqual(self.client.get(f"/api/v1/files/download/?t={token}").status_code, 403)

    def test_unassigned_executor_cannot_get_or_use_link(self):
        self.assertEqual(self.link(self.executor).status_code, 404)
        token = file_signing.make_token(self.file.pk, self.executor.pk)
        self.assertEqual(self.client.get(f"/api/v1/files/download/?t={token}").status_code, 403)

    def test_link_dies_when_user_deactivated_or_unassigned(self):
        self.order.assignee = self.executor
        self.order.save()
        url = self.link(self.executor).json()["url"]
        self.order.assignee = None
        self.order.save()
        self.assertEqual(self.client.get(url).status_code, 403)
        url = self.link(self.admin).json()["url"]
        self.admin.is_active = False
        self.admin.save()
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_private_root_is_not_under_media(self):
        self.assertNotIn(Path(settings.MEDIA_ROOT), Path(settings.PRIVATE_ROOT).parents)
        self.assertNotEqual(Path(settings.MEDIA_ROOT), Path(settings.PRIVATE_ROOT))


class MoneyTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user()
        self.executor = make_user("e@example.com", Role.EXECUTOR, "منفذ")
        service = make_service()
        r = self.client.post("/api/v1/public/orders/", {
            "service": service.slug, "customer_name": "عميل", "customer_phone": "+249912345678",
            "answers": {"dest": "x"}, "consent": True}, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.order = Order.objects.get(code=r.json()["code"])
        self.url = f"/api/v1/admin/orders/{self.order.pk}"
        self.client.force_authenticate(self.admin)

    def test_quotes_are_versioned_and_superseded(self):
        self.client.post(f"{self.url}/quotes/", {"amount": "15000", "currency": "SDG"}, format="json")
        r = self.client.post(f"{self.url}/quotes/", {"amount": "12000.50", "currency": "SDG", "note": "خصم"}, format="json")
        quotes = r.json()["quotes"]
        self.assertEqual([(q["version"], q["status"]) for q in quotes], [(1, "superseded"), (2, "pending")])
        q2 = quotes[1]["id"]
        r = self.client.post(f"{self.url}/quotes/{q2}/decision/", {"decision": "accepted", "note": "وافق عبر WhatsApp"}, format="json")
        self.assertEqual(r.json()["quotes"][1]["status"], "accepted")
        self.assertEqual(r.json()["quotes"][1]["decided_by"]["id"], self.admin.pk)
        r = self.client.post(f"{self.url}/quotes/{q2}/decision/", {"decision": "rejected"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_payment_proof_does_not_mark_paid(self):
        self.client.post(f"{self.url}/payment-status/", {"payment_status": "awaiting"}, format="json")
        r = self.client.post(f"{self.url}/attachments/", {"file": upload("receipt.pdf", PDF), "kind": "payment_proof"}, format="multipart")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["payment_status"], PaymentStatus.AWAITING)
        self.assertEqual(r.json()["attachments"][0]["kind"], "payment_proof")
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.AWAITING)

    def test_record_payment_and_status_logged(self):
        r = self.client.post(f"{self.url}/payments/", {"amount": "5000", "currency": "SDG", "method": "bank_transfer", "reference": "TX-1"}, format="json")
        self.assertEqual(r.json()["payments"][0]["method_label"], "تحويل بنكي")
        r = self.client.post(f"{self.url}/payment-status/", {"payment_status": "paid", "note": "تأكد التحويل"}, format="json")
        self.assertEqual(r.json()["payment_status_label"], "مدفوع")
        kinds = [e["kind"] for e in r.json()["events"]]
        self.assertIn("payment_recorded", kinds)
        self.assertIn("payment_status", kinds)

    def test_invalid_amount_and_currency(self):
        r = self.client.post(f"{self.url}/quotes/", {"amount": "-1", "currency": "EUR"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("amount", r.json()["errors"])
        self.assertIn("currency", r.json()["errors"])

    def test_executor_cannot_change_money_but_can_add_document(self):
        self.order.assignee = self.executor
        self.order.save()
        self.client.force_authenticate(self.executor)
        self.assertEqual(self.client.post(f"{self.url}/quotes/", {"amount": "1", "currency": "SDG"}, format="json").status_code, 403)
        self.assertEqual(self.client.post(f"{self.url}/payment-status/", {"payment_status": "paid"}, format="json").status_code, 403)
        r = self.client.post(f"{self.url}/attachments/", {"file": upload("p.pdf", PDF), "kind": "payment_proof"}, format="multipart")
        self.assertEqual(r.status_code, 403)
        r = self.client.post(f"{self.url}/attachments/", {"file": upload("doc.pdf", PDF)}, format="multipart")
        self.assertEqual(r.status_code, 200)

    def test_staff_upload_rejects_bad_type(self):
        r = self.client.post(f"{self.url}/attachments/", {"file": upload("x.pdf", EXE)}, format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("file", r.json()["errors"])

    def test_storage_endpoint(self):
        r = self.client.get("/api/v1/admin/storage/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("quota", r.json())
