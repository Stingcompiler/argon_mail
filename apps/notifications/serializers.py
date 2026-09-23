from rest_framework import serializers

from apps.accounts.serializers import UserBriefSerializer

from .models import DeliveryAttempt, Notification


class AttemptSerializer(serializers.ModelSerializer):
    triggered_by = UserBriefSerializer(read_only=True)

    class Meta:
        model = DeliveryAttempt
        fields = ["started_at", "finished_at", "success", "error", "triggered_by"]


class NotificationSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    order_code = serializers.CharField(source="order.code", read_only=True, default=None)
    delivery_attempts = AttemptSerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "kind", "kind_label", "status", "status_label", "subject", "recipients", "attempts",
                  "next_attempt_at", "last_error", "sent_at", "created_at", "order", "order_code", "inquiry",
                  "delivery_attempts"]
