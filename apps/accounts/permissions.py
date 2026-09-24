"""Role checks. The role is read from the database user loaded for every
request by JWTAuthentication, never from token claims, so a role change or
deactivation takes effect immediately."""
from rest_framework.permissions import BasePermission

from .models import Role


class IsStaffMember(BasePermission):
    message = "ليست لديك صلاحية لهذا الإجراء."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_active and u.role in Role.values)


class IsOperatorOrAdmin(BasePermission):
    message = "هذا الإجراء متاح للمدير والمشغّل فقط."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_operator_or_admin)


class IsAdmin(BasePermission):
    message = "هذا الإجراء متاح للمدير فقط."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_admin)
