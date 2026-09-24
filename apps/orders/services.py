"""Order business rules. Views stay thin; everything that changes an order
goes through these functions so the event log is always written."""
import datetime as dt
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Service
from apps.content.models import upload_limits
from apps.media_library.models import PrivateFile
from apps.media_library.storage import ensure_capacity, remove, store
from apps.media_library.validation import clean_name, validate_upload
from apps.notifications.services import queue_new_order

from .models import Order, OrderEvent, OrderNote, OrderStatus, PaymentEntry, PaymentStatus, Quote, generate_tracking_code


def service_snapshot(service: Service) -> dict:
    return {
        "id": service.pk,
        "name": service.name,
        "slug": service.slug,
        "category": service.category.name,
        "price_label": service.price_label,
        "duration_text": service.duration_text,
        "fields": [f.as_snapshot() for f in service.fields.all()],
    }


FILE_TYPES = ("file", "image")


def validate_answers(fields: list[dict], raw: dict, files: dict | None = None) -> list[dict]:
    """`files` maps a file field key to its uploads. Upload content is
    checked separately (validate_files); here only presence and count."""
    if not isinstance(raw, dict):
        raise ValidationError({"answers": ["صيغة الإجابات غير صحيحة."]})
    files = files or {}
    errors, answers = {}, []
    for f in fields:
        key, value = f["key"], raw.get(f["key"])
        if f["type"] in FILE_TYPES:
            uploads = files.get(key, [])
            if f["required"] and not uploads:
                errors[key] = ["أرفق ملفًا واحدًا على الأقل."]
            elif len(uploads) > f.get("max_files", 1):
                errors[key] = [f"الحد الأقصى {f.get('max_files', 1)} ملفات لهذا الحقل."]
            answers.append({"key": key, "label": f["label"], "type": f["type"],
                            "value": [clean_name(u.name) for u in uploads]})
            continue
        if f["type"] == "multiselect":
            value = value if isinstance(value, list) else ([] if value in (None, "") else [value])
            value = [str(v).strip() for v in value if str(v).strip()]
            empty = not value
        else:
            value = "" if value is None else str(value).strip()
            empty = value == ""
        if empty:
            if f["required"]:
                errors[key] = ["هذا الحقل مطلوب."]
            answers.append({"key": key, "label": f["label"], "type": f["type"], "value": [] if f["type"] == "multiselect" else ""})
            continue
        t = f["type"]
        if t in ("text", "textarea", "address") and len(value) > f.get("max_length", 1000):
            errors[key] = [f"الحد الأقصى {f.get('max_length', 1000)} حرف."]
        elif t == "number":
            try:
                Decimal(value)
            except InvalidOperation:
                errors[key] = ["أدخل رقمًا صحيحًا."]
        elif t == "date":
            try:
                dt.date.fromisoformat(value)
            except ValueError:
                errors[key] = ["أدخل تاريخًا صحيحًا."]
        elif t == "select" and value not in f["options"]:
            errors[key] = ["اختر قيمة من القائمة."]
        elif t == "multiselect" and not set(value) <= set(f["options"]):
            errors[key] = ["اختر قيمًا من القائمة."]
        answers.append({"key": key, "label": f["label"], "type": t, "value": value})
    file_keys = {f["key"] for f in fields if f["type"] in FILE_TYPES}
    value_keys = {f["key"] for f in fields} - file_keys
    unknown = (set(raw) - value_keys) | (set(files) - file_keys)
    if unknown:
        errors["answers"] = ["توجد حقول غير معروفة في الطلب."]
    if errors:
        raise ValidationError({"answers": errors})
    return answers


def initial_status() -> OrderStatus:
    status = OrderStatus.objects.filter(is_initial=True).first()
    if status is None:
        raise RuntimeError("No initial order status configured.")
    return status


def validate_files(fields: list[dict], files: dict) -> list[tuple]:
    """Checks type, size, count, total and disk capacity for every upload.
    Returns [(field, upload, FileType)]. Nothing is written yet."""
    limits = upload_limits()
    by_key = {f["key"]: f for f in fields}
    checked, errors, total, count = [], {}, 0, 0
    for key, uploads in files.items():
        f = by_key[key]
        for u in uploads:
            count += 1
            total += u.size
            try:
                kind = validate_upload(u, images_only=f["type"] == "image", max_bytes=limits["max_file_bytes"], label=f["label"])
                checked.append((f, u, kind))
            except ValidationError as e:
                errors.setdefault(key, []).extend(e.detail if isinstance(e.detail, list) else [str(e.detail)])
    if count > limits["max_files"]:
        errors["files"] = [f"الحد الأقصى {limits['max_files']} ملفات لكل طلب."]
    if total > limits["max_total_bytes"]:
        errors["files"] = [f"مجموع أحجام الملفات يتجاوز {limits['max_total_mb']} MB لكل طلب."]
    if errors:
        raise ValidationError({"answers": errors})
    if total:
        ensure_capacity(total)
    return checked


def create_order(*, service: Service, customer_name, customer_phone, answers, details, idempotency_key, files=None):
    """Returns (order, created). A repeated idempotency key returns the
    original order instead of creating a duplicate. Files are written only
    after all validation passes and are removed if the transaction fails."""
    existing = Order.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        return existing, False
    files = files or {}
    snapshot = service_snapshot(service)
    clean_answers = validate_answers(snapshot["fields"], answers, files)
    checked = validate_files(snapshot["fields"], files)
    status = initial_status()
    for _ in range(5):
        written = []
        try:
            with transaction.atomic():
                order = Order.objects.create(
                    code=generate_tracking_code(),
                    service=service,
                    service_snapshot=snapshot,
                    form_version=service.form_version,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    answers=clean_answers,
                    details=details,
                    status=status,
                    idempotency_key=idempotency_key,
                )
                OrderEvent.objects.create(
                    order=order, kind=OrderEvent.Kind.CREATED, is_public=True, data={"status": status.label}
                )
                queue_new_order(order, attachments=len(checked))  # outbox row, committed with the order
                for field, upload, kind in checked:
                    rel, digest = store(upload, kind.ext)
                    written.append(rel)
                    PrivateFile.objects.create(
                        order=order, kind=PrivateFile.Kind.ORDER_FIELD, field_key=field["key"],
                        field_label=field["label"], original_name=clean_name(upload.name),
                        content_type=kind.mime, size=upload.size, sha256=digest, path=rel,
                    )
            return order, True
        except BaseException as exc:
            remove(written)
            if not isinstance(exc, IntegrityError):
                raise
            existing = Order.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing, False
            continue  # tracking code collision, try another one
    raise RuntimeError("Could not allocate a unique tracking code.")


@transaction.atomic
def change_status(order: Order, status: OrderStatus, actor, public_note: str = ""):
    if status.pk != order.status_id:
        previous = order.status.label
        order.status = status
        order.public_updated_at = timezone.now()
        order.save(update_fields=["status", "public_updated_at", "updated_at"])
        OrderEvent.objects.create(
            order=order,
            kind=OrderEvent.Kind.STATUS_CHANGED,
            actor=actor,
            is_public=True,
            data={"from": previous, "to": status.label, "meaning": status.meaning},
        )
    if public_note.strip():
        add_note(order, actor, public_note, OrderNote.Visibility.PUBLIC)
    return order


@transaction.atomic
def assign(order: Order, assignee, actor):
    if order.assignee_id == (assignee.pk if assignee else None):
        return order
    order.assignee = assignee
    order.save(update_fields=["assignee", "updated_at"])
    OrderEvent.objects.create(
        order=order,
        kind=OrderEvent.Kind.ASSIGNED,
        actor=actor,
        is_public=False,
        data={"assignee": assignee.full_name if assignee else None},
    )
    return order


@transaction.atomic
def add_note(order: Order, actor, body: str, visibility: str):
    note = OrderNote.objects.create(order=order, author=actor, visibility=visibility, body=body.strip())
    public = visibility == OrderNote.Visibility.PUBLIC
    OrderEvent.objects.create(
        order=order,
        kind=OrderEvent.Kind.NOTE_ADDED,
        actor=actor,
        is_public=public,
        data={"note_id": note.pk, "visibility": visibility},
    )
    if public:
        order.public_updated_at = timezone.now()
        order.save(update_fields=["public_updated_at", "updated_at"])
    return note


# ---------- staff attachments ----------


def add_staff_attachment(order: Order, actor, upload, kind: str, payment: PaymentEntry | None = None):
    """Team-added document or payment proof. A payment proof never changes
    the payment status by itself; staff confirm payment explicitly."""
    limits = upload_limits()
    ftype = validate_upload(upload, images_only=False, max_bytes=limits["max_file_bytes"], label="المرفق")
    ensure_capacity(upload.size)
    rel, digest = store(upload, ftype.ext)
    try:
        with transaction.atomic():
            f = PrivateFile.objects.create(
                order=order, kind=kind, payment=payment, original_name=clean_name(upload.name),
                content_type=ftype.mime, size=upload.size, sha256=digest, path=rel, uploaded_by=actor,
            )
            OrderEvent.objects.create(order=order, kind=OrderEvent.Kind.ATTACHMENT_ADDED, actor=actor,
                                      data={"file": f.original_name, "kind": kind})
    except BaseException:
        remove([rel])
        raise
    return f


# ---------- quotes & payments ----------


@transaction.atomic
def create_quote(order: Order, actor, amount, currency, note=""):
    order = Order.objects.select_for_update().get(pk=order.pk)
    order.quotes.filter(status=Quote.Status.PENDING).update(status=Quote.Status.SUPERSEDED)
    version = (order.quotes.order_by("-version").values_list("version", flat=True).first() or 0) + 1
    q = Quote.objects.create(order=order, version=version, amount=amount, currency=currency, note=note, created_by=actor)
    OrderEvent.objects.create(order=order, kind=OrderEvent.Kind.QUOTE_CREATED, actor=actor,
                              data={"version": version, "amount": str(amount), "currency": currency})
    return q


@transaction.atomic
def decide_quote(quote: Quote, actor, decision: str, note=""):
    quote = Quote.objects.select_for_update().get(pk=quote.pk)
    if quote.status != Quote.Status.PENDING:
        raise ValidationError({"decision": ["هذا العرض ليس بانتظار قرار."]})
    quote.status = decision
    quote.decided_by = actor
    quote.decided_at = timezone.now()
    quote.decision_note = note
    quote.save()
    OrderEvent.objects.create(order=quote.order, kind=OrderEvent.Kind.QUOTE_DECIDED, actor=actor,
                              data={"version": quote.version, "decision": decision, "note": note})
    return quote


@transaction.atomic
def set_payment_status(order: Order, actor, status: str, note=""):
    if order.payment_status == status:
        return order
    previous = order.get_payment_status_display()
    order.payment_status = status
    order.save(update_fields=["payment_status", "updated_at"])
    OrderEvent.objects.create(order=order, kind=OrderEvent.Kind.PAYMENT_STATUS, actor=actor,
                              data={"from": previous, "to": order.get_payment_status_display(), "note": note})
    return order


@transaction.atomic
def record_payment(order: Order, actor, **data):
    p = PaymentEntry.objects.create(order=order, recorded_by=actor, **data)
    OrderEvent.objects.create(order=order, kind=OrderEvent.Kind.PAYMENT_RECORDED, actor=actor,
                              data={"amount": str(p.amount), "currency": p.currency, "method": p.get_method_display()})
    return p
