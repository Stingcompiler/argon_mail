"""Base settings shared by every environment.

The platform is a monolith: Django serves only /api/, /media/ and /django-admin/
on an internal port, and the Next.js server in frontend/ is the public entry
point that proxies those paths here. See docs/architecture.md.
"""
from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])

# Public origin(s) the browser uses (the Next.js server). Used for the Origin
# check on cookie-based auth endpoints and for absolute links in e-mails.
SITE_URL = env("SITE_URL", default="http://127.0.0.1:3000").rstrip("/")
TRUSTED_ORIGINS = env.list("TRUSTED_ORIGINS", default=[SITE_URL])
CSRF_TRUSTED_ORIGINS = TRUSTED_ORIGINS

# Internal URL of the Next.js server, used to revalidate cached pages.
NEXT_INTERNAL_URL = env("NEXT_INTERNAL_URL", default="http://127.0.0.1:3000").rstrip("/")
INTERNAL_SECRET = env("INTERNAL_SECRET", default="")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.orders",
    "apps.inquiries",
    "apps.content",
    "apps.revalidation",
    "apps.media_library",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "apps.core.middleware.InternalTrailingSlashMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = False
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ar"
TIME_ZONE = env("TIME_ZONE", default="Africa/Khartoum")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Persistent disk mount point on Render. Public media and private attachments
# live in separate sub-directories; private files are never served by URL.
DATA_ROOT = Path(env("DATA_ROOT", default=str(BASE_DIR / "var")))
MEDIA_ROOT = DATA_ROOT / "public"
MEDIA_URL = "/media/"
PRIVATE_ROOT = DATA_ROOT / "private"
# The 10 GB Render disk; private files may use up to this much, with a
# warning in the dashboard from 85 %.
STORAGE_QUOTA_BYTES = env.int("STORAGE_QUOTA_BYTES", default=9 * 1024**3)
STORAGE_WARN_RATIO = 0.85
# Hard ceilings; the owner's settings can only lower them.
UPLOAD_HARD_MAX_MB = env.int("UPLOAD_HARD_MAX_MB", default=20)
UPLOAD_HARD_MAX_FILES = env.int("UPLOAD_HARD_MAX_FILES", default=10)
FILE_UPLOAD_PERMISSIONS = 0o600
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "auth": env("THROTTLE_AUTH", default="10/min"),
        "public_read": env("THROTTLE_PUBLIC_READ", default="120/min"),
        "tracking": env("THROTTLE_TRACKING", default="20/min"),
        "order_create": env("THROTTLE_ORDER_CREATE", default="20/hour"),
        "inquiry_create": env("THROTTLE_INQUIRY_CREATE", default="10/hour"),
    },
    # The Next.js proxy forwards X-Forwarded-For unchanged; Render's load
    # balancer appends the real client IP as the last entry. So the client IP
    # is the last entry (NUM_PROXIES=1). Verified locally; re-check on Render.
    "NUM_PROXIES": env.int("NUM_PROXIES", default=1),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SIGNING_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    # Tokens become invalid as soon as the password changes.
    "CHECK_REVOKE_TOKEN": True,
}

# Refresh token cookie. The access token is never put in a cookie.
REFRESH_COOKIE = {
    "name": "arjoon_refresh",
    "path": "/api/v1/auth/",
    "secure": env.bool("REFRESH_COOKIE_SECURE", default=True),
    "samesite": "Strict",
    "httponly": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Arjoon Mail API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
    "loggers": {"django.db.backends": {"level": "WARNING"}},
}
