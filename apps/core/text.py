import re
import unicodedata

_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")  # harakat, tatweel
_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


def normalize_name(value: str) -> str:
    """Comparison key for Arabic/Latin full names.

    Folds the spelling variants people use interchangeably (أحمد/احمد,
    فاطمة/فاطمه, ى/ي), drops diacritics and tatweel, collapses spaces and
    ignores case. Used only for matching, never for display."""
    v = unicodedata.normalize("NFKC", value or "")
    v = _DIACRITICS.sub("", v).translate(_FOLD).casefold()
    return " ".join(v.split())
