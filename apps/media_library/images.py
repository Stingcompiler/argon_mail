"""Public image processing: validate, orient, downscale, strip metadata.

Re-encoding with Pillow drops EXIF (GPS location, camera data) and any
payload appended to the file. Decompression bombs are refused."""
import io
import uuid

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageOps
from rest_framework.exceptions import ValidationError

from .validation import clean_name, validate_upload

MAX_EDGE = 2000
MAX_PIXELS = 40_000_000
FORMATS = {"png": ("PNG", "image/png"), "jpg": ("JPEG", "image/jpeg"), "webp": ("WEBP", "image/webp")}


def process_public_image(upload):
    """Returns dict(data, ext, content_type, width, height, original_name)."""
    kind = validate_upload(upload, images_only=True, max_bytes=settings.PUBLIC_IMAGE_MAX_MB * 1024 * 1024, label="الصورة")
    upload.seek(0)
    try:
        img = Image.open(upload)
        if img.width * img.height > MAX_PIXELS:
            raise ValidationError("أبعاد الصورة كبيرة جدًا.")
        img.load()
    except ValidationError:
        raise
    except Exception:
        raise ValidationError("تعذّر قراءة الصورة. تأكد أنها ملف صورة سليم.")
    img = ImageOps.exif_transpose(img)
    if max(img.size) > MAX_EDGE:
        img.thumbnail((MAX_EDGE, MAX_EDGE))
    fmt, mime = FORMATS[kind.ext]
    out = io.BytesIO()
    if fmt == "JPEG":
        img.convert("RGB").save(out, fmt, quality=85, optimize=True, progressive=True)
    elif fmt == "PNG":
        img.save(out, fmt, optimize=True)
    else:
        img.save(out, fmt, quality=85)
    return {"data": out.getvalue(), "ext": kind.ext, "content_type": mime, "width": img.width, "height": img.height,
            "original_name": clean_name(upload.name)}


def new_public_path(ext: str) -> str:
    now = timezone.now()
    return f"assets/{now:%Y}/{now:%m}/{uuid.uuid4().hex}.{ext}"
