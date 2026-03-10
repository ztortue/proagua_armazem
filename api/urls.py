# ============================================================================
# FICHIER 5: api/urls.py - NOUVO ROUTES
# ============================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView
from . import views

router = DefaultRouter()
router.register(r'materiais', views.MaterielViewSet)
router.register(r'estoques', views.StockEntrepotViewSet)
router.register(r'movimentos', views.MouvementViewSet)
router.register(r'pedidos', views.DemandeLotViewSet, basename='pedido')
router.register(r'users', views.UtilisateurViewSet)
router.register(r'utilisateurs-final', views.UtilisateurFinalViewSet)
router.register(r'usos-tipicos', views.UsoTipicoViewSet)
router.register(r'familles', views.FamilleViewSet)
router.register(r'categories', views.CategorieViewSet)
router.register(r'souscategories', views.SousCategorieViewSet)
router.register(r'fournisseurs', views.FournisseurViewSet)
router.register(r'projets', views.ProjetChantierViewSet)
router.register(r'entrepots', views.EntrepotViewSet)  # ✅ NOUVO
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'audit-logs', views.AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', views.me_view, name='me'),
    path('config/', views.config_view, name='config'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('alertes-stock/', views.alertes_stock, name='alertes_stock'),
    path('materiais-stock/', views.materiais_stock, name='materiais_stock'),
    path('relatorios/stock/', views.relatorio_stock, name='relatorio_stock'),
    path('relatorios/movimentos/', views.relatorio_movimentos, name='relatorio_movimentos'),
    path('relatorios/operacoes/', views.relatorio_operacoes, name='relatorio_operacoes'),
]
