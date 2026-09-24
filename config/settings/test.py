from .base import *  # noqa: F401,F403

DEBUG = False
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
REFRESH_COOKIE["secure"] = False  # noqa: F405
INTERNAL_SECRET = ""

import tempfile
from pathlib import Path

DATA_ROOT = Path(tempfile.mkdtemp(prefix="arjoon-test-"))
MEDIA_ROOT = DATA_ROOT / "public"
PRIVATE_ROOT = DATA_ROOT / "private"

import atexit
import shutil

atexit.register(shutil.rmtree, DATA_ROOT, ignore_errors=True)
