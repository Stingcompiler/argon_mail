import uuid

from rest_framework.exceptions import ValidationError

HEADER = "HTTP_IDEMPOTENCY_KEY"


def get_idempotency_key(request) -> uuid.UUID:
    """Every public create call must send a client-generated UUID so that a
    double click or network retry returns the original record instead of
    creating a duplicate."""
    raw = request.META.get(HEADER, "")
    try:
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        raise ValidationError({"idempotency_key": ["ترويسة Idempotency-Key مفقودة أو غير صالحة."]})
