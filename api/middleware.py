import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class JWTDebugMiddleware:
    """Middleware too see JWT tokens in the request"""
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            logger.debug(f"🔑 JWT Token received: {token[:50]}...")
            logger.debug(f"📍 Path: {request.path}")
            logger.debug(f"👤 User: {request.user}")
        
        response = self.get_response(request)
        
        if response.status_code == 403:
            logger.error(f"❌ 403 Forbidden on {request.path}")
            logger.error(f"User authenticated: {request.user.is_authenticated}")
            logger.error(f"User: {request.user}")
        
        return response


class LastActivityMiddleware:
    """Met à jour last_activity au plus une fois par minute par utilisateur authentifié."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            now = timezone.now()
            last = getattr(user, 'last_activity', None)
            if last is None or (now - last) > timedelta(minutes=1):
                type(user).objects.filter(pk=user.pk).update(last_activity=now)
        return response