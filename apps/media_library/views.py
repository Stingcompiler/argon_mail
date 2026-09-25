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
from django.db import transaction
from django.db.models import ProtectedError
from django.http import Http404
from rest_framework import mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser, MultiPartParser

from .images import new_public_path, process_public_image
from .models import PublicAsset
from .serializers import AssetSerializer
from .storage import absolute, ensure_capacity, public_absolute, storage_status, store_public


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


CONTENT_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


@extend_schema(responses={200: None})
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def public_media(request, path):
    """Public images only (assets/...). Names are random and immutable, so
    they are cached for a year. Private attachments live elsewhere and are
    never reachable here."""
    ext = path.rsplit(".", 1)[-1].lower()
    if not path.startswith("assets/") or ext not in CONTENT_TYPES:
        raise Http404
    try:
        handle = open(public_absolute(path), "rb")
    except (OSError, ValueError):
        raise Http404
    response = FileResponse(handle, content_type=CONTENT_TYPES[ext])
    response["Cache-Control"] = "public, max-age=31536000, immutable"
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "default-src 'none'; sandbox"
    return response


class AssetViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin,
                   mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Media library. Upload = multipart `file` + `alt_text`. Only the alt
    text can be edited. An image in use (service, logo, hero) is not deleted."""

    permission_classes = [IsAuthenticated, IsOperatorOrAdmin]
    serializer_class = AssetSerializer
    parser_classes = [MultiPartParser, JSONParser]
    pagination_class = None

    def get_queryset(self):
        return PublicAsset.objects.prefetch_related("services")

    def create(self, request, *args, **kwargs):
        s = AssetSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"file": ["اختر صورة."]})
        try:
            img = process_public_image(upload)
        except ValidationError as e:
            raise ValidationError({"file": e.detail if isinstance(e.detail, list) else [str(e.detail)]})
        ensure_capacity(len(img["data"]))
        path = new_public_path(img["ext"])
        store_public(path, img["data"])
        try:
            with transaction.atomic():
                asset = PublicAsset.objects.create(
                    path=path, original_name=img["original_name"], alt_text=s.validated_data["alt_text"],
                    content_type=img["content_type"], size=len(img["data"]), width=img["width"], height=img["height"],
                    uploaded_by=request.user,
                )
        except BaseException:
            public_absolute(path).unlink(missing_ok=True)
            raise
        return Response(AssetSerializer(asset).data, status=201)

    def destroy(self, request, *args, **kwargs):
        asset = self.get_object()
        if asset.usage():
            return Response({"detail": "الصورة مستخدمة في: " + "، ".join(asset.usage()) + ". أزلها من هناك أولًا.",
                             "code": "protected"}, status=409)
        path = asset.path
        try:
            asset.delete()
        except ProtectedError:
            return Response({"detail": "الصورة مستخدمة.", "code": "protected"}, status=409)
        public_absolute(path).unlink(missing_ok=True)
        return Response(status=204)
