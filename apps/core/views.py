import os
import time
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdmin
from apps.core.throttles import ScopedIPThrottle

WORKER_HEARTBEAT_KEY = "notifications:worker-heartbeat"
WORKER_STALE_AFTER = 180  # seconds; the worker ticks every 15 s


def _database():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return "ok"
    except Exception:  # reported, not raised
        return "error"


def _worker():
    """ok / stale / unknown. Unknown (no heartbeat yet, e.g. just started or
    no worker in this environment) does not fail the check; stale does, so
    Render restarts a stuck worker."""
    if not settings.HEALTH_REQUIRE_WORKER:
        return "not_required"
    try:
        beat = cache.get(WORKER_HEARTBEAT_KEY)
    except Exception:
        return "unknown"
    if beat is None:
        return "unknown"
    return "ok" if time.time() - beat < WORKER_STALE_AFTER else "stale"


def _storage():
    """The private disk must exist and be writable; on Render it must also be
    the mounted persistent disk, not the container's ephemeral filesystem."""
    root = Path(settings.DATA_ROOT)
    if not root.is_dir() or not os.access(root, os.W_OK):
        return "error"
    if settings.HEALTH_REQUIRE_DATA_MOUNT and not os.path.ismount(root):
        return "not_mounted"
    return "ok"


@extend_schema(responses={200: dict})
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    checks = {"database": _database(), "worker": _worker(), "storage": _storage()}
    healthy = checks["database"] == "ok" and checks["storage"] == "ok" and checks["worker"] != "stale"
    return Response({"status": "ok" if healthy else "degraded", **checks}, status=200 if healthy else 503)


@extend_schema(responses={200: dict})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
@throttle_classes([])
def diagnostics(request):
    """What Django sees of the request chain. Used once after deploying to
    confirm NUM_PROXIES: `client_ip` must equal the admin's real public IP,
    and must not change when a fake X-Forwarded-For header is sent."""
    ident = ScopedIPThrottle().get_ident(request)
    return Response({
        "client_ip": ident,
        "remote_addr": request.META.get("REMOTE_ADDR"),
        "x_forwarded_for": request.META.get("HTTP_X_FORWARDED_FOR", ""),
        "x_forwarded_proto": request.META.get("HTTP_X_FORWARDED_PROTO", ""),
        "is_secure": request.is_secure(),
        "num_proxies": settings.REST_FRAMEWORK.get("NUM_PROXIES"),
        "site_url": settings.SITE_URL,
        "email_backend": settings.EMAIL_BACKEND.rsplit(".", 1)[-1],
        "sentry": bool(settings.SENTRY_DSN),
    })
