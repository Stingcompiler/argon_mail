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
