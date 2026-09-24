"""Queueing and delivery of admin alerts.

queue_* are called inside the save transaction (outbox). deliver_due() is
called by the worker (`manage.py send_notifications --loop`); it claims rows
with SELECT ... FOR UPDATE SKIP LOCKED plus a lease, so several workers or a
restart never send the same alert twice at the same time."""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import translation
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.content.models import SiteSettings

from .models import BACKOFF, LEASE, MAX_ATTEMPTS, DeliveryAttempt, Notification

log = logging.getLogger(__name__)


def _recipients(s: SiteSettings) -> list[str]:
    configured = [e.strip().lower() for e in (s.notify_emails or "").split(",") if e.strip()]
    return configured or [e.strip().lower() for e in settings.DEFAULT_ALERT_EMAILS if e.strip()]


def _one_line(text: str, limit: int = 150) -> str:
    """Subjects must be a single line (header injection) and short."""
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _render(template: str, context: dict) -> str:
    s = SiteSettings.load()
    with translation.override("ar"):
        return render_to_string(template, {"site_name": s.name, "tagline": s.tagline, **context})


def _queue(kind, dedupe_key, subject, body, enabled, html_body="", **refs):
    s = SiteSettings.load()
    if not enabled(s):
        return None
    recipients = _recipients(s)
    status = Notification.Status.PENDING if recipients else Notification.Status.SKIPPED
    obj, _ = Notification.objects.get_or_create(
        dedupe_key=dedupe_key,
        defaults=dict(kind=kind, recipients=recipients, subject=_one_line(subject), body=body, html_body=html_body, status=status,
                      last_error="" if recipients else "لم يُضبط بريد مستلم للتنبيهات في الإعدادات.", **refs),
    )
    return obj


def queue_new_order(order, attachments: int = 0):
    # Order alerts stay minimal: no phone, answers or files in the mail.
    link = f"{settings.SITE_URL}/admin/orders?open={order.pk}"
    subject = f"طلب جديد {order.code} — {order.service_name}"
    body = (
        f"وصل طلب جديد.\n\n"
        f"رقم الطلب: {order.code}\nالخدمة: {order.service_name}\nالمرفقات: {attachments}\n\n"
        f"افتح الطلب في لوحة التحكم:\n{link}\n\n"
        f"تنبيه آلي. بيانات العميل وإجاباته ومرفقاته في لوحة التحكم."
    )
    html = _render("notifications/order.html", {
        "subject": subject, "preheader": f"{order.service_name} — {order.code}", "badge": "طلب جديد",
        "heading": f"طلب جديد: {order.service_name}", "received_at": order.created_at, "order": order,
        "attachments": attachments, "link": link, "cta": "فتح الطلب في لوحة التحكم",
    })
    return _queue(Notification.Kind.NEW_ORDER, f"order:{order.pk}:new", subject, body,
                  lambda s: s.notify_orders, html_body=html, order=order)


def queue_new_inquiry(inquiry):
    """The owner chose to receive the full message (name, phone, subject,
    text) by e-mail so it can be answered without opening the dashboard."""
    from apps.core.phone import whatsapp_link

    link = f"{settings.SITE_URL}/admin/messages?open={inquiry.pk}"
    subject = f"رسالة جديدة: {inquiry.subject}"
    body = (
        f"وصلت رسالة جديدة من نموذج التواصل.\n\n"
        f"الاسم: {inquiry.name}\nWhatsApp: {inquiry.phone}\nالموضوع: {inquiry.subject}\n\n"
        f"الرسالة:\n{inquiry.body}\n\n"
        f"الرد عبر WhatsApp: {whatsapp_link(inquiry.phone, f'مرحبًا {inquiry.name}، بخصوص رسالتك: {inquiry.subject}')}\n"
        f"فتح الرسالة في لوحة التحكم: {link}\n"
    )
    html = _render("notifications/inquiry.html", {
        "subject": subject, "preheader": _one_line(f"{inquiry.name}: {inquiry.body}", 120), "badge": "رسالة جديدة",
        "heading": inquiry.subject, "received_at": inquiry.created_at, "inquiry": inquiry, "link": link,
        "cta": "فتح الرسالة في لوحة التحكم",
        "whatsapp_url": whatsapp_link(inquiry.phone, f"مرحبًا {inquiry.name}، بخصوص رسالتك إلى بريد عرجون: {inquiry.subject}"),
    })
    return _queue(Notification.Kind.NEW_INQUIRY, f"inquiry:{inquiry.pk}:new", subject, body,
                  lambda s: s.notify_messages, html_body=html, inquiry=inquiry)


def _claim(limit):
    now = timezone.now()
    with transaction.atomic():
        rows = list(
            Notification.objects.select_for_update(skip_locked=True)
            .filter(Q(status=Notification.Status.PENDING, next_attempt_at__lte=now)
                    | Q(status=Notification.Status.SENDING, locked_until__lt=now))  # lease expired: worker died
            .order_by("next_attempt_at")[:limit]
        )
        for n in rows:
            n.status = Notification.Status.SENDING
            n.locked_until = now + LEASE
            n.save(update_fields=["status", "locked_until"])
    return rows


def send_one(n: Notification, user=None) -> bool:
    started = timezone.now()
    error = ""
    try:
        if not n.recipients:
            raise ValueError("لا يوجد بريد مستلم.")
        msg = EmailMultiAlternatives(n.subject, n.body, settings.DEFAULT_FROM_EMAIL, n.recipients)
        if n.html_body:
            msg.attach_alternative(n.html_body, "text/html")
        msg.send(fail_silently=False)
        ok = True
    except Exception as exc:  # any SMTP/network error is recorded, never raised
        ok = False
        error = f"{type(exc).__name__}: {exc}"[:500]
        log.warning("notification %s failed: %s", n.pk, error)
    finished = timezone.now()
    DeliveryAttempt.objects.create(notification=n, started_at=started, finished_at=finished, success=ok,
                                   error=error, triggered_by=user)
    n.attempts += 1
    n.locked_until = None
    if ok:
        n.status, n.sent_at, n.last_error = Notification.Status.SENT, finished, ""
    elif n.attempts >= MAX_ATTEMPTS:
        n.status, n.last_error = Notification.Status.FAILED, error
        # ERROR level reaches Sentry (when configured) so someone is told.
        log.error("notification %s gave up after %s attempts: %s", n.pk, n.attempts, error)
    else:
        n.status, n.last_error = Notification.Status.PENDING, error
        n.next_attempt_at = finished + BACKOFF[min(n.attempts - 1, len(BACKOFF) - 1)]
    n.save()
    return ok


def deliver_due(limit=20) -> int:
    rows = _claim(limit)
    for n in rows:
        send_one(n)
    return len(rows)


def resend(n: Notification, user):
    """Manual resend from the dashboard. Uses the current recipients."""
    with transaction.atomic():
        n = Notification.objects.select_for_update().get(pk=n.pk)
        if n.status == Notification.Status.SENDING and n.locked_until and n.locked_until > timezone.now():
            return n, None
        n.recipients = _recipients(SiteSettings.load())
        n.status = Notification.Status.SENDING
        n.locked_until = timezone.now() + LEASE
        n.save()
    ok = send_one(n, user)
    return n, ok
