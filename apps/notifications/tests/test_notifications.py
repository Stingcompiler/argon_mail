import uuid
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.content.models import SiteSettings
from apps.core.tests.factories import make_service, make_user, order_payload
from apps.notifications.models import MAX_ATTEMPTS, Notification
from apps.notifications.services import deliver_due
from apps.orders.models import Order


def set_recipients(value="ops@example.com, owner@example.com", orders=True, messages=True):
    s = SiteSettings.load()
    s.notify_emails, s.notify_orders, s.notify_messages = value, orders, messages
    s.save()


class NotificationTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.service = make_service()
        set_recipients()

    def create_order(self, **over):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service, **over), format="json",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 201, r.content)
        return Order.objects.get(code=r.json()["code"])

    def test_order_queues_minimal_alert_atomically(self):
        order = self.create_order(customer_name="فاطمة الزبونة")
        n = Notification.objects.get(order=order)
        self.assertEqual(n.status, "pending")
        self.assertEqual(n.recipients, ["ops@example.com", "owner@example.com"])
        self.assertIn(order.code, n.subject)
        self.assertIn(f"/admin/orders?open={order.pk}", n.body)
        for private in ("فاطمة", "912345678", "الخرطوم"):
            self.assertNotIn(private, n.subject + n.body)
        self.assertEqual(len(mail.outbox), 0)  # nothing sent inside the request

    def test_worker_sends_and_records_attempt(self):
        order = self.create_order()
        self.assertEqual(deliver_due(), 1)
        n = Notification.objects.get(order=order)
        self.assertEqual((n.status, n.attempts), ("sent", 1))
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ops@example.com", "owner@example.com"])
        self.assertTrue(n.delivery_attempts.get().success)
        self.assertEqual(deliver_due(), 0)  # never sent twice

    def test_mail_failure_keeps_order_and_retries_with_backoff(self):
        order = self.create_order()
        with patch("apps.notifications.services.EmailMessage.send", side_effect=OSError("smtp down")):
            deliver_due()
        n = Notification.objects.get(order=order)
        self.assertEqual(n.status, "pending")
        self.assertIn("smtp down", n.last_error)
        self.assertGreater(n.next_attempt_at, timezone.now() + timedelta(seconds=50))
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())
        self.assertEqual(deliver_due(), 0)  # not due yet
        Notification.objects.filter(pk=n.pk).update(next_attempt_at=timezone.now())
        self.assertEqual(deliver_due(), 1)
        n.refresh_from_db()
        self.assertEqual(n.status, "sent")
        self.assertEqual(n.delivery_attempts.count(), 2)

    def test_gives_up_after_max_attempts_then_manual_resend(self):
        order = self.create_order()
        with patch("apps.notifications.services.EmailMessage.send", side_effect=OSError("down")):
            for _ in range(MAX_ATTEMPTS):
                Notification.objects.update(next_attempt_at=timezone.now())
                deliver_due()
        n = Notification.objects.get(order=order)
        self.assertEqual((n.status, n.attempts), ("failed", MAX_ATTEMPTS))
        Notification.objects.update(next_attempt_at=timezone.now())
        self.assertEqual(deliver_due(), 0)  # failed rows wait for a human
        admin = make_user()
        self.client.force_authenticate(admin)
        r = self.client.post(f"/api/v1/admin/notifications/{n.pk}/resend/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["sent_now"])
        self.assertEqual(r.json()["status"], "sent")
        self.assertEqual(r.json()["delivery_attempts"][-1]["triggered_by"]["id"], admin.pk)

    def test_expired_lease_is_reclaimed(self):
        order = self.create_order()
        Notification.objects.filter(order=order).update(status="sending", locked_until=timezone.now() - timedelta(minutes=1))
        self.assertEqual(deliver_due(), 1)
        self.assertEqual(Notification.objects.get(order=order).status, "sent")

    def test_active_lease_is_not_taken(self):
        order = self.create_order()
        Notification.objects.filter(order=order).update(status="sending", locked_until=timezone.now() + timedelta(minutes=5))
        self.assertEqual(deliver_due(), 0)

    def test_no_recipient_is_recorded_as_skipped(self):
        set_recipients("")
        order = self.create_order()
        n = Notification.objects.get(order=order)
        self.assertEqual(n.status, "skipped")
        self.assertIn("بريد مستلم", n.last_error)

    def test_disabled_toggle_creates_nothing(self):
        set_recipients(orders=False)
        self.create_order()
        self.assertFalse(Notification.objects.exists())

    def test_idempotent_retry_does_not_duplicate_alert(self):
        key = str(uuid.uuid4())
        for _ in range(2):
            self.client.post("/api/v1/public/orders/", order_payload(self.service), format="json", HTTP_IDEMPOTENCY_KEY=key)
        self.assertEqual(Notification.objects.count(), 1)

    def test_inquiry_alert_has_no_message_text(self):
        r = self.client.post("/api/v1/public/inquiries/", {"name": "زائر", "phone": "+249911111111", "subject": "موضوع سري",
                             "body": "نص خاص"}, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        n = Notification.objects.get(inquiry_id=r.json()["id"])
        self.assertNotIn("سري", n.subject + n.body)
        self.assertNotIn("نص خاص", n.body)

    def test_failed_order_validation_creates_no_alert(self):
        r = self.client.post("/api/v1/public/orders/", order_payload(self.service, answers={}), format="json",
                             HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
        self.assertEqual(r.status_code, 400)
        self.assertFalse(Notification.objects.exists())

    def test_worker_command_single_run(self):
        self.create_order()
        call_command("send_notifications")
        self.assertEqual(len(mail.outbox), 1)

    def test_admin_api_permissions_and_summary(self):
        self.create_order()
        self.client.force_authenticate(make_user("x@example.com", Role.EXECUTOR, "منفذ"))
        self.assertEqual(self.client.get("/api/v1/admin/notifications/").status_code, 403)
        self.client.force_authenticate(make_user())
        r = self.client.get("/api/v1/admin/notifications/summary/")
        self.assertEqual(r.json()["by_status"], {"pending": 1})

    def test_recipients_validated_and_hidden_publicly(self):
        self.client.force_authenticate(make_user())
        r = self.client.patch("/api/v1/admin/settings/", {"notify_emails": "a@example.com, not-an-email"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.patch("/api/v1/admin/settings/", {"notify_emails": " A@Example.com ,b@example.com"}, format="json")
        self.assertEqual(r.json()["notify_emails"], "a@example.com, b@example.com")
        self.client.force_authenticate(None)
        self.assertNotIn("notify_emails", self.client.get("/api/v1/public/site/").json()["settings"])
