import logging

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