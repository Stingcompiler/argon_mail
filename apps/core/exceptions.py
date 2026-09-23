"""Uniform error envelope: {"detail": str, "code": str, "errors": {field: [msg]}}."""
from rest_framework import exceptions
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(exc, exceptions.ValidationError):
        errors = data if isinstance(data, dict) else {"non_field_errors": data}
        response.data = {
            "detail": "تحقق من البيانات المدخلة.",
            "code": "invalid",
            "errors": errors,
        }
    elif isinstance(data, dict) and "detail" in data:
        code = getattr(data["detail"], "code", None) or getattr(exc, "default_code", "error")
        response.data = {"detail": str(data["detail"]), "code": code}
    return response
