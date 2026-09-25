"""Private file storage on the persistent disk.

Layout: PRIVATE_ROOT/orders/YYYY/MM/<uuid>.<ext>, mode 0600. Files are
written to a temp name and renamed, so a crash never leaves a partial file
under a final name."""
import hashlib
import os
import shutil
import uuid
from pathlib import Path

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import PrivateFile

SAFETY_MARGIN = 200 * 1024 * 1024


def root() -> Path:
    return Path(settings.PRIVATE_ROOT)


def absolute(relpath: str) -> Path:
    p = (root() / relpath).resolve()
    if root().resolve() not in p.parents:
        raise ValueError("path escapes private root")
    return p


def used_bytes() -> int:
    from .models import PublicAsset

    private = PrivateFile.objects.aggregate(n=Sum("size"))["n"] or 0
    public = PublicAsset.objects.aggregate(n=Sum("size"))["n"] or 0
    return private + public


def public_absolute(relpath: str) -> Path:
    root = Path(settings.MEDIA_ROOT).resolve()
    p = (root / relpath).resolve()
    if root not in p.parents:
        raise ValueError("path escapes media root")
    return p


def store_public(relpath: str, data: bytes):
    final = public_absolute(relpath)
    final.parent.mkdir(parents=True, exist_ok=True)
    tmp = final.with_suffix(final.suffix + ".part")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(data)
        os.replace(tmp, final)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def storage_status() -> dict:
    root().mkdir(parents=True, exist_ok=True)
    disk = shutil.disk_usage(root())
    used = used_bytes()
    quota = settings.STORAGE_QUOTA_BYTES
    return {
        "used": used,
        "quota": quota,
        "percent": round(used * 100 / quota, 1) if quota else 0,
        "disk_free": disk.free,
        "warning": used >= quota * settings.STORAGE_WARN_RATIO,
    }


def ensure_capacity(incoming: int):
    status = storage_status()
    if status["used"] + incoming > status["quota"] or status["disk_free"] - incoming < SAFETY_MARGIN:
        raise ValidationError({"files": ["مساحة التخزين ممتلئة حاليًا. تواصل معنا عبر WhatsApp لإرسال الملفات."]})


def store(upload, ext: str) -> tuple[str, str]:
    """Returns (relative path, sha256)."""
    now = timezone.now()
    rel = f"orders/{now:%Y}/{now:%m}/{uuid.uuid4().hex}.{ext}"
    final = absolute(rel)
    final.parent.mkdir(parents=True, exist_ok=True)
    tmp = final.with_suffix(final.suffix + ".part")
    digest = hashlib.sha256()
    upload.seek(0)
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as out:
            for chunk in upload.chunks():
                digest.update(chunk)
                out.write(chunk)
        os.replace(tmp, final)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
    return rel, digest.hexdigest()


def remove(relpaths):
    for rel in relpaths:
        try:
            absolute(rel).unlink(missing_ok=True)
        except (OSError, ValueError):
            pass
