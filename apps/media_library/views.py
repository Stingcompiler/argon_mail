from django.contrib.auth import get_user_model
from django.core import signing
from django.http import FileResponse, Http404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsOperatorOrAdmin
from apps.orders.access import visible_orders

from . import signing as file_signing
from .models import PrivateFile
from .storage import absolute, storage_status


@extend_schema(responses={200: None})
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def download(request):
    try:
        data = file_signing.read_token(request.query_params.get("t", ""))
    except signing.SignatureExpired:
        raise PermissionDenied("انتهت صلاحية رابط التنزيل. اطلب رابطًا جديدًا من لوحة التحكم.")
    except signing.BadSignature:
        raise PermissionDenied("رابط التنزيل غير صالح.")
    user = get_user_model().objects.filter(pk=data.get("u"), is_active=True).first()
    if user is None:
        raise PermissionDenied("رابط التنزيل غير صالح.")
    f = PrivateFile.objects.filter(pk=data.get("f"), order__in=visible_orders(user)).first()
    if f is None:
        raise PermissionDenied("ليست لديك صلاحية لتنزيل هذا الملف.")
    try:
        handle = open(absolute(f.path), "rb")
    except (OSError, ValueError):
        raise Http404("الملف غير موجود على القرص.")
    response = FileResponse(handle, as_attachment=True, filename=f.original_name, content_type=f.content_type)
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


@extend_schema(responses={200: dict})
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsOperatorOrAdmin])
def storage(request):
    return Response(storage_status())
