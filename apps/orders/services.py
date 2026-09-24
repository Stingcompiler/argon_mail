"""Order business rules. Views stay thin; everything that changes an order
goes through these functions so the event log is always written."""
import datetime as dt
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Service

from .models import Order, OrderEvent, OrderNote, OrderStatus, generate_tracking_code


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


def validate_answers(fields: list[dict], raw: dict) -> list[dict]:
    if not isinstance(raw, dict):
        raise ValidationError({"answers": ["صيغة الإجابات غير صحيحة."]})
    errors, answers = {}, []
    for f in fields:
        key, value = f["key"], raw.get(f["key"])
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
    unknown = set(raw) - {f["key"] for f in fields}
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


def create_order(*, service: Service, customer_name, customer_phone, answers, details, idempotency_key):
    """Returns (order, created). A repeated idempotency key returns the
    original order instead of creating a duplicate."""
    existing = Order.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        return existing, False
    snapshot = service_snapshot(service)
    clean_answers = validate_answers(snapshot["fields"], answers)
    status = initial_status()
    for _ in range(5):
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
            return order, True
        except IntegrityError:
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
