from django.db.models import Count, ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.accounts.permissions import IsAdmin, IsStaffMember
import json

from apps.catalog.models import Service
from apps.content.models import upload_limits
from apps.media_library import signing as file_signing
from apps.media_library.models import PrivateFile
from apps.core.idempotency import get_idempotency_key
from apps.core.throttles import ScopedIPThrottle

from . import services
from .filters import OrderFilter
from .access import visible_orders
from .models import Order, OrderNote, OrderStatus, Quote
from .serializers import (
    AssignSerializer,
    PaymentSerializer,
    PaymentStatusSerializer,
    QuoteDecisionSerializer,
    QuoteSerializer,
    NoteSerializer,
    OrderCreatedSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    StatusChangeSerializer,
    StatusSerializer,
    TrackingSerializer,
)


FILE_PREFIX = "file."


class PayloadTooLarge(APIException):
    status_code = 413
    default_detail = "حجم الملفات المرفقة أكبر من المسموح."
    default_code = "payload_too_large"


class PublicOrderCreateView(APIView):
    """JSON, or multipart/form-data with the JSON body in `payload` and
    files named `file.<field_key>` (repeatable)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "order_create"
    parser_classes = [JSONParser, MultiPartParser]

    def _read(self, request):
        if not request.content_type.startswith("multipart/"):
            return request.data, {}
        limits = upload_limits()
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        if length <= 0 or length > limits["max_total_bytes"] + 1024 * 1024:
            raise PayloadTooLarge()
        try:
            payload = json.loads(request.data.get("payload", "{}"))
        except (TypeError, ValueError):
            raise ValidationError({"payload": ["صيغة الطلب غير صحيحة."]})
        if not isinstance(payload, dict):
            raise ValidationError({"payload": ["صيغة الطلب غير صحيحة."]})
        files = {k[len(FILE_PREFIX):]: request.FILES.getlist(k) for k in request.FILES if k.startswith(FILE_PREFIX)}
        return payload, files

    @extend_schema(request=OrderCreateSerializer, responses={201: OrderCreatedSerializer})
    def post(self, request):
        key = get_idempotency_key(request)
        existing = Order.objects.filter(idempotency_key=key).first()
        if existing:  # retry of a completed submission: do not re-read uploads
            return Response(OrderCreatedSerializer(existing).data, status=200)
        data, files = self._read(request)
        s = OrderCreateSerializer(data=data)
        valid = s.is_valid()
        service = (
            Service.objects.filter(slug=str(data.get("service", "")), status=Service.Status.PUBLISHED)
            .select_related("category")
            .prefetch_related("fields")
            .first()
        )
        if service is None:
            return Response(
                {"detail": "هذه الخدمة غير متاحة حاليًا لاستقبال الطلبات.", "code": "service_unavailable"},
                status=status.HTTP_409_CONFLICT,
            )
        # Report customer-field and form-answer errors together in one round.
        errors = dict(s.errors) if not valid else {}
        try:
            services.validate_answers(services.service_snapshot(service)["fields"], data.get("answers") or {}, files)
        except ValidationError as e:
            errors.update(e.detail)
        if errors:
            raise ValidationError(errors)
        d = s.validated_data
        order, created = services.create_order(
            service=service,
            customer_name=d["customer_name"].strip(),
            customer_phone=d["customer_phone"],
            answers=d["answers"],
            details=d["details"].strip(),
            idempotency_key=key,
            files=files,
        )
        return Response(OrderCreatedSerializer(order).data, status=201 if created else 200)


class PublicTrackingView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "tracking"

    @extend_schema(responses=TrackingSerializer)
    def get(self, request, code):
        order = get_object_or_404(
            Order.objects.select_related("status").prefetch_related("events", "notes"),
            code=code.strip().upper(),
        )
        return Response(TrackingSerializer(order).data)


class AdminOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsStaffMember]
    filterset_class = OrderFilter

    def get_queryset(self):
        # Executors only ever see orders assigned to them, even by direct ID.
        qs = visible_orders(self.request.user).select_related("status", "assignee")
        if self.action != "list":
            qs = qs.prefetch_related(
                "notes__author", "events__actor", "attachments__uploaded_by",
                "quotes__created_by", "quotes__decided_by", "payments__recorded_by",
            )
        return qs

    def _require_money_role(self):
        if self.request.user.role == Role.EXECUTOR:
            raise PermissionDenied("الأسعار والدفع متاحة للمدير والمشغّل فقط.")

    def get_serializer_class(self):
        return OrderListSerializer if self.action == "list" else OrderDetailSerializer

    def _detail(self, order):
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderDetailSerializer(order).data)

    @extend_schema(request=StatusChangeSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        order = self.get_object()
        s = StatusChangeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.change_status(order, s.validated_data["status"], request.user, s.validated_data["public_note"])
        return self._detail(order)

    @extend_schema(request=AssignSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        if request.user.role == Role.EXECUTOR:
            raise PermissionDenied("الإسناد متاح للمدير والمشغّل فقط.")
        order = self.get_object()
        s = AssignSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.assign(order, s.validated_data["assignee"], request.user)
        return self._detail(order)

    @extend_schema(request=NoteSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"])
    def notes(self, request, pk=None):
        order = self.get_object()
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.add_note(order, request.user, s.validated_data["body"], s.validated_data["visibility"])
        return self._detail(order)

    @extend_schema(request=None, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser])
    def attachments(self, request, pk=None):
        """Staff upload: kind=order_document (any role in scope) or
        payment_proof (admin/operator), optional payment=<id>."""
        order = self.get_object()
        kind = request.data.get("kind", PrivateFile.Kind.ORDER_DOCUMENT)
        if kind not in (PrivateFile.Kind.ORDER_DOCUMENT, PrivateFile.Kind.PAYMENT_PROOF):
            raise ValidationError({"kind": ["نوع مرفق غير صالح."]})
        if kind == PrivateFile.Kind.PAYMENT_PROOF:
            self._require_money_role()
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": ["اختر ملفًا."]})
        payment = None
        if request.data.get("payment"):
            payment = order.payments.filter(pk=request.data["payment"]).first()
            if payment is None:
                raise ValidationError({"payment": ["الدفعة غير موجودة في هذا الطلب."]})
        try:
            services.add_staff_attachment(order, request.user, upload, kind, payment)
        except ValidationError as e:
            raise ValidationError({"file": e.detail if isinstance(e.detail, list) else e.detail})
        return self._detail(order)

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=["post"], url_path=r"attachments/(?P<file_id>[0-9a-f-]{36})/link")
    def attachment_link(self, request, pk=None, file_id=None):
        order = self.get_object()
        f = get_object_or_404(PrivateFile, pk=file_id, order=order)
        token = file_signing.make_token(f.pk, request.user.pk)
        return Response({"url": f"/api/v1/files/download/?t={token}", "expires_in": file_signing.MAX_AGE})

    @extend_schema(request=QuoteSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"])
    def quotes(self, request, pk=None):
        self._require_money_role()
        order = self.get_object()
        s = QuoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.create_quote(order, request.user, s.validated_data["amount"], s.validated_data["currency"],
                              s.validated_data.get("note", ""))
        return self._detail(order)

    @extend_schema(request=QuoteDecisionSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"], url_path=r"quotes/(?P<quote_id>\d+)/decision")
    def quote_decision(self, request, pk=None, quote_id=None):
        self._require_money_role()
        order = self.get_object()
        quote = get_object_or_404(Quote, pk=quote_id, order=order)
        s = QuoteDecisionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.decide_quote(quote, request.user, s.validated_data["decision"], s.validated_data["note"])
        return self._detail(order)

    @extend_schema(request=PaymentStatusSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"], url_path="payment-status")
    def payment_status(self, request, pk=None):
        self._require_money_role()
        order = self.get_object()
        s = PaymentStatusSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.set_payment_status(order, request.user, s.validated_data["payment_status"], s.validated_data["note"])
        return self._detail(order)

    @extend_schema(request=PaymentSerializer, responses=OrderDetailSerializer)
    @action(detail=True, methods=["post"])
    def payments(self, request, pk=None):
        self._require_money_role()
        order = self.get_object()
        s = PaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.record_payment(order, request.user, **s.validated_data)
        return self._detail(order)

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        by_meaning = dict(qs.values_list("status__meaning").annotate(n=Count("id")))
        return Response({"total": qs.count(), "by_meaning": by_meaning})


class StatusViewSet(viewsets.ModelViewSet):
    """Every staff member reads statuses; only admins change them.
    A status used by any order cannot be deleted, only deactivated."""

    serializer_class = StatusSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), IsStaffMember()]
        return [IsAuthenticated(), IsAdmin()]

    def get_queryset(self):
        return OrderStatus.objects.annotate(orders_count=Count("orders"))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_initial:
            return Response({"detail": "لا يمكن حذف الحالة الأولى للطلبات.", "code": "protected"}, status=409)
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "الحالة مستخدمة في طلبات سابقة. عطّلها بدل حذفها.", "code": "protected"}, status=409
            )
