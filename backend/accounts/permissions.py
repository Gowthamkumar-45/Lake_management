from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Role


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.SUPER_ADMIN
        )


class IsAdminOrSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (Role.SUPER_ADMIN, Role.ADMIN)
        )


class IsStaffWriteOrReadOnly(BasePermission):
    """Everyone authenticated can read.

    Only Admin / Super Admin can create/edit master data. Officers get
    write access on the renovation workflow through dedicated viewsets.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (Role.SUPER_ADMIN, Role.ADMIN)
