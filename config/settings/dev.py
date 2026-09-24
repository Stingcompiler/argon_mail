from .base import *  # noqa: F401,F403
from .base import env

DEBUG = env.bool("DJANGO_DEBUG", default=True)
REFRESH_COOKIE["secure"] = env.bool("REFRESH_COOKIE_SECURE", default=False)  # noqa: F405
