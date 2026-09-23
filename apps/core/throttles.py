import hmac

from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle


def is_internal_request(request) -> bool:
    """Server-side fetches from the Next.js server carry the shared secret.
    They render pages for many visitors from one IP, so they skip throttling."""
    secret = settings.INTERNAL_SECRET
    sent = request.META.get("HTTP_X_INTERNAL_SECRET", "")
    return bool(secret) and hmac.compare_digest(sent, secret)


class ScopedIPThrottle(ScopedRateThrottle):
    """Scoped throttle keyed by client IP even for authenticated users.

    Public endpoints are anonymous; auth endpoints must be limited per IP
    before a user is known.
    """

    def allow_request(self, request, view):
        if is_internal_request(request):
            return True
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}
