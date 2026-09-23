from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsOperatorOrAdmin
from apps.core.idempotency import get_idempotency_key
from apps.core.throttles import ScopedIPThrottle

from .models import Inquiry
from .serializers import InquiryAdminSerializer, InquiryCreateSerializer


class PublicInquiryCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "inquiry_create"

    @extend_schema(request=InquiryCreateSerializer, responses={201: dict})
    def post(self, request):
        key = get_idempotency_key(request)
        existing = Inquiry.objects.filter(idempotency_key=key).first()
        if existing:
            return Response({"id": existing.pk}, status=200)
        s = InquiryCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        inquiry = s.save(idempotency_key=key)
        return Response({"id": inquiry.pk}, status=201)


class AdminInquiryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                          viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = InquiryAdminSerializer
    filterset_fields = ["status"]

    def get_queryset(self):
        qs = Inquiry.objects.select_related("assignee")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(subject__icontains=q) | Q(body__icontains=q) | Q(phone__contains=q))
        return qs
