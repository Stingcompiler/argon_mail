from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.serializers import UserBriefSerializer
from apps.core.phone import normalize_phone, whatsapp_link

from apps.media_library.models import PrivateFile

from .models import CURRENCIES, Order, OrderEvent, OrderNote, OrderStatus, PaymentEntry, PaymentStatus, Quote


class StatusSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = OrderStatus
        fields = ["id", "key", "label", "meaning", "sort_order", "is_active", "is_initial", "orders_count"]
        read_only_fields = ["id", "is_initial"]

    def validate_key(self, v):
        if self.instance and self.instance.key != v:
            raise serializers.ValidationError("لا يمكن تغيير المعرّف الداخلي للحالة.")
        return v


class StatusBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatus
        fields = ["key", "label", "meaning"]


# ---------- public ----------


class OrderCreateSerializer(serializers.Serializer):
    service = serializers.CharField(max_length=140)
    customer_name = serializers.CharField(max_length=80, min_length=2)
    customer_phone = serializers.CharField(max_length=24)
    answers = serializers.DictField(child=serializers.JSONField(), required=False, default=dict)
    details = serializers.CharField(max_length=4000, required=False, allow_blank=True, default="")
    consent = serializers.BooleanField()

    def validate_customer_phone(self, v):
        try:
            return normalize_phone(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

    def validate_consent(self, v):
        if not v:
            raise serializers.ValidationError("يجب الموافقة على الشروط وسياسة الخصوصية.")
        return v


class OrderCreatedSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = ["code", "service_name", "created_at"]


class TrackingSerializer(serializers.ModelSerializer):
    """Public tracking view: status and public notes only. Never the
    customer's name, phone, answers, attachments, payment or internal notes."""

    service_name = serializers.CharField(read_only=True)
    status = StatusBriefSerializer(read_only=True)
    timeline = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(source="public_updated_at")

    class Meta:
        model = Order
        fields = ["code", "service_name", "status", "created_at", "updated_at", "timeline"]

    def get_timeline(self, order):
        at = serializers.DateTimeField().to_representation
        notes = {n.pk: n for n in order.notes.all() if n.visibility == OrderNote.Visibility.PUBLIC}
        items = []
        for e in order.events.all():
            if not e.is_public:
                continue
            if e.kind == OrderEvent.Kind.CREATED:
                items.append({"kind": "created", "title": "تم استلام الطلب", "text": "", "at": at(e.created_at)})
            elif e.kind == OrderEvent.Kind.STATUS_CHANGED:
                items.append({"kind": "status", "title": e.data.get("to", ""), "text": "", "at": at(e.created_at),
                              "meaning": e.data.get("meaning")})
            elif e.kind == OrderEvent.Kind.NOTE_ADDED and e.data.get("note_id") in notes:
                items.append({"kind": "note", "title": "ملاحظة من فريق عرجون",
                              "text": notes[e.data["note_id"]].body, "at": at(e.created_at)})
        return items


# ---------- admin ----------


class OrderListSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(read_only=True)
    status = StatusBriefSerializer(read_only=True)
    assignee = UserBriefSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "code", "customer_name", "customer_phone", "service_name", "status", "assignee",
                  "payment_status", "created_at", "updated_at"]


class NoteSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)

    class Meta:
        model = OrderNote
        fields = ["id", "visibility", "body", "author", "created_at"]
        read_only_fields = ["id", "author", "created_at"]

    def validate_body(self, v):
        if not v.strip():
            raise serializers.ValidationError("اكتب نص الملاحظة.")
        return v


class EventSerializer(serializers.ModelSerializer):
    actor = UserBriefSerializer(read_only=True)

    class Meta:
        model = OrderEvent
        fields = ["id", "kind", "is_public", "data", "actor", "created_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserBriefSerializer(read_only=True)

    class Meta:
        model = PrivateFile
        fields = ["id", "kind", "field_key", "field_label", "payment", "original_name", "content_type", "size",
                  "uploaded_by", "created_at"]


class QuoteSerializer(serializers.ModelSerializer):
    created_by = UserBriefSerializer(read_only=True)
    decided_by = UserBriefSerializer(read_only=True)

    class Meta:
        model = Quote
        fields = ["id", "version", "amount", "currency", "note", "status", "created_by", "created_at",
                  "decided_by", "decided_at", "decision_note"]
        read_only_fields = ["id", "version", "status", "created_by", "created_at", "decided_by", "decided_at",
                            "decision_note"]


class QuoteDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[Quote.Status.ACCEPTED, Quote.Status.REJECTED])
    note = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")


class PaymentSerializer(serializers.ModelSerializer):
    recorded_by = UserBriefSerializer(read_only=True)
    method_label = serializers.CharField(source="get_method_display", read_only=True)

    class Meta:
        model = PaymentEntry
        fields = ["id", "amount", "currency", "method", "method_label", "reference", "note", "recorded_by", "created_at"]
        read_only_fields = ["id", "recorded_by", "created_at"]


class PaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices)
    note = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")


class OrderDetailSerializer(OrderListSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    events = EventSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    quotes = QuoteSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)
    whatsapp_url = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + [
            "answers", "details", "service_snapshot", "form_version", "public_updated_at",
            "notes", "events", "attachments", "quotes", "payments", "payment_status", "payment_status_label",
            "whatsapp_url",
        ]

    def get_whatsapp_url(self, order):
        text = f"مرحبًا {order.customer_name}، بخصوص طلبك {order.code} لدى بريد عرجون."
        return whatsapp_link(order.customer_phone, text)


class StatusChangeSerializer(serializers.Serializer):
    status = serializers.SlugRelatedField(slug_field="key", queryset=OrderStatus.objects.filter(is_active=True))
    public_note = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class AssignSerializer(serializers.Serializer):
    assignee = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(is_active=True),
        allow_null=True,
    )
