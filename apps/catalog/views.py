from django.db.models import Count, ProtectedError, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsOperatorOrAdmin
from apps.core.throttles import ScopedIPThrottle

from .models import Category, Service, ServiceSlugRedirect
from .serializers import (
    AdminServiceSerializer,
    CategorySerializer,
    PublicServiceDetailSerializer,
    PublicServiceListSerializer,
)


class PublicMixin:
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "public_read"


class PublicCategoryViewSet(PublicMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Category.objects.annotate(services_count=Count("services", filter=Q(services__status="published")))
            .filter(services_count__gt=0)
        )


class PublicServiceViewSet(PublicMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "slug"
    lookup_value_regex = r"[^/]+"
    pagination_class = None
    filterset_fields = {"category__slug": ["exact"], "is_featured": ["exact"]}

    def get_queryset(self):
        qs = Service.objects.filter(status=Service.Status.PUBLISHED).select_related("category")
        if self.action == "retrieve":
            qs = qs.prefetch_related("fields")
        return qs

    def get_serializer_class(self):
        return PublicServiceDetailSerializer if self.action == "retrieve" else PublicServiceListSerializer


@extend_schema(responses={200: dict})
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def service_redirect(request, slug):
    r = get_object_or_404(
        ServiceSlugRedirect.objects.select_related("service"), old_slug=slug, service__status="published"
    )
    return Response({"slug": r.service.slug})


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.annotate(services_count=Count("services"))

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "لا يمكن حذف مجال يحتوي خدمات. انقل الخدمات أولًا.", "code": "protected"},
                status=status.HTTP_409_CONFLICT,
            )


class AdminServiceViewSet(viewsets.ModelViewSet):
    """Services are never hard-deleted once used by an order; hide them."""

    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = AdminServiceSerializer
    pagination_class = None
    filterset_fields = ["status", "category"]
    search_fields = ["name"]

    def get_queryset(self):
        return (
            Service.objects.select_related("category")
            .prefetch_related("fields")
            .annotate(orders_count=Count("orders"))
        )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "للخدمة طلبات سابقة، لذا لا تُحذف. أخفِها بدلًا من ذلك.", "code": "protected"},
                status=status.HTTP_409_CONFLICT,
            )
