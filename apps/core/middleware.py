class InternalTrailingSlashMiddleware:
    """The Next.js proxy drops the trailing slash of rewritten paths. Add it
    back internally for proxied prefixes instead of answering with an
    APPEND_SLASH redirect, which would loop through the proxy."""

    PREFIXES = ("/api/", "/django-admin")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path.startswith(self.PREFIXES) and not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
            request.path_info = path + "/"
            request.path = request.path + "/"
        return self.get_response(request)


class RequestSizeLimitMiddleware:
    """Reject oversized API bodies before anything reads them.

    DRF's JSONParser reads the whole stream regardless of
    DATA_UPLOAD_MAX_MEMORY_SIZE, so a limit is enforced here from
    Content-Length: JSON/form bodies up to API_MAX_BODY_BYTES, multipart
    uploads up to UPLOAD_MAX_REQUEST_MB (+1 MB for the form fields)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.http import JsonResponse

        if request.method in ("POST", "PUT", "PATCH") and request.path_info.startswith("/api/"):
            try:
                length = int(request.META.get("CONTENT_LENGTH") or 0)
            except ValueError:
                length = -1
            multipart = request.content_type.startswith("multipart/")
            limit = (settings.UPLOAD_MAX_REQUEST_MB + 1) * 1024 * 1024 if multipart else settings.API_MAX_BODY_BYTES
            if length < 0 or length > limit:
                self._drain(request, length)
                msg = "حجم الملفات المرفقة أكبر من المسموح." if multipart else "حجم الطلب أكبر من المسموح."
                return JsonResponse({"detail": msg, "code": "payload_too_large"}, status=413)
        return self.get_response(request)

    DRAIN_MAX = 64 * 1024 * 1024
    CHUNK = 64 * 1024

    def _drain(self, request, length):
        """Read and discard the body before answering. If the socket is closed
        with unread data, the Next.js proxy is still writing and fails with
        EPIPE, turning the 413 into a 500. Nothing is kept in memory; the
        proxy already caps bodies (22 MB), and DRAIN_MAX bounds the work."""
        stream = request.META.get("wsgi.input")
        if stream is None or length <= 0 or length > self.DRAIN_MAX:
            return
        remaining = length
        try:
            while remaining > 0:
                chunk = stream.read(min(self.CHUNK, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
        except Exception:  # best effort: a short or broken body must not break the 413
            pass
