"""Signed, short-lived preview links for unpublished content.

The dashboard asks for a link; anyone holding it can view that one draft
for PREVIEW_MAX_AGE seconds. Previews are never cached and are noindex."""
from django.core import signing

SALT = "arjoon.preview"
PREVIEW_MAX_AGE = 30 * 60


def make(kind: str, pk) -> str:
    return signing.dumps({"k": kind, "id": str(pk)}, salt=SALT, compress=False)


def allows(token: str, kind: str, pk) -> bool:
    if not token:
        return False
    try:
        data = signing.loads(token, salt=SALT, max_age=PREVIEW_MAX_AGE)
    except signing.BadSignature:
        return False
    return data.get("k") == kind and data.get("id") == str(pk)
