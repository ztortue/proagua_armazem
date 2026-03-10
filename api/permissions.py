# ============================================================================
# FICHIER 1: api/permissions.py - CORRECTION FINALE
# ============================================================================

from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """Only ADMIN"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == 'ADMIN' or request.user.is_superuser
        )
    
class IsManagerOrAdmin(permissions.BasePermission):
    """Manager or ADMIN"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or
            request.user.role in ['ADMIN', 'MANAGER']
        )
    # def has_permission(self, request, view):
        # return request.user.is_authenticated and (
            # request.user.is_superuser or 
            # request.user.role in ['ADMIN', 'MANAGER'] or
            # request.user.groups.filter(name='Manager').exists() or  # ✅ CORRIGÉ
            # getattr(request.user, 'is_staff', False)
        # )
    
class IsOwnerOrAdmin(permissions.BasePermission):
    """The user himself or the admin"""
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.role == 'ADMIN' or
            obj.demandeur == request.user
        )
    
class IsManager(permissions.BasePermission):
    """Manager ou Admin seulement"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']
    
class CanCreateUser(permissions.BasePermission):
    """Permission pour créer des utilisateurs - ADMIN et MANAGER uniquement"""
    def has_permission(self, request, view):
        if view.action == 'create':
            return request.user.is_authenticated and request.user.role in ['ADMIN', 'MANAGER']
        return True


class IsOperationalUser(permissions.BasePermission):
    """
    Any authenticated user except CONSULTATION can perform write/actions.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_superuser', False):
            return True
        return getattr(request.user, 'role', 'USER') != 'CONSULTATION'
