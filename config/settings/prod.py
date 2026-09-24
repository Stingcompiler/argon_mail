from .base import *  # noqa: F401,F403
from django.core.exceptions import ImproperlyConfigured

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

ENABLE_DJANGO_ADMIN = env.bool("ENABLE_DJANGO_ADMIN", default=False)


def _require(ok, message):
    if not ok:
        raise ImproperlyConfigured(f"Production configuration error: {message}")


# Fail at startup instead of running with unsafe or localhost defaults.
_require(SITE_URL.startswith("https://"), "SITE_URL must be the public https:// origin.")  # noqa: F405
_require(SITE_URL in TRUSTED_ORIGINS, "TRUSTED_ORIGINS must contain SITE_URL.")  # noqa: F405
_require(len(INTERNAL_SECRET) >= 32, "INTERNAL_SECRET must be set (32+ characters).")  # noqa: F405
_require(len(SECRET_KEY) >= 50 and "change-me" not in SECRET_KEY, "DJANGO_SECRET_KEY must be a strong random value.")  # noqa: F405
_jwt_key = env("JWT_SIGNING_KEY", default="")
_require(len(_jwt_key) >= 50 and _jwt_key != SECRET_KEY, "JWT_SIGNING_KEY must be set and differ from DJANGO_SECRET_KEY.")  # noqa: F405
SIMPLE_JWT["SIGNING_KEY"] = _jwt_key  # noqa: F405
