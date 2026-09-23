"""File validation by real content, not by the name or the browser's claim."""
from dataclasses import dataclass

from rest_framework.exceptions import ValidationError


@dataclass(frozen=True)
class FileType:
    ext: str
    mime: str
    aliases: tuple[str, ...]
    image: bool


PDF = FileType("pdf", "application/pdf", ("pdf",), False)
PNG = FileType("png", "image/png", ("png",), True)
JPEG = FileType("jpg", "image/jpeg", ("jpg", "jpeg"), True)
WEBP = FileType("webp", "image/webp", ("webp",), True)
ALLOWED = (PDF, PNG, JPEG, WEBP)


def sniff(head: bytes) -> FileType | None:
    if head.startswith(b"%PDF-"):
        return PDF
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return PNG
    if head.startswith(b"\xff\xd8\xff"):
        return JPEG
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return WEBP
    return None


def clean_name(name: str) -> str:
    """Display name only; files are stored under random names."""
    name = (name or "file").replace("\\", "/").rsplit("/", 1)[-1]
    name = "".join(c for c in name if c.isprintable() and c not in '<>:"|?*').strip(". ")
    return (name or "file")[:180]


def validate_upload(upload, *, images_only: bool, max_bytes: int, label: str) -> FileType:
    """Raises ValidationError with an Arabic message naming the file."""
    name = clean_name(upload.name)
    if upload.size == 0:
        raise ValidationError(f"الملف «{name}» فارغ.")
    if upload.size > max_bytes:
        raise ValidationError(f"الملف «{name}» أكبر من الحد المسموح ({max_bytes // (1024 * 1024)} MB).")
    pos = upload.tell() if hasattr(upload, "tell") else 0
    upload.seek(0)
    head = upload.read(16)
    upload.seek(pos)
    kind = sniff(head)
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if kind is None or ext not in kind.aliases:
        allowed = "PNG أو JPG أو WebP" if images_only else "PDF أو PNG أو JPG أو WebP"
        raise ValidationError(f"نوع الملف «{name}» غير مقبول في «{label}». المسموح: {allowed}.")
    if images_only and not kind.image:
        raise ValidationError(f"«{label}» يقبل الصور فقط.")
    return kind
