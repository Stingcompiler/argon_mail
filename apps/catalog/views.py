from django.db.models import Count, ProtectedError, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from urllib.parse import quote

from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes

from apps.core import preview
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
            .order_by("sort_order", "id")
        )


class PublicServiceViewSet(PublicMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = "slug"
    lookup_value_regex = r"[^/]+"
    pagination_class = None
    filterset_fields = {"category__slug": ["exact"], "is_featured": ["exact"]}

    def get_queryset(self):
        qs = Service.objects.filter(status=Service.Status.PUBLISHED).select_related("category", "image")
        if self.action == "retrieve":
            qs = qs.prefetch_related("fields")
        return qs

    def get_serializer_class(self):
        return PublicServiceDetailSerializer if self.action == "retrieve" else PublicServiceListSerializer

    def retrieve(self, request, *args, **kwargs):
        token = request.query_params.get("preview", "")
        if token:
            # Draft/hidden service shown only with a valid signed preview link.
            svc = (Service.objects.select_related("category", "image").prefetch_related("fields")
                   .filter(slug=kwargs["slug"]).first())
            if svc and preview.allows(token, "service", svc.pk):
                return Response(PublicServiceDetailSerializer(svc).data)
        return super().retrieve(request, *args, **kwargs)


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
        return Category.objects.annotate(services_count=Count("services")).order_by("sort_order", "id")

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
            Service.objects.select_related("category", "image")
            .prefetch_related("fields")
            .annotate(orders_count=Count("orders"))
            .order_by("sort_order", "id")
        )

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="preview-link")
    def preview_link(self, request, pk=None):
        svc = self.get_object()
        url = f"/services/{quote(svc.slug)}?preview={preview.make('service', svc.pk)}"
        return Response({"url": url, "expires_in": preview.PREVIEW_MAX_AGE})

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "للخدمة طلبات سابقة، لذا لا تُحذف. أخفِها بدلًا من ذلك.", "code": "protected"},
                status=status.HTTP_409_CONFLICT,
            )
