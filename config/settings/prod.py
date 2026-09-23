from .base import *  # noqa: F401,F403
from .base import env

DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
REFRESH_COOKIE["secure"] = True  # noqa: F405
# Next.js terminates TLS-facing traffic and handles HSTS; Django only listens
# on 127.0.0.1, so SSL redirects here would loop.
SECURE_SSL_REDIRECT = False
