from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsOperatorOrAdmin

from . import services
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = NotificationSerializer
    filterset_fields = ["status", "kind"]

    def get_queryset(self):
        return Notification.objects.select_related("order").prefetch_related("delivery_attempts__triggered_by")

    @extend_schema(responses={200: dict})
    @action(detail=False, methods=["get"])
    def summary(self, request):
        counts = dict(Notification.objects.values_list("status").annotate(n=Count("id")))
        return Response({"by_status": counts, "failed": counts.get("failed", 0), "skipped": counts.get("skipped", 0)})

    @extend_schema(request=None, responses=NotificationSerializer)
    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        n, ok = services.resend(self.get_object(), request.user)
        n.refresh_from_db()
        data = NotificationSerializer(n).data
        data["sent_now"] = ok
        return Response(data)
