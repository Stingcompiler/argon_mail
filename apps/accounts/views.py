"""JWT auth endpoints.

* access token: returned in the JSON body, kept in memory by the frontend.
* refresh token: set as an HttpOnly, Secure, SameSite=Strict cookie scoped to
  /api/v1/auth/. Only login, refresh and logout read it.
* Those three endpoints also require an Origin/Referer from a trusted origin,
  which together with SameSite=Strict protects them from CSRF.
"""
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import get_md5_hash_password

from apps.core.throttles import ScopedIPThrottle

from .models import User
from .permissions import IsAdmin, IsStaffMember
from .serializers import LoginSerializer, TeamMemberWriteSerializer, UserBriefSerializer, UserSerializer


def _origin_of(value: str) -> str:
    parts = urlsplit(value or "")
    return f"{parts.scheme}://{parts.netloc}" if parts.scheme and parts.netloc else ""


def check_trusted_origin(request):
    origin = request.META.get("HTTP_ORIGIN") or _origin_of(request.META.get("HTTP_REFERER", ""))
    if origin not in settings.TRUSTED_ORIGINS:
        raise PermissionDenied("مصدر الطلب غير موثوق.")


def set_refresh_cookie(response, refresh: RefreshToken):
    cfg = settings.REFRESH_COOKIE
    response.set_cookie(
        cfg["name"],
        str(refresh),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path=cfg["path"],
        secure=cfg["secure"],
        httponly=cfg["httponly"],
        samesite=cfg["samesite"],
    )


def clear_refresh_cookie(response):
    cfg = settings.REFRESH_COOKIE
    response.delete_cookie(cfg["name"], path=cfg["path"], samesite=cfg["samesite"])


def session_payload(user, refresh: RefreshToken):
    return {"access": str(refresh.access_token), "user": UserSerializer(user).data}


class AuthBaseView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedIPThrottle]
    throttle_scope = "auth"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        check_trusted_origin(request)

    def get_authenticate_header(self, request):
        # Makes DRF answer 401 (not 403) for bad credentials or expired sessions.
        return 'Bearer realm="api"'


class LoginView(AuthBaseView):
    @extend_schema(request=LoginSerializer, responses={200: dict})
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ident = s.validated_data["login"]
        if "@" not in ident:
            # Username alias → the account's e-mail. An unknown username still
            # goes through authenticate() so timing and the error stay the same.
            ident = User.objects.filter(username=ident).values_list("email", flat=True).first() or f"{ident}@invalid"
        user = authenticate(request, email=ident, password=s.validated_data["password"])
        if user is None or not user.is_active:
            raise AuthenticationFailed("بيانات الدخول غير صحيحة.")
        refresh = RefreshToken.for_user(user)
        User.objects.filter(pk=user.pk).update(last_login=refresh.current_time)
        response = Response(session_payload(user, refresh))
        set_refresh_cookie(response, refresh)
        return response


class RefreshView(AuthBaseView):
    @extend_schema(request=None, responses={200: dict})
    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE["name"])
        if not raw:
            raise AuthenticationFailed("انتهت الجلسة. سجّل الدخول مجددًا.", code="session_expired")
        try:
            old = RefreshToken(raw)
            user = User.objects.get(pk=old[settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id")])
            # A password change revokes every existing session.
            if not user.is_active or old.get("hash_password") != get_md5_hash_password(user.password):
                raise TokenError("revoked")
            old.blacklist()
            new = RefreshToken.for_user(user)
        except (TokenError, User.DoesNotExist):
            response = Response(
                {"detail": "انتهت الجلسة. سجّل الدخول مجددًا.", "code": "session_expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response
        response = Response(session_payload(user, new))
        set_refresh_cookie(response, new)
        return response


class LogoutView(AuthBaseView):
    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE["name"])
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class StaffDirectoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Active staff, for the assignee picker. Visible to every staff role."""

    permission_classes = [IsAuthenticated, IsStaffMember]
    serializer_class = UserBriefSerializer
    pagination_class = None
    queryset = User.objects.filter(is_active=True)


class TeamViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """Team management, admin only. Members are deactivated, never deleted,
    so the history of who changed what stays intact."""

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all()
    pagination_class = None

    def get_serializer_class(self):
        return UserSerializer if self.action == "list" else TeamMemberWriteSerializer

    def perform_update(self, serializer):
        if serializer.instance == self.request.user and (
            serializer.validated_data.get("is_active") is False
            or serializer.validated_data.get("role", self.request.user.role) != self.request.user.role
        ):
            raise PermissionDenied("لا يمكنك تعطيل حسابك أو تغيير دورك بنفسك.")
        serializer.save()
