from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView
from rest_framework.routers import DefaultRouter

from apps.accounts.views import LoginView, LogoutView, MeView, RefreshView, StaffDirectoryViewSet, TeamViewSet
from apps.catalog.views import (
    AdminCategoryViewSet,
    AdminServiceViewSet,
    PublicCategoryViewSet,
    PublicServiceViewSet,
    service_redirect,
)
from apps.content.views import AdminFAQViewSet, AdminPageViewSet, AdminSiteSettingsView, PublicPageView, PublicSiteView
from apps.core.views import diagnostics, health
from apps.media_library.views import AssetViewSet, public_media
from apps.media_library.views import download as file_download
from apps.media_library.views import storage as storage_status
from apps.notifications.views import NotificationViewSet
from apps.inquiries.views import AdminInquiryViewSet, PublicInquiryCreateView
from apps.orders.views import (
    AdminOrderViewSet,
    PublicOrderCreateView,
    PublicTrackingLookupView,
    PublicTrackingView,
    StatusViewSet,
)

public = DefaultRouter(trailing_slash=True)
public.include_root_view = False
public.register("categories", PublicCategoryViewSet, basename="public-category")
public.register("services", PublicServiceViewSet, basename="public-service")

staff = DefaultRouter(trailing_slash=True)
staff.include_root_view = False
staff.register("categories", AdminCategoryViewSet, basename="admin-category")
staff.register("services", AdminServiceViewSet, basename="admin-service")
staff.register("orders", AdminOrderViewSet, basename="admin-order")
staff.register("statuses", StatusViewSet, basename="admin-status")
staff.register("inquiries", AdminInquiryViewSet, basename="admin-inquiry")
staff.register("faq", AdminFAQViewSet, basename="admin-faq")
staff.register("pages", AdminPageViewSet, basename="admin-page")
staff.register("assets", AssetViewSet, basename="admin-asset")
staff.register("staff", StaffDirectoryViewSet, basename="admin-staff")
staff.register("team", TeamViewSet, basename="admin-team")
staff.register("notifications", NotificationViewSet, basename="admin-notification")

api_v1 = [
    path("health/", health, name="health"),
    path("admin/diagnostics/", diagnostics, name="admin-diagnostics"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("public/site/", PublicSiteView.as_view(), name="public-site"),
    path("public/pages/<str:slug>/", PublicPageView.as_view(), name="public-page"),
    path("public/service-redirects/<str:slug>/", service_redirect, name="public-service-redirect"),
    path("public/orders/", PublicOrderCreateView.as_view(), name="public-order-create"),
    path("public/track/lookup/", PublicTrackingLookupView.as_view(), name="public-track-lookup"),
    path("public/track/<str:code>/", PublicTrackingView.as_view(), name="public-track"),
    path("public/inquiries/", PublicInquiryCreateView.as_view(), name="public-inquiry-create"),
    path("public/", include(public.urls)),
    path("files/download/", file_download, name="file-download"),
    path("admin/storage/", storage_status, name="admin-storage"),
    path("admin/settings/", AdminSiteSettingsView.as_view(), name="admin-settings"),
    path("admin/", include(staff.urls)),
]

urlpatterns = [
    path("api/v1/", include(api_v1)),
    path("media/<path:path>", public_media, name="public-media"),
]
if settings.ENABLE_DJANGO_ADMIN:
    urlpatterns.append(path("django-admin/", admin.site.urls))

if settings.DEBUG:
    from django.conf.urls.static import static

    urlpatterns += [path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema")]
    # /media/ is always served by public_media (public images only).
