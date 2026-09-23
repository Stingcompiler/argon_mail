from django.db.models import Count, ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.accounts.permissions import IsAdmin, IsStaffMember
from apps.catalog.models import Service
from apps.core.idempotency import get_idempotency_key
from apps.core.throttles import ScopedIPThrottle

from . import services
from .filters import OrderFilter
from .models import Order, OrderNote, OrderStatus
from .serializers import (
    AssignSerializer,
    NoteSerializer,
    OrderCreatedSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    StatusChangeSerializer,
    StatusSerializer,
    TrackingSerializer,
)


class PublicOrderCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "order_create"

    @extend_schema(request=OrderCreateSerializer, responses={201: OrderCreatedSerializer})
    def post(self, request):
        key = get_idempotency_key(request)
        s = OrderCreateSerializer(data=request.data)
        valid = s.is_valid()
        service = (
            Service.objects.filter(slug=str(request.data.get("service", "")), status=Service.Status.PUBLISHED)
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
            services.validate_answers(services.service_snapshot(service)["fields"], request.data.get("answers") or {})
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
        qs = Order.objects.select_related("status", "assignee")
        # Executors only ever see orders assigned to them, even by direct ID.
        if self.request.user.role == Role.EXECUTOR:
            qs = qs.filter(assignee=self.request.user)
        if self.action != "list":
            qs = qs.prefetch_related("notes__author", "events__actor")
        return qs

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
