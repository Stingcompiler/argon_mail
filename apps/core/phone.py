import re

from django.core.exceptions import ValidationError

_ALLOWED = re.compile(r"^[+0-9 ()\-]{8,24}$")


def normalize_phone(raw: str) -> str:
    """Normalise a WhatsApp number to +<country><number> (digits only).

    The customer must type the country code, either with + or 00.
    """
    value = (raw or "").strip()
    if not _ALLOWED.match(value):
        raise ValidationError("أدخل رقم هاتف صحيحًا مع رمز الدولة.")
    digits = re.sub(r"\D", "", value)
    if value.startswith("+"):
        pass
    elif digits.startswith("00"):
        digits = digits[2:]
    else:
        raise ValidationError("ابدأ الرقم برمز الدولة، مثل +249.")
    if not 8 <= len(digits) <= 15:
        raise ValidationError("طول رقم الهاتف غير صحيح.")
    return "+" + digits


def whatsapp_link(phone: str, text: str = "") -> str:
    from urllib.parse import quote

    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    url = f"https://wa.me/{digits}"
    return f"{url}?text={quote(text)}" if text else url
