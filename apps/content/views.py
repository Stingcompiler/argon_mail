from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin, IsOperatorOrAdmin
from apps.core.throttles import ScopedIPThrottle

from .models import FAQItem, SiteSettings
from .serializers import FAQSerializer, PublicSiteSettingsSerializer, SiteSettingsSerializer


class PublicSiteView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "public_read"

    @extend_schema(responses={200: dict})
    def get(self, request):
        s = PublicSiteSettingsSerializer(SiteSettings.load()).data
        faq = FAQSerializer(FAQItem.objects.filter(is_published=True), many=True).data
        return Response({"settings": s, "faq": faq})


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
