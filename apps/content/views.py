from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action

from apps.core import preview
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsOperatorOrAdmin
from apps.core.throttles import ScopedIPThrottle

from .models import FAQItem, Page, SiteSettings
from .serializers import (
    AdminPageSerializer,
    FAQSerializer,
    PageLinkSerializer,
    PublicPageSerializer,
    PublicSiteSettingsSerializer,
    SiteSettingsSerializer,
)


class PublicSiteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "public_read"

    @extend_schema(responses={200: dict})
    def get(self, request):
        s = PublicSiteSettingsSerializer(SiteSettings.load()).data
        faq = FAQSerializer(FAQItem.objects.filter(is_published=True), many=True).data
        pages = PageLinkSerializer(Page.objects.filter(status=Page.Status.PUBLISHED, show_in_footer=True), many=True).data
        return Response({"settings": s, "faq": faq, "pages": pages})


class AdminSiteSettingsView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), IsOperatorOrAdmin()]
        return [IsAuthenticated(), IsAdmin()]

    @extend_schema(responses=SiteSettingsSerializer)
    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)

    @extend_schema(request=SiteSettingsSerializer, responses=SiteSettingsSerializer)
    def patch(self, request):
        s = SiteSettingsSerializer(SiteSettings.load(), data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class AdminFAQViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = FAQSerializer
    queryset = FAQItem.objects.all()
    pagination_class = None


class PublicPageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "public_read"

    @extend_schema(responses=PublicPageSerializer)
    def get(self, request, slug):
        page = Page.objects.filter(slug=slug).first()
        if page and page.status != Page.Status.PUBLISHED and not preview.allows(request.query_params.get("preview", ""), "page", page.pk):
            page = None
        if page is None:
            return Response({"detail": "الصفحة غير موجودة.", "code": "not_found"}, status=404)
        return Response(PublicPageSerializer(page).data)


class AdminPageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = AdminPageSerializer
    queryset = Page.objects.all()
    pagination_class = None

    @extend_schema(request=None, responses={200: dict})
    @action(detail=True, methods=["post"], url_path="preview-link")
    def preview_link(self, request, pk=None):
        from urllib.parse import quote

        page = self.get_object()
        base = f"/{page.slug}" if page.is_system else f"/p/{quote(page.slug)}"
        return Response({"url": f"{base}?preview={preview.make('page', page.pk)}", "expires_in": preview.PREVIEW_MAX_AGE})

    def destroy(self, request, *args, **kwargs):
        if self.get_object().is_system:
            return Response({"detail": "صفحتا الخصوصية والشروط لا تُحذفان.", "code": "protected"}, status=409)
        return super().destroy(request, *args, **kwargs)
