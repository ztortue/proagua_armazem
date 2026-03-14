from django.db.models import Sum, Q, F, Max, Count
from django.db.models.functions import Coalesce
from django.conf import settings
from django.db import transaction
from django.core.cache import cache
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from django.forms.models import model_to_dict
import csv
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    Famille, Materiel, MaterielFournisseur, StockEntrepot, Mouvement, DemandeLot, DemandeItem, PedidoFormulario,
    RecebimentoHistorico,
    ProjetChantier, Utilisateur, UtilisateurFinal, UsoTipico, Categorie, SousCategorie, Fournisseur, Entrepot, Notification, AuditLog
)
from .serializers import (
    FamilleSerializer, MaterielSerializer, StockEntrepotSerializer, MouvementSerializer,
    DemandeLotSerializer, DemandeLotCreateSerializer, ProjetChantierSerializer, UtilisateurSerializer,
    CategorieSerializer, SousCategorieSerializer, FournisseurSerializer, EntrepotSerializer, UtilisateurFinalSerializer, UsoTipicoSerializer,
    PedidoFormularioSerializer, NotificationSerializer, RecebimentoHistoricoSerializer, AuditLogSerializer,
)
from .permissions import IsAdmin, IsManagerOrAdmin, IsOperationalUser, IsOwnerOrAdmin


def _is_all_pilier_user(user):
    return user.role == 'ADMIN' or getattr(user, 'pilier_affectation', 'TODOS') == 'TODOS'


def _filter_by_user_pilier(queryset, user, field_path):
    if _is_all_pilier_user(user):
        return queryset
    pilier = getattr(user, 'pilier_affectation', None)
    if not pilier:
        return queryset.none()
    return queryset.filter(**{field_path: pilier})


def _audit_log(user, action, module, obj=None, reference='', changes='', snapshot=None):
    """
    Central helper for audit entries.
    Keeps logging resilient: audit failure must not break business flow.
    """
    try:
        model_name = obj.__class__.__name__ if obj is not None else module
        object_id = getattr(obj, 'id', 0) or 0
        ref_value = reference or getattr(obj, 'reference', '') or getattr(obj, 'code', '') or ''
        snap = snapshot if snapshot is not None else {}

        if obj is not None and not snap:
            try:
                snap = model_to_dict(obj)
            except Exception:
                snap = {'repr': str(obj)}

        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=str(action).upper(),
            module=module,
            model_name=model_name,
            object_id=object_id,
            reference=str(ref_value),
            changes=(changes or '')[:2000],
            snapshot=snap or {},
        )
    except Exception:
        # Do not block core transaction because of audit issues.
        pass

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def config_view(request):
    page_size = settings.REST_FRAMEWORK.get('PAGE_SIZE', 20)
    return Response({'page_size': page_size})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    data = {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'email': user.email or '',
        'poste': user.poste or 'Não definido',
        'service': user.service or 'Não definido',
        'telephone': user.telephone or '',
        'role': user.role,
        'pilier_affectation': user.pilier_affectation,
        'is_active': user.is_active,
    }
    return Response(data)


# ============================================================================
# FICHIER 3: api/views.py - MaterielViewSet avec création de stock initial
# ============================================================================

class MaterielViewSet(viewsets.ModelViewSet):
    queryset = Materiel.objects.all().order_by('code')
    serializer_class = MaterielSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categorie', 'souscategorie', 'categorie__famille', 'fournisseur', 'diametre_nominal', 'pression_nominal', 'usage_typique']
    search_fields = ['code', 'description', 'type_materiau']
    ordering_fields = ['code', 'stock_actuel', 'prix_unitaire']
    ordering = ['code']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        return [IsOperationalUser()]

    def get_queryset(self):
        qs = Materiel.objects.all().order_by('code')
        requested_pilier = self.request.query_params.get('pilier')
        requested_entrepot = self.request.query_params.get('entrepot')
        user = self.request.user

        allowed_piliers = {'PILAR1', 'PILAR2', 'PILAR3'}
        if requested_pilier in allowed_piliers:
            qs = qs.filter(
                Q(stocks__entrepot__projet__pilier=requested_pilier) |
                Q(stocks__entrepot__projet__isnull=True) |
                Q(entrepot_principal__projet__pilier=requested_pilier) |
                Q(entrepot_principal__projet__isnull=True)
            )
        elif not _is_all_pilier_user(user):
            pilier = getattr(user, 'pilier_affectation', None)
            if pilier:
                qs = qs.filter(
                    Q(stocks__entrepot__projet__pilier=pilier) |
                    Q(stocks__entrepot__projet__isnull=True) |
                    Q(entrepot_principal__projet__pilier=pilier) |
                    Q(entrepot_principal__projet__isnull=True)
                )
            else:
                qs = qs.none()

        if requested_entrepot and str(requested_entrepot).isdigit():
            qs = qs.filter(
                Q(stocks__entrepot_id=int(requested_entrepot)) |
                Q(entrepot_principal_id=int(requested_entrepot))
            )

        return qs.distinct()
    
    def perform_create(self, serializer):
        """Creer stock initial dans le depot principal du materiel."""
        with transaction.atomic():
            materiel = serializer.save(created_by=self.request.user, updated_by=self.request.user)

            entrepot_default = materiel.entrepot_principal

            if entrepot_default:
                StockEntrepot.objects.create(
                    materiel=materiel,
                    entrepot=entrepot_default,
                    quantite=0
                )
                print(f"Stock initial cree pour {materiel.code} dans {entrepot_default.nom}")

            _audit_log(
                self.request.user,
                'CREATE',
                'MATERIAIS',
                obj=materiel,
                changes='Criacao de material.',
            )
            return materiel

    def perform_update(self, serializer):
        materiel = serializer.save(updated_by=self.request.user)
        _audit_log(
            self.request.user,
            'UPDATE',
            'MATERIAIS',
            obj=materiel,
            changes='Atualizacao de material.',
        )

    def perform_destroy(self, instance):
        _audit_log(
            self.request.user,
            'DELETE',
            'MATERIAIS',
            obj=instance,
            changes='Remocao de material.',
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        queryset = self.get_queryset().annotate(
            stock_total_agg=Coalesce(Sum('stocks__quantite'), 0)
        ).filter(stock_total_agg__lt=F('stock_min'))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ===================================================================
# STOCK ENTREPOT - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class StockEntrepotViewSet(viewsets.ModelViewSet):
    queryset = StockEntrepot.objects.select_related('materiel', 'entrepot', 'emplacement')
    serializer_class = StockEntrepotSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['entrepot', 'materiel', 'status']
    ordering_fields = ['quantite']
    ordering = ['-quantite']

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - Tout moun otantifye
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        # MANAGER/ADMIN sèlman pou CREATE/UPDATE/DELETE
        return [IsManagerOrAdmin()]

    def get_queryset(self):
        qs = StockEntrepot.objects.select_related('materiel', 'entrepot', 'emplacement')

        # Transfer mode: allow reading stock from selected origem entrepot,
        # even when user's default pilier visibility is narrower.
        transfer_mode = self.request.query_params.get('mode') == 'transfer'
        if transfer_mode:
            entrepot_id = self.request.query_params.get('entrepot')
            if entrepot_id and str(entrepot_id).isdigit():
                return qs.filter(entrepot_id=int(entrepot_id)).order_by('-quantite')
            return qs.none()

        qs = _filter_by_user_pilier(qs, self.request.user, 'entrepot__projet__pilier')
        return qs.order_by('-quantite')

    def perform_create(self, serializer):
        stock = serializer.save()
        _audit_log(
            self.request.user,
            'CREATE',
            'ESTOQUE',
            obj=stock,
            changes='Criacao de linha de estoque.',
        )

    def perform_update(self, serializer):
        stock = serializer.save()
        _audit_log(
            self.request.user,
            'UPDATE',
            'ESTOQUE',
            obj=stock,
            changes='Atualizacao de linha de estoque.',
        )

    def perform_destroy(self, instance):
        _audit_log(
            self.request.user,
            'DELETE',
            'ESTOQUE',
            obj=instance,
            changes='Remocao de linha de estoque.',
        )
        instance.delete()


# ===================================================================
# MOUVEMENT - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class MouvementViewSet(viewsets.ModelViewSet):
    queryset = Mouvement.objects.select_related('materiel', 'entrepot', 'demandeur', 'projet').order_by('-date_mvt')
    serializer_class = MouvementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]

        # Mise a jour regle metier: tout utilisateur authentifie ka create
        # mouvements (POST). Modif/suppression rete limite a admin.
        if self.action == 'create':
            return [IsAuthenticated()]

        return [IsAdmin()]

    def get_queryset(self):
        qs = Mouvement.objects.select_related('materiel', 'entrepot', 'demandeur', 'projet')
        user = self.request.user
        if _is_all_pilier_user(user):
            return qs.order_by('-date_mvt')
        pilier = getattr(user, 'pilier_affectation', None)
        if not pilier:
            return qs.none()
        return qs.filter(
            Q(entrepot__projet__pilier=pilier) | Q(projet__pilier=pilier)
        ).order_by('-date_mvt').distinct()

    def perform_create(self, serializer):
        with transaction.atomic():
            mvt = serializer.save(demandeur=self.request.user)
            entrepot_destino_id = self.request.data.get('entrepot_destino_id')

            # Jere stock (jan ou te pwopoze)
            if not mvt.entrepot:
                raise ValidationError({"entrepot": "Depósito obrigatório."})

            stock, _ = StockEntrepot.objects.select_for_update().get_or_create(
                materiel=mvt.materiel,
                entrepot=mvt.entrepot,
                defaults={"quantite": 0}
            )

            if mvt.type_mvt == "ENTREE":
                if not mvt.fournisseur_id:
                    raise ValidationError({"fournisseur": "Fornecedor obrigatorio para entrada de estoque."})
                stock.quantite += mvt.quantite
                MaterielFournisseur.objects.get_or_create(
                    materiel=mvt.materiel,
                    fournisseur=mvt.fournisseur,
                )
            elif mvt.type_mvt in ["SORTIE", "TRANSFERT"]:
                if stock.quantite < mvt.quantite:
                    raise ValidationError({"quantite": "Estoque insuficiente."})
                stock.quantite -= mvt.quantite
                if mvt.type_mvt == "TRANSFERT":
                    if not entrepot_destino_id:
                        raise ValidationError({"entrepot_destino_id": "Depósito de destino obrigatório para transferência."})
                    entrepot_destino = Entrepot.objects.filter(id=entrepot_destino_id).first()
                    if not entrepot_destino:
                        raise ValidationError({"entrepot_destino_id": "Depósito de destino inválido."})
                    if entrepot_destino.id == mvt.entrepot_id:
                        raise ValidationError({"entrepot_destino_id": "Origem e destino não podem ser iguais."})
                    stock_destino, _ = StockEntrepot.objects.select_for_update().get_or_create(
                        materiel=mvt.materiel,
                        entrepot=entrepot_destino,
                        defaults={"quantite": 0}
                    )
                    stock_destino.quantite += mvt.quantite
                    stock_destino.save()
            elif mvt.type_mvt == "RETOUR":
                stock.quantite += mvt.quantite

            stock.save()

            # ← INVALIDE CACHE POU STOCK AKTYÈL
            from django.core.cache import cache
            cache.delete(f"stock_actuel_{mvt.materiel_id}")

            # Opsyonèl: invalide cache pou lis stock pa depo
            cache.delete(f"stock_entrepot_{mvt.entrepot_id}")
            if mvt.type_mvt == "TRANSFERT" and entrepot_destino_id:
                cache.delete(f"stock_entrepot_{entrepot_destino_id}")

            _audit_log(
                self.request.user,
                'CREATE',
                'MOVIMENTOS',
                obj=mvt,
                changes=f"Movimento {mvt.type_mvt} quantidade {mvt.quantite}.",
            )

    def perform_update(self, serializer):
        mvt = serializer.save()
        _audit_log(
            self.request.user,
            'UPDATE',
            'MOVIMENTOS',
            obj=mvt,
            changes='Atualizacao de movimento.',
        )

    def perform_destroy(self, instance):
        _audit_log(
            self.request.user,
            'DELETE',
            'MOVIMENTOS',
            obj=instance,
            changes='Remocao de movimento.',
        )
        instance.delete()

    @action(detail=False, methods=['get'], url_path='materiels')
    def materiels(self, request):
        qs = _filter_by_user_pilier(
            Materiel.objects.all().order_by('code'),
            request.user,
            'stocks__entrepot__projet__pilier',
        ).distinct()
        return Response(MaterielSerializer(qs, many=True).data)


# ===================================================================
# DEMANDE LOT - ✅ FIX PERMISSIONS ICI!
# ===================================================================
class DemandeLotViewSet(viewsets.ModelViewSet):
    queryset = DemandeLot.objects.select_related('demandeur', 'projet').prefetch_related('items__materiel').order_by('-date_demande')
    serializer_class = DemandeLotSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return DemandeLotCreateSerializer
        return DemandeLotSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - TOUT MOUN OTANTIFYE KA WÈ
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]

        if self.action == 'formulario':
            if self.request.method == 'GET':
                return [IsAuthenticated()]
            return [IsOperationalUser()]

        if self.action == 'historico_recebimento':
            return [IsAuthenticated()]

        if self.action == 'confirmar_recebimento':
            return [IsOperationalUser()]
        
        # MANAGER/ADMIN sèlman pou APPROVE/REFUSE/DELIVER
        if self.action in ['valider', 'approuver', 'refuser', 'livrer']:
            return [IsOperationalUser()]
        
        # OWNER oswa ADMIN pou UPDATE/DELETE
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsOwnerOrAdmin()]
        
        # CREATE - tout moun sof CONSULTATION
        return [IsOperationalUser()]

    def get_queryset(self):
        """Filtrer pedidos selon role"""
        user = self.request.user
        consultation_q = Q(is_consultation=True)
        pilier_filter = {'items__entrepot__projet__pilier': user.pilier_affectation}
        
        # ADMIN wè tout bagay
        if user.role == 'ADMIN':
            qs = DemandeLot.objects.all()
            if not _is_all_pilier_user(user):
                qs = qs.filter(**pilier_filter)
            return qs.distinct().order_by('-date_demande')
        
        # MANAGER wè sèlman pedidos nan pwojè yo responsab
        if user.role == 'MANAGER':
            projets = ProjetChantier.objects.filter(responsable=user)
            qs = DemandeLot.objects.filter(
                consultation_q | Q(demandeur=user) | Q(projet__in=projets)
            )
            if not _is_all_pilier_user(user):
                qs = qs.filter(**pilier_filter)
            return qs.distinct().order_by('-date_demande')
        
        # USER wè sèlman pedidos pa yo
        qs = DemandeLot.objects.filter(consultation_q | Q(demandeur=user))
        if not _is_all_pilier_user(user):
            qs = qs.filter(**pilier_filter)
        return qs.distinct().order_by('-date_demande')

    def perform_create(self, serializer):
        demande = serializer.save(
            demandeur=self.request.user,
            is_consultation=(self.request.user.role == 'CONSULTATION'),
            created_by=self.request.user,
            updated_by=self.request.user,
        )
        _audit_log(
            self.request.user,
            'CREATE',
            'OPERACOES',
            obj=demande,
            changes='Criacao de operação.',
        )
        return demande

    @staticmethod
    def _recebimento_progress(demande):
        pending_items = []
        for item in demande.items.all():
            qtd_base = item.quantite_approuvee or item.quantite_demandee or 0
            qtd_entregue = item.quantite_entregue or 0
            if qtd_entregue < qtd_base:
                pending_items.append({
                    'id': item.id,
                    'materiel_id': item.materiel_id,
                    'materiel_code': item.materiel.code,
                    'quantite_pendente': qtd_base - qtd_entregue,
                })
        return {
            'is_closed': len(pending_items) == 0,
            'pending_items': pending_items,
            'pending_count': len(pending_items),
        }

    @staticmethod
    def _notification_recipients_for_demande(demande):
        return Utilisateur.objects.filter(
            is_active=True
        ).filter(
            Q(id=demande.demandeur_id) | Q(pilier_affectation='TODOS')
        ).distinct()

    @staticmethod
    def _notify_demande(demande, notif_type: str, message: str):
        recipients_qs = DemandeLotViewSet._notification_recipients_for_demande(demande)
        for user in recipients_qs:
            notif, created = Notification.objects.get_or_create(
                user=user,
                type=notif_type,
                message=message,
                defaults={'lu': False},
            )
            if not created and notif.lu:
                notif.lu = False
                notif.save(update_fields=['lu'])

    @action(detail=False, methods=['get'], url_path='recebimento-pendente-summary')
    def recebimento_pendente_summary(self, request):
        user = request.user
        qs = DemandeLot.objects.select_related('demandeur', 'projet').filter(
            statut='ENTREGUE',
            formulario__tipo_fluxo='COMPRAS'
        ).prefetch_related('items__materiel')

        # Regle metier: visibilite reminder/summary
        # - user normal: selman operasyon li menm li kreye
        # - user TODOS / ADMIN: tout operasyon
        if not _is_all_pilier_user(user):
            qs = qs.filter(demandeur=user)

        pedidos = []
        total_items_pendentes = 0
        total_quantite_pendente = 0

        for demande in qs:
            progress = self._recebimento_progress(demande)
            if progress['is_closed']:
                continue
            qty_pendente = sum(x['quantite_pendente'] for x in progress['pending_items'])
            total_items_pendentes += progress['pending_count']
            total_quantite_pendente += qty_pendente
            pedidos.append({
                'id': demande.id,
                'reference': demande.reference,
                'date_demande': demande.date_demande,
                'pending_count': progress['pending_count'],
                'quantite_pendente': qty_pendente,
            })

        return Response({
            'total_pedidos_pendentes': len(pedidos),
            'total_items_pendentes': total_items_pendentes,
            'total_quantite_pendente': total_quantite_pendente,
            'pedidos': pedidos[:10],
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = serializer.save(
            demandeur=request.user,
            is_consultation=(request.user.role == 'CONSULTATION'),
            created_by=request.user,
            updated_by=request.user,
        )
        _audit_log(
            request.user,
            'CREATE',
            'OPERACOES',
            obj=demande,
            changes='Criacao de operação.',
        )
        output_serializer = DemandeLotSerializer(demande, context={'request': request})
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        demande = serializer.save(updated_by=self.request.user)
        _audit_log(
            self.request.user,
            'UPDATE',
            'OPERACOES',
            obj=demande,
            changes='Atualizacao de operação.',
        )

    def perform_destroy(self, instance):
        _audit_log(
            self.request.user,
            'DELETE',
            'OPERACOES',
            obj=instance,
            changes='Remocao de operação.',
        )
        instance.delete()

    @action(detail=True, methods=['get', 'patch'], url_path='formulario')
    def formulario(self, request, pk=None):
        demande = self.get_object()
        formulario, _ = PedidoFormulario.objects.get_or_create(
            demande_lot=demande,
            defaults={
                'solicitado_por': demande.demandeur,
                'solicitado_em': demande.date_demande,
            }
        )
        fluxo_atual = (formulario.tipo_fluxo or 'INSTALACAO').upper()
        is_saida_flow_atual = fluxo_atual in ['INSTALACAO', 'EMPRESTIMO', 'TRANSFERENCIA', 'DEVOLUCAO']
        if is_saida_flow_atual and not formulario.numero_formulario_saida:
            base = timezone.localdate().strftime("%d%m%y")
            formulario.numero_formulario_saida = f"SAI-{base}-{demande.id:04d}"
            formulario.save(update_fields=['numero_formulario_saida', 'updated_at'])
        if request.method == 'GET':
            return Response(PedidoFormularioSerializer(formulario).data)
        payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        item_datas = payload.pop('item_datas_necessarias', None)
        tipo_fluxo_efetivo = str(payload.get('tipo_fluxo') or formulario.tipo_fluxo or '').upper()
        is_saida_flow = tipo_fluxo_efetivo in ['INSTALACAO', 'EMPRESTIMO', 'TRANSFERENCIA', 'DEVOLUCAO']
        is_workflow_final = demande.statut in ['ENTREGUE', 'RECEBIDA']
        all_dates_already_filled = not demande.items.filter(data_necessaria__isnull=True).exists()

        if is_saida_flow and is_workflow_final and all_dates_already_filled:
            return Response(
                {"detail": "Formulário de saída já fechado. Nenhuma alteração adicional é permitida."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if is_saida_flow and is_workflow_final and payload:
            return Response(
                {"detail": "No estado final, apenas a Data Necessaria dos itens pode ser atualizada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if item_datas is not None:
            if not isinstance(item_datas, list):
                return Response(
                    {"detail": "Formato invalido para item_datas_necessarias."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            items_map = {it.id: it for it in demande.items.all()}
            for row in item_datas:
                if not isinstance(row, dict):
                    return Response({"detail": "Entrada invalida em item_datas_necessarias."}, status=status.HTTP_400_BAD_REQUEST)
                item_id = row.get('item_id')
                data_raw = row.get('data_necessaria')
                if not item_id:
                    continue
                item = items_map.get(int(item_id))
                if not item:
                    return Response({"detail": f"Item {item_id} não pertence a esta operação."}, status=status.HTTP_400_BAD_REQUEST)
                if data_raw in [None, '']:
                    continue
                parsed = parse_date(str(data_raw))
                if not parsed:
                    return Response({"detail": f"Data invalida para item {item_id}."}, status=status.HTTP_400_BAD_REQUEST)
                if item.data_necessaria != parsed:
                    item.data_necessaria = parsed
                    item.save(update_fields=['data_necessaria'])

            if is_saida_flow and is_workflow_final and demande.items.filter(data_necessaria__isnull=True).exists():
                return Response(
                    {"detail": "Preencha a Data Necessaria de todos os itens para fechar definitivamente o formulario."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        progress = self._recebimento_progress(demande)
        if progress['is_closed'] and formulario.recebido_em:
            return Response(
                {"detail": "Recebimento finalizado. Formulário bloqueado para alterações."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if payload:
            serializer = PedidoFormularioSerializer(formulario, data=payload, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(PedidoFormularioSerializer(formulario).data)

    @action(detail=True, methods=['get'], url_path='historico-recebimento')
    def historico_recebimento(self, request, pk=None):
        demande = self.get_object()
        qs = (
            RecebimentoHistorico.objects
            .select_related('item__materiel', 'recebido_por')
            .filter(demande_lot=demande)
            .order_by('-numero_sessao', 'item_id')
        )
        return Response(RecebimentoHistoricoSerializer(qs, many=True).data)


    @action(detail=True, methods=['post'], url_path='valider')
    def valider(self, request, pk=None):
        demande = self.get_object()
        
        # Selman si demann nan nan eta Brouillon
        if demande.statut != 'BROUILLON':
            return Response(
                {"detail": "Jâ foi validado, por favor escolha outra."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Valide
        demande.statut = 'EN_ATTENTE'
        demande.updated_by = request.user
        demande.save(update_fields=['statut', 'updated_by', 'updated_at'])
        formulario, _ = PedidoFormulario.objects.get_or_create(
            demande_lot=demande,
            defaults={
                'solicitado_por': demande.demandeur,
                'solicitado_em': demande.date_demande,
            }
        )
        formulario.validado_por = request.user
        formulario.validado_em = timezone.now()
        formulario.save(update_fields=['validado_por', 'validado_em', 'updated_at'])
        self._notify_demande(
            demande,
            'OPERACAO_PENDENTE',
            f"[PEDIDO:{demande.id}] Operação pendente de aprovacao: {demande.reference or f'#{demande.id}'}."
        )
        _audit_log(
            request.user,
            'VALIDACAO',
            'OPERACOES',
            obj=demande,
            changes='Operação validada.',
        )

        return Response({
            "detail": "Pedido validado com sucesso.",
            "statut": demande.statut
        })

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        demande = self.get_object()
        formulario_preview = PedidoFormulario.objects.filter(demande_lot=demande).first()
        tipo_fluxo = ((formulario_preview.tipo_fluxo if formulario_preview else None) or 'INSTALACAO').upper()
        if tipo_fluxo == 'COMPRAS' and request.user.role not in ['MANAGER', 'ADMIN']:
            return Response(
                {"detail": "Aprovacao de compras permitida apenas para Manager/Admin."},
                status=status.HTTP_403_FORBIDDEN
            )
        if demande.statut != 'EN_ATTENTE':
            return Response({"detail": "Demanda já foi processada."}, status=status.HTTP_400_BAD_REQUEST)
        demande.approuver(request.user)
        formulario, _ = PedidoFormulario.objects.get_or_create(
            demande_lot=demande,
            defaults={
                'solicitado_por': demande.demandeur,
                'solicitado_em': demande.date_demande,
            }
        )
        formulario.aprovado_por = request.user
        formulario.aprovado_em = timezone.now()
        formulario.save(update_fields=['aprovado_por', 'aprovado_em', 'updated_at'])
        self._notify_demande(
            demande,
            'ENTREGA_PENDENTE',
            f"[PEDIDO:{demande.id}] Operação pendente de entrega: {demande.reference or f'#{demande.id}'}."
        )
        _audit_log(
            request.user,
            'APROVACAO',
            'OPERACOES',
            obj=demande,
            changes='Operação aprovada.',
        )
        return Response({"detail": "Demanda aprovada com sucesso!"})

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'EN_ATTENTE':
            return Response({"detail": "Demanda já foi processada."}, status=status.HTTP_400_BAD_REQUEST)
        raison = request.data.get('raison_refus', 'Sem motivo')
        demande.refuser(raison)
        demande.updated_by = request.user
        demande.save(update_fields=['updated_by', 'updated_at'])
        Notification.objects.filter(
            type__in=['OPERACAO_PENDENTE', 'ENTREGA_PENDENTE'],
            message__contains=f"[PEDIDO:{demande.id}]"
        ).update(lu=True)
        _audit_log(
            request.user,
            'RECUSA',
            'OPERACOES',
            obj=demande,
            changes=f'Operação recusada. Motivo: {raison}',
        )
        return Response({"detail": "Demanda recusada."})

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        """
        Marquer comme livré ET diminuer le stock
        ✅ CORRECTION: Gère le cas où projet est None
        ✅ D1: INSTALACAO et ENTRADA ne nécessitent pas d'approbation manager
        """
        demande = self.get_object()

        # D1: INSTALACAO et ENTRADA → flux simplifié sans approbation
        formulario_existant = PedidoFormulario.objects.filter(demande_lot=demande).first()
        tipo_fluxo_preview = (
            (formulario_existant.tipo_fluxo if formulario_existant else None) or 'INSTALACAO'
        ).upper()

        FLUXOS_SEM_APROVACAO = ['INSTALACAO', 'ENTRADA', 'TRANSFERENCIA', 'DEVOLUCAO']
        if tipo_fluxo_preview not in FLUXOS_SEM_APROVACAO:
            if demande.statut != 'APPROUVEE':
                return Response({"detail": "Somente demandas aprovadas podem ser entregues."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if demande.statut not in ['BROUILLON', 'EN_ATTENTE', 'APPROUVEE']:
                return Response({"detail": "Operação não pode ser entregue com o statuto atual."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                formulario, _ = PedidoFormulario.objects.get_or_create(
                    demande_lot=demande,
                    defaults={
                        'solicitado_por': demande.demandeur,
                        'solicitado_em': demande.date_demande,
                    }
                )
                tipo_fluxo = (formulario.tipo_fluxo or 'INSTALACAO').upper()

                if tipo_fluxo in ['INSTALACAO', 'EMPRESTIMO']:
                    for item in demande.items.all():
                        quantite = item.quantite_approuvee or item.quantite_demandee
                        entrepot = (
                            item.entrepot
                            or (demande.projet.entrepots.first() if demande.projet else None)
                            or item.materiel.entrepot_principal
                            or Entrepot.objects.first()
                        )
                        if not entrepot:
                            return Response(
                                {"detail": f"Nenhum depósito definido para o material {item.materiel.code}."},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                        stock = StockEntrepot.objects.select_for_update().filter(
                            materiel=item.materiel,
                            entrepot=entrepot
                        ).first()
                        if not stock or stock.quantite < quantite:
                            raise Exception(
                                f"Estoque insuficiente para {item.materiel.code}. "
                                f"Depósito: {entrepot.nom}. "
                                f"Necessário: {quantite}, Disponível: {stock.quantite if stock else 0}"
                            )

                        stock.quantite -= quantite
                        stock.save()

                        Mouvement.objects.create(
                            type_mvt='SORTIE',
                            quantite=quantite,
                            materiel=item.materiel,
                            entrepot=entrepot,
                            projet=demande.projet,
                            demandeur=demande.demandeur,
                            raison=f"Entrega do pedido #{demande.id}"
                        )
                        cache.delete(f"stock_actuel_{item.materiel.id}")

                elif tipo_fluxo == 'COMPRAS':
                    entrepot_destino_id = request.data.get('entrepot_destino_id')
                    if entrepot_destino_id:
                        entrepot_destino = Entrepot.objects.filter(id=entrepot_destino_id).first()
                    else:
                        entrepot_destino = formulario.entrepot_destino or (demande.projet.entrepots.first() if demande.projet else None)
                    if not entrepot_destino:
                        return Response(
                            {"detail": "Defina o depósito de destino para Compras antes de confirmar o recebimento."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    if entrepot_destino_id:
                        formulario.entrepot_destino = entrepot_destino

                    # Em COMPRAS, o estoque não e atualizado na entrega.
                    # A entrada real ocorre em confirmar-recebimento, com a quantidade efetivamente recebida.

                elif tipo_fluxo == 'ENTRADA':
                    for item in demande.items.all():
                        quantite = item.quantite_approuvee or item.quantite_demandee
                        entrepot_destino = (
                            item.entrepot
                            or formulario.entrepot_destino
                            or (demande.projet.entrepots.first() if demande.projet else None)
                            or item.materiel.entrepot_principal
                            or Entrepot.objects.first()
                        )
                        if not entrepot_destino:
                            return Response(
                                {"detail": f"Nenhum deposito definido para entrada do material {item.materiel.code}."},
                                status=status.HTTP_400_BAD_REQUEST
                            )

                        stock, _ = StockEntrepot.objects.select_for_update().get_or_create(
                            materiel=item.materiel,
                            entrepot=entrepot_destino,
                            defaults={'quantite': 0}
                        )
                        stock.quantite += quantite
                        stock.save(update_fields=['quantite'])

                        Mouvement.objects.create(
                            type_mvt='ENTREE',
                            quantite=quantite,
                            materiel=item.materiel,
                            entrepot=entrepot_destino,
                            projet=demande.projet or entrepot_destino.projet,
                            demandeur=demande.demandeur,
                            raison=f"Entrada externa (operação #{demande.id})"
                        )
                        cache.delete(f"stock_actuel_{item.materiel.id}")

                elif tipo_fluxo == 'TRANSFERENCIA':
                    entrepot_origem = formulario.entrepot_origem
                    entrepot_destino = formulario.entrepot_destino
                    if not entrepot_origem or not entrepot_destino:
                        return Response({"detail": "Defina depósito de origem e destino para Transferencia."}, status=status.HTTP_400_BAD_REQUEST)
                    if entrepot_origem.id == entrepot_destino.id:
                        return Response({"detail": "Origem e destino não podem ser iguais."}, status=status.HTTP_400_BAD_REQUEST)

                    for item in demande.items.all():
                        quantite = item.quantite_approuvee or item.quantite_demandee
                        stock_origem = StockEntrepot.objects.select_for_update().filter(
                            materiel=item.materiel,
                            entrepot=entrepot_origem
                        ).first()
                        if not stock_origem or stock_origem.quantite < quantite:
                            raise Exception(
                                f"Estoque insuficiente em origem para {item.materiel.code}. "
                                f"Necessário: {quantite}, Disponível: {stock_origem.quantite if stock_origem else 0}"
                            )
                        stock_destino, _ = StockEntrepot.objects.select_for_update().get_or_create(
                            materiel=item.materiel,
                            entrepot=entrepot_destino,
                            defaults={'quantite': 0}
                        )

                        stock_origem.quantite -= quantite
                        stock_origem.save()
                        stock_destino.quantite += quantite
                        stock_destino.save()

                        Mouvement.objects.create(
                            type_mvt='SORTIE',
                            quantite=quantite,
                            materiel=item.materiel,
                            entrepot=entrepot_origem,
                            projet=entrepot_origem.projet,
                            demandeur=demande.demandeur,
                            raison=f"Transferencia (saída) pedido #{demande.id} para {entrepot_destino.nom}"
                        )
                        Mouvement.objects.create(
                            type_mvt='ENTREE',
                            quantite=quantite,
                            materiel=item.materiel,
                            entrepot=entrepot_destino,
                            projet=entrepot_destino.projet,
                            demandeur=demande.demandeur,
                            raison=f"Transferencia (entrada) pedido #{demande.id} de {entrepot_origem.nom}"
                        )
                        cache.delete(f"stock_actuel_{item.materiel.id}")
                elif tipo_fluxo == 'DEVOLUCAO':
                    origem_tipo = ''
                    origem_pedido_id = None
                    desc = demande.description or ''
                    marker = '[ORIGEM_TIPO:'
                    if marker in desc:
                        start = desc.find(marker) + len(marker)
                        end = desc.find(']', start)
                        if end > start:
                            origem_tipo = desc[start:end].strip().upper()
                    marker_id = '[ORIGEM_PEDIDO_ID:'
                    if marker_id in desc:
                        start = desc.find(marker_id) + len(marker_id)
                        end = desc.find(']', start)
                        if end > start:
                            raw_id = desc[start:end].strip()
                            if raw_id.isdigit():
                                origem_pedido_id = int(raw_id)
                    is_devolucao_compra = origem_tipo == 'COMPRAS'
                    expected_flux_by_origem = {
                        'SAIDA': 'INSTALACAO',
                        'TRANSFERENCIA': 'TRANSFERENCIA',
                        'EMPRESTIMO': 'EMPRESTIMO',
                        'COMPRAS': 'COMPRAS',
                    }
                    expected_flux = expected_flux_by_origem.get(origem_tipo)
                    if not origem_pedido_id:
                        return Response(
                            {"detail": "Referencia de origem invalida para devolucao. Selecione uma operação de origem valida."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    origem_pedido = DemandeLot.objects.select_related('formulario').filter(id=origem_pedido_id).first()
                    if not origem_pedido:
                        return Response(
                            {"detail": "Operação de origem não encontrada para devolucao."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    if origem_pedido.statut not in ['ENTREGUE', 'RECEBIDA']:
                        return Response(
                            {"detail": "A devolucao so e permitida para operações de origem ja entregues/recebidas."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    origem_flux = (getattr(origem_pedido, 'formulario', None) and origem_pedido.formulario.tipo_fluxo) or None
                    if expected_flux and origem_flux != expected_flux:
                        return Response(
                            {"detail": "Tipo da operação de origem não corresponde ao tipo de devolucao selecionado."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    for item in demande.items.all():
                        quantite = item.quantite_approuvee or item.quantite_demandee
                        entrepot_retorno = (
                            item.entrepot
                            or formulario.entrepot_destino
                            or (demande.projet.entrepots.first() if demande.projet else None)
                            or item.materiel.entrepot_principal
                            or Entrepot.objects.first()
                        )
                        if not entrepot_retorno:
                            return Response(
                                {"detail": f"Nenhum depósito definido para devolução do material {item.materiel.code}."},
                                status=status.HTTP_400_BAD_REQUEST
                            )

                        stock_retorno, _ = StockEntrepot.objects.select_for_update().get_or_create(
                            materiel=item.materiel,
                            entrepot=entrepot_retorno,
                            defaults={'quantite': 0}
                        )
                        if is_devolucao_compra:
                            if stock_retorno.quantite < quantite:
                                raise Exception(
                                    f"Estoque insuficiente para devolucao de compra do material {item.materiel.code}. "
                                    f"Deposito: {entrepot_retorno.nom}. Necessario: {quantite}, Disponivel: {stock_retorno.quantite}"
                                )
                            stock_retorno.quantite -= quantite
                        else:
                            stock_retorno.quantite += quantite
                        stock_retorno.save(update_fields=['quantite'])

                        Mouvement.objects.create(
                            type_mvt='RETOUR',
                            quantite=quantite,
                            materiel=item.materiel,
                            entrepot=entrepot_retorno,
                            projet=entrepot_retorno.projet,
                            demandeur=demande.demandeur,
                            raison=(
                                f"Devolucao para fornecedor (compra) operação #{demande.id}"
                                if is_devolucao_compra
                                else f"Devolucao (retorno) operação #{demande.id}"
                            )
                        )
                        cache.delete(f"stock_actuel_{item.materiel.id}")
                else:
                    return Response({"detail": f"Tipo de fluxo não suportado: {tipo_fluxo}"}, status=status.HTTP_400_BAD_REQUEST)

                final_status = 'RECEBIDA' if tipo_fluxo == 'ENTRADA' else 'ENTREGUE'
                demande.statut = final_status
                demande.updated_by = request.user
                demande.save(update_fields=['statut', 'updated_by', 'updated_at'])
                Notification.objects.filter(
                    type__in=['OPERACAO_PENDENTE', 'ENTREGA_PENDENTE'],
                    message__contains=f"[PEDIDO:{demande.id}]"
                ).update(lu=True)
                if tipo_fluxo == 'COMPRAS':
                    progress_after_delivery = self._recebimento_progress(demande)
                    notif_message = (
                        f"[PEDIDO:{demande.id}] Recebimento pendente: pedido {demande.reference or f'#{demande.id}'} "
                        f"tem {progress_after_delivery['pending_count']} item(ns) pendente(s)."
                    )
                    self._notify_demande(demande, 'RECEBIMENTO_PENDENTE', notif_message)
                formulario.entregue_por = request.user
                formulario.entregue_em = timezone.now()
                update_fields = ['entregue_por', 'entregue_em', 'updated_at']
                if tipo_fluxo == 'ENTRADA':
                    formulario.recebido_por = request.user
                    formulario.recebido_em = timezone.now()
                    if not formulario.estado_recebimento_geral:
                        formulario.estado_recebimento_geral = 'CONFORME'
                    update_fields.extend(['recebido_por', 'recebido_em', 'estado_recebimento_geral'])
                if tipo_fluxo == 'COMPRAS' and formulario.entrepot_destino_id:
                    update_fields.append('entrepot_destino')
                formulario.save(update_fields=update_fields)

                _audit_log(
                    request.user,
                    'ENTREGA',
                    'OPERACOES',
                    obj=demande,
                    changes=f'Entrega executada ({tipo_fluxo}).',
                )

            return Response({"detail": "Materiais entregues! Estoque atualizado."})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='confirmar-recebimento')
    def confirmar_recebimento(self, request, pk=None):
        """
        Confirma o recebimento final dos materiais entregues.
        """
        demande = self.get_object()

        data = request.data or {}
        items_payload = data.get('items', [])

        try:
            with transaction.atomic():
                formulario, _ = PedidoFormulario.objects.get_or_create(
                    demande_lot=demande,
                    defaults={
                        'solicitado_por': demande.demandeur,
                        'solicitado_em': demande.date_demande,
                    }
                )
                tipo_fluxo = (formulario.tipo_fluxo or 'INSTALACAO').upper()
                if tipo_fluxo in ['COMPRAS', 'ENTRADA']:
                    if demande.statut not in ['EN_ATTENTE', 'APPROUVEE', 'ENTREGUE', 'RECEBIDA']:
                        return Response(
                            {"detail": "Operação não está em estado válido para recebimento."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                elif demande.statut != 'ENTREGUE':
                    return Response(
                        {"detail": "Somente operações entregues podem ser confirmadas no recebimento."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                progress_before = self._recebimento_progress(demande)
                if progress_before['is_closed'] and formulario.recebido_em:
                    return Response(
                        {"detail": "Recebimento já finalizado para este pedido."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if not formulario.numero_formulario_recebimento:
                    base = timezone.localdate().strftime("%d%m%y")
                    formulario.numero_formulario_recebimento = f"REC-{base}-{demande.id:04d}"

                if 'estado_recebimento_geral' in data:
                    formulario.estado_recebimento_geral = data.get('estado_recebimento_geral') or None
                if 'local_recebimento' in data:
                    formulario.local_recebimento = data.get('local_recebimento') or ''
                if 'observacao_recebimento' in data:
                    formulario.observacao_recebimento = data.get('observacao_recebimento') or ''

                entrepot_destino = None
                if tipo_fluxo in ['COMPRAS', 'ENTRADA']:
                    entrepot_destino = formulario.entrepot_destino
                    if not entrepot_destino:
                        first_item = demande.items.first()
                        entrepot_destino = first_item.entrepot if first_item else None
                    if not entrepot_destino:
                        return Response(
                            {"detail": "Depósito de destino não definido para este recebimento."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                sessao_atual = (
                    RecebimentoHistorico.objects
                    .filter(demande_lot=demande)
                    .aggregate(max_sessao=Max('numero_sessao'))
                    .get('max_sessao') or 0
                ) + 1

                if isinstance(items_payload, list):
                    items_by_id = {item.id: item for item in demande.items.all()}
                    for item_data in items_payload:
                        item_id = item_data.get('id')
                        if not item_id or item_id not in items_by_id:
                            continue
                        item = items_by_id[item_id]
                        qtd_base = item.quantite_approuvee or item.quantite_demandee

                        qtd_atual = item.quantite_entregue or 0
                        qtd_receber_agora = item_data.get('quantite_receber_agora', None)

                        if qtd_receber_agora is not None:
                            # Novo fluxo UX: recebe somente o delta deste recebimento.
                            try:
                                qtd_receber_agora = int(qtd_receber_agora)
                            except (TypeError, ValueError):
                                qtd_receber_agora = 0
                            qtd_receber_agora = max(0, qtd_receber_agora)
                            qtd_entregue = min(qtd_base, qtd_atual + qtd_receber_agora)
                        else:
                            # Compatibilidade retroativa: payload antigo envia total acumulado.
                            qtd_entregue = item_data.get('quantite_entregue', qtd_base)
                            try:
                                qtd_entregue = int(qtd_entregue)
                            except (TypeError, ValueError):
                                qtd_entregue = qtd_base
                            qtd_entregue = max(0, qtd_entregue)
                            if qtd_entregue > qtd_base:
                                qtd_entregue = qtd_base
                            # Não permitir reduzir acumulado ja recebido.
                            if qtd_entregue < qtd_atual:
                                qtd_entregue = qtd_atual

                        estado = item_data.get('estado_recebimento') or item.estado_recebimento
                        comentario = item_data.get('comentario_recebimento') or ''

                        pendente = max(0, qtd_base - qtd_entregue)
                        if pendente > 0 and estado == 'CONFORME':
                            estado = 'INCOMPLETO'
                        if pendente == 0 and estado == 'INCOMPLETO':
                            estado = 'CONFORME'

                        qtd_delta = max(0, qtd_entregue - qtd_atual)
                        if tipo_fluxo in ['COMPRAS', 'ENTRADA'] and qtd_delta > 0:
                            stock, _ = StockEntrepot.objects.select_for_update().get_or_create(
                                materiel=item.materiel,
                                entrepot=entrepot_destino,
                                defaults={'quantite': 0}
                            )
                            stock.quantite += qtd_delta
                            stock.save(update_fields=['quantite'])
                            Mouvement.objects.create(
                                type_mvt='ENTREE',
                                quantite=qtd_delta,
                                materiel=item.materiel,
                                entrepot=entrepot_destino,
                                projet=entrepot_destino.projet,
                                demandeur=request.user,
                                raison=(
                                    f"Recebimento de compra (pedido #{demande.id})"
                                    if tipo_fluxo == 'COMPRAS'
                                    else f"Recebimento de entrada (pedido #{demande.id})"
                                )
                            )
                            cache.delete(f"stock_actuel_{item.materiel.id}")

                        item.quantite_entregue = qtd_entregue
                        item.estado_recebimento = estado
                        item.comentario_recebimento = comentario
                        item.save(update_fields=['quantite_entregue', 'estado_recebimento', 'comentario_recebimento'])

                        # Histórico por sessão: registra so quando houve recebimento agora,
                        # ou quando estado/comentario foram informados.
                        estado_informado = 'estado_recebimento' in item_data
                        comentario_informado = 'comentario_recebimento' in item_data and bool((item_data.get('comentario_recebimento') or '').strip())
                        if qtd_delta > 0 or estado_informado or comentario_informado:
                            RecebimentoHistorico.objects.create(
                                demande_lot=demande,
                                item=item,
                                numero_sessao=sessao_atual,
                                recebido_por=request.user,
                                recebido_em=timezone.now(),
                                quantite_recebida=qtd_delta,
                                quantite_acumulada=qtd_entregue,
                                quantite_pendente=pendente,
                                estado_recebimento=estado,
                                comentario_recebimento=comentario,
                            )

                formulario.recebido_por = request.user
                formulario.recebido_em = timezone.now()

                progress_after = self._recebimento_progress(demande)
                if progress_after['is_closed']:
                    if not formulario.estado_recebimento_geral:
                        formulario.estado_recebimento_geral = 'CONFORME'
                    demande.statut = 'RECEBIDA'
                    demande.updated_by = request.user
                    demande.save(update_fields=['statut', 'updated_by', 'updated_at'])
                    Notification.objects.filter(
                        type='RECEBIMENTO_PENDENTE',
                        message__contains=f"[PEDIDO:{demande.id}]"
                    ).update(lu=True)
                    formulario.save()
                    _audit_log(
                        request.user,
                        'RECEBIMENTO',
                        'OPERACOES',
                        obj=demande,
                        changes='Recebimento finalizado e operação fechada.',
                    )
                    return Response({
                        "detail": "Recebimento confirmado e operação fechada.",
                        "numero_formulario_recebimento": formulario.numero_formulario_recebimento,
                        "operação_fechada": True,
                        "itens_pendentes": [],
                    })

                formulario.estado_recebimento_geral = 'INCOMPLETO'
                if demande.statut != 'ENTREGUE':
                    demande.statut = 'ENTREGUE'
                    demande.updated_by = request.user
                    demande.save(update_fields=['statut', 'updated_by', 'updated_at'])
                formulario.save()

                notif_message = (
                    f"[PEDIDO:{demande.id}] Recebimento pendente: pedido {demande.reference or f'#{demande.id}'} "
                    f"tem {progress_after['pending_count']} item(ns) pendente(s)."
                )
                Notification.objects.filter(
                    type='RECEBIMENTO_PENDENTE',
                    message__contains=f"[PEDIDO:{demande.id}]"
                ).update(lu=True)
                self._notify_demande(demande, 'RECEBIMENTO_PENDENTE', notif_message)
                _audit_log(
                    request.user,
                    'RECEBIMENTO',
                    'OPERACOES',
                    obj=demande,
                    changes='Recebimento parcial confirmado.',
                )

            return Response({
                "detail": "Recebimento parcial confirmado. Referência mantida aberta para completar depois.",
                "numero_formulario_recebimento": formulario.numero_formulario_recebimento,
                "operação_fechada": False,
                "itens_pendentes": progress_after['pending_items'],
            })
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ===================================================================
# PROJET CHANTIER - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class ProjetChantierViewSet(viewsets.ModelViewSet):
    queryset = ProjetChantier.objects.all().order_by('nom')
    serializer_class = ProjetChantierSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - Tout moun otantifye
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        
        # PA PÈMÈT DELETE
        if self.action == 'destroy':
            raise PermissionDenied("Não é permitido deletar projetos pela interface web.")
        
        # MANAGER/ADMIN pou CREATE/UPDATE
        return [IsManagerOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(responsable=self.request.user)

    def get_queryset(self):
        qs = ProjetChantier.objects.all().order_by('nom')
        return _filter_by_user_pilier(qs, self.request.user, 'pilier')


# ===================================================================
# ENTREPOT - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class EntrepotViewSet(viewsets.ModelViewSet):
    queryset = Entrepot.objects.select_related('projet', 'responsable').order_by('nom')
    serializer_class = EntrepotSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - Tout moun otantifye
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        # CREATE/UPDATE/DELETE - tout moun sof CONSULTATION
        return [IsOperationalUser()]

    def get_queryset(self):
        qs = Entrepot.objects.select_related('projet', 'responsable').order_by('nom')
        user = self.request.user

        # Keep entrepots without projet visible (ex: "Armazem Marcal SUEZ").
        if not _is_all_pilier_user(user):
            pilier_user = getattr(user, 'pilier_affectation', None)
            if pilier_user:
                qs = qs.filter(Q(projet__pilier=pilier_user) | Q(projet__isnull=True))
            else:
                qs = qs.none()

        pilier = self.request.query_params.get('pilier')
        if pilier in {'PILAR1', 'PILAR2', 'PILAR3'}:
            qs = qs.filter(Q(projet__pilier=pilier) | Q(projet__isnull=True))

        # En mode transfer, expose tous les depots comme destinations possibles.
        transfer_mode = self.request.query_params.get('mode') == 'transfer'
        if transfer_mode:
            return Entrepot.objects.select_related('projet', 'responsable').order_by('nom')
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.select_related('user').order_by('-date')
    serializer_class = NotificationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'mark_read', 'mark_all_read']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user).order_by('-date')
        unread = self.request.query_params.get('unread')
        notif_type = self.request.query_params.get('type')
        if unread in ['1', 'true', 'True']:
            qs = qs.filter(lu=False)
        if notif_type:
            qs = qs.filter(type=notif_type)
        return qs

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.lu = True
        notif.save(update_fields=['lu'])
        return Response({'detail': 'Notification marcada como lida.'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        notif_type = request.data.get('type')
        qs = self.get_queryset().filter(lu=False)
        if notif_type:
            qs = qs.filter(type=notif_type)
        updated = qs.update(lu=True)
        return Response({'detail': 'Notificacoes marcadas como lidas.', 'updated': updated})


# ===================================================================
# UTILISATEUR - ✅ FIX PERMISSIONS!
# ===================================================================
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'module', 'model_name', 'user']
    search_fields = [
        'reference',
        'changes',
        'model_name',
        'module',
        'user__username',
        'user__first_name',
        'user__last_name',
    ]
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)
        return qs

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename=\"audit_log.csv\"'

        writer = csv.writer(response)
        writer.writerow([
            'timestamp',
            'user',
            'action',
            'module',
            'model_name',
            'object_id',
            'reference',
            'changes',
        ])

        for row in qs.iterator():
            user_label = ''
            if row.user:
                user_label = row.user.get_full_name() or row.user.username
            writer.writerow([
                row.timestamp.isoformat() if row.timestamp else '',
                user_label,
                row.action,
                row.module,
                row.model_name,
                row.object_id,
                row.reference,
                row.changes,
            ])
        return response


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('first_name')
    serializer_class = UtilisateurSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - TOUT MOUN KA WÈ
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]

        # MANAGER ak ADMIN ka kreye itilizatè
        if self.action == 'create':
            return [IsManagerOrAdmin()]

        # UPDATE: manager allowed with strict checks in perform_update
        if self.action in ['update', 'partial_update']:
            return [IsManagerOrAdmin()]

        # SÈLMAN ADMIN pou DELETE
        return [IsAdmin()]

    def get_queryset(self):
        qs = Utilisateur.objects.all().order_by('first_name')
        user = self.request.user
        if _is_all_pilier_user(user):
            return qs
        return qs.filter(Q(pilier_affectation=user.pilier_affectation) | Q(id=user.id)).distinct()

    def perform_create(self, serializer):
        """
        Manager kapab kreye itilizatè, men li pa ka kreye ADMIN/MANAGER
        ni bay itilizatè a aksè TODOS.
        """
        creator = self.request.user
        if creator.role == 'MANAGER':
            target_role = serializer.validated_data.get('role', 'USER')
            target_pilier = serializer.validated_data.get('pilier_affectation', creator.pilier_affectation)

            if target_role in ['ADMIN', 'MANAGER']:
                raise PermissionDenied("Gestor não pode criar contas ADMIN ou MANAGER.")

            if target_pilier == 'TODOS':
                raise PermissionDenied("Gestor não pode criar contas com acesso a todos os pilares.")

            # Manager normal: force user sou menm pilar.
            # Manager ki gen TODOS (legacy setup): ka kreye user sou yon pilar espesifik sèlman.
            if creator.pilier_affectation in ['PILAR1', 'PILAR2', 'PILAR3']:
                created_user = serializer.save(pilier_affectation=creator.pilier_affectation)
            else:
                if target_pilier not in ['PILAR1', 'PILAR2', 'PILAR3']:
                    raise PermissionDenied("Gestor com acesso global deve escolher um pilar específico para o novo usuário.")
                created_user = serializer.save(pilier_affectation=target_pilier)
            _audit_log(
                creator,
                'CREATE',
                'USUARIOS',
                obj=created_user,
                changes='Criacao de utilizador por manager.',
            )
            return

        created_user = serializer.save()
        _audit_log(
            creator,
            'CREATE',
            'USUARIOS',
            obj=created_user,
            changes='Criacao de utilizador.',
        )

    def perform_update(self, serializer):
        # Manager ka modifye sólman USER/CONSULTATION (pa TODOS)
        # san elevasyon privilèj.
        actor = self.request.user
        target = self.get_object()

        if actor.role == 'MANAGER':
            target_role = getattr(target, 'role', None)
            target_pilier = getattr(target, 'pilier_affectation', None)
            if target_role in ['ADMIN', 'MANAGER'] or target_pilier == 'TODOS':
                raise PermissionDenied("Gestor não pode editar este utilizador.")

            new_role = serializer.validated_data.get('role', target.role)
            new_pilier = serializer.validated_data.get('pilier_affectation', target.pilier_affectation)

            if new_role in ['ADMIN', 'MANAGER']:
                raise PermissionDenied("Gestor não pode promover perfil para ADMIN/MANAGER.")
            if new_pilier == 'TODOS':
                raise PermissionDenied("Gestor não pode atribuir acesso a todos os pilares.")

            # Manager sou pilar espesifik: kenbe user sou menm pilar.
            if actor.pilier_affectation in ['PILAR1', 'PILAR2', 'PILAR3']:
                updated_user = serializer.save(
                    role=new_role if new_role in ['USER', 'CONSULTATION'] else 'USER',
                    pilier_affectation=actor.pilier_affectation
                )
                _audit_log(
                    actor,
                    'UPDATE',
                    'USUARIOS',
                    obj=updated_user,
                    changes='Atualizacao de utilizador por manager.',
                )
                return

            # Manager TODOS (legacy): mande pilar espesifik.
            if new_pilier not in ['PILAR1', 'PILAR2', 'PILAR3']:
                raise PermissionDenied("Gestor com acesso global deve manter um pilar específico.")
            updated_user = serializer.save(role=new_role if new_role in ['USER', 'CONSULTATION'] else 'USER')
            _audit_log(
                actor,
                'UPDATE',
                'USUARIOS',
                obj=updated_user,
                changes='Atualizacao de utilizador por manager.',
            )
            return

        updated_user = serializer.save()
        _audit_log(
            actor,
            'UPDATE',
            'USUARIOS',
            obj=updated_user,
            changes='Atualizacao de utilizador.',
        )

    def perform_destroy(self, instance):
        _audit_log(
            self.request.user,
            'DELETE',
            'USUARIOS',
            obj=instance,
            changes='Remocao de utilizador.',
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='password')
    def set_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response(
                {'detail': 'Password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})

    @action(detail=False, methods=['post'], url_path='me/password', permission_classes=[IsAuthenticated])
    def set_my_password(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password:
            return Response(
                {'detail': 'Current password and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if confirm_password is not None and new_password != confirm_password:
            return Response(
                {'detail': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not request.user.check_password(current_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})


# ===================================================================
# UTILISATEUR FINAL
# ===================================================================
class UtilisateurFinalViewSet(viewsets.ModelViewSet):
    queryset = UtilisateurFinal.objects.all().order_by('nom', 'prenom')
    serializer_class = UtilisateurFinalSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        return [IsAdmin()]


class UsoTipicoViewSet(viewsets.ModelViewSet):
    queryset = UsoTipico.objects.all().order_by('ordem', 'nom')
    serializer_class = UsoTipicoSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        return [IsAdmin()]

class FamilleViewSet(viewsets.ModelViewSet):
    queryset = Famille.objects.all().order_by('ordre', 'nom')
    serializer_class = FamilleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        return [IsAdmin()]


# ===================================================================
# CATEGORIE - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all().order_by('nom')
    serializer_class = CategorieSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - Tout moun otantifye
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        # ADMIN sèlman pou CREATE/UPDATE/DELETE
        return [IsAdmin()]


class SousCategorieViewSet(viewsets.ModelViewSet):
    queryset = SousCategorie.objects.select_related('categorie').order_by('nom')
    serializer_class = SousCategorieSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['categorie']
    search_fields = ['nom', 'description', 'categorie__nom']
    ordering_fields = ['nom']
    ordering = ['nom']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsOperationalUser()]


# ===================================================================
# FOURNISSEUR - ✅ TOUT MOUN KA LIST/RETRIEVE
# ===================================================================
class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all().order_by('nom')
    serializer_class = FournisseurSerializer

    def get_permissions(self):
        # ✅ LIST & RETRIEVE - Tout moun otantifye
        if self.action in ['list', 'retrieve', 'me', 'set_my_password']:
            return [IsAuthenticated()]
        # ADMIN sèlman pou CREATE/UPDATE/DELETE
        return [IsAdmin()]

    @action(detail=False, methods=['get'])
    def actifs(self, request):
        queryset = self.get_queryset().filter(actif=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ===================================================================
# ENDPOINTS RAPID
# ===================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertes_stock(request):
    alertes = Materiel.objects.annotate(
        stock_total_agg=Coalesce(Sum('stocks__quantite'), 0)
    ).filter(stock_total_agg__lt=F('stock_min'))
    alertes = _filter_by_user_pilier(alertes, request.user, 'stocks__entrepot__projet__pilier').distinct()
    serializer = MaterielSerializer(alertes, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def materiais_stock(request):
    """Retounen stock total pa materiel"""
    entrepot_id = request.query_params.get('entrepot')
    
    qs = StockEntrepot.objects.values(
        'materiel__id',
        'materiel__code',
        'materiel__description',
        'materiel__unite'
    ).annotate(stock_total=Sum('quantite'))
    qs = _filter_by_user_pilier(qs, request.user, 'entrepot__projet__pilier')
    
    if entrepot_id and entrepot_id != 'null':
        qs = qs.filter(entrepot_id=entrepot_id)
    
    result = [
        {
            'id': item['materiel__id'],
            'code': item['materiel__code'],
            'description': item['materiel__description'],
            'unite': item['materiel__unite'],
            'stock_total': item['stock_total'] or 0,
        }
        for item in qs.order_by('materiel__code')
    ]
    
    return Response(result)


def _as_csv_response(filename, headers, rows):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorio_stock(request):
    """
    Relatorio MVP: stock por material/deposito.
    Query params:
      - pilier, entrepot, search, low_only=1, format=csv
    """
    qs = StockEntrepot.objects.select_related('materiel', 'entrepot', 'entrepot__projet')
    pilier = request.query_params.get('pilier')
    entrepot_id = request.query_params.get('entrepot')
    search = (request.query_params.get('search') or '').strip()
    low_only = request.query_params.get('low_only') == '1'
    export_csv = (request.query_params.get('format') or '').lower() == 'csv'

    if pilier in {'PILAR1', 'PILAR2', 'PILAR3'}:
        qs = qs.filter(entrepot__projet__pilier=pilier)
    else:
        qs = _filter_by_user_pilier(qs, request.user, 'entrepot__projet__pilier')

    if entrepot_id and str(entrepot_id).isdigit():
        qs = qs.filter(entrepot_id=int(entrepot_id))

    if search:
        qs = qs.filter(
            Q(materiel__code__icontains=search) |
            Q(materiel__description__icontains=search) |
            Q(entrepot__nom__icontains=search)
        )

    if low_only:
        qs = qs.filter(quantite__lt=F('materiel__stock_min'))

    qs = qs.order_by('entrepot__nom', 'materiel__code')

    payload = [
        {
            'stock_id': s.id,
            'materiel_id': s.materiel_id,
            'code': s.materiel.code,
            'description': s.materiel.description,
            'entrepot_id': s.entrepot_id,
            'entrepot_nom': s.entrepot.nom,
            'pilier': getattr(s.entrepot.projet, 'pilier', None),
            'quantite': s.quantite,
            'stock_min': s.materiel.stock_min,
            'stock_max': s.materiel.stock_max,
            'status': s.status,
        }
        for s in qs
    ]

    if export_csv:
        rows = [
            [
                p['stock_id'], p['materiel_id'], p['code'], p['description'],
                p['entrepot_id'], p['entrepot_nom'], p['pilier'],
                p['quantite'], p['stock_min'], p['stock_max'], p['status'],
            ]
            for p in payload
        ]
        return _as_csv_response(
            'relatorio_stock.csv',
            ['stock_id', 'materiel_id', 'code', 'description', 'entrepot_id', 'entrepot_nom', 'pilier', 'quantite', 'stock_min', 'stock_max', 'status'],
            rows,
        )

    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorio_movimentos(request):
    """
    Relatorio MVP: movimentos com filtros.
    Query params:
      - date_from, date_to, pilier, entrepot, type_mvt, search, format=csv
    """
    qs = Mouvement.objects.select_related(
        'materiel', 'entrepot', 'entrepot__projet', 'demandeur', 'fournisseur'
    )
    pilier = request.query_params.get('pilier')
    entrepot_id = request.query_params.get('entrepot')
    type_mvt = request.query_params.get('type_mvt')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = (request.query_params.get('search') or '').strip()
    export_csv = (request.query_params.get('format') or '').lower() == 'csv'

    if date_from:
        qs = qs.filter(date_mvt__date__gte=date_from)
    if date_to:
        qs = qs.filter(date_mvt__date__lte=date_to)
    if type_mvt in {'ENTREE', 'SORTIE', 'TRANSFERT', 'RETOUR'}:
        qs = qs.filter(type_mvt=type_mvt)

    if pilier in {'PILAR1', 'PILAR2', 'PILAR3'}:
        qs = qs.filter(Q(entrepot__projet__pilier=pilier) | Q(projet__pilier=pilier))
    else:
        user_pilier = getattr(request.user, 'pilier_affectation', None)
        if not _is_all_pilier_user(request.user) and user_pilier:
            qs = qs.filter(Q(entrepot__projet__pilier=user_pilier) | Q(projet__pilier=user_pilier))

    if entrepot_id and str(entrepot_id).isdigit():
        qs = qs.filter(entrepot_id=int(entrepot_id))

    if search:
        qs = qs.filter(
            Q(reference__icontains=search) |
            Q(materiel__code__icontains=search) |
            Q(materiel__description__icontains=search) |
            Q(entrepot__nom__icontains=search)
        )

    qs = qs.order_by('-date_mvt', '-id')[:2000]

    payload = [
        {
            'id': m.id,
            'reference': m.reference,
            'date_mvt': m.date_mvt,
            'type_mvt': m.type_mvt,
            'quantite': m.quantite,
            'materiel_id': m.materiel_id,
            'materiel_code': m.materiel.code if m.materiel else None,
            'materiel_description': m.materiel.description if m.materiel else None,
            'entrepot_id': m.entrepot_id,
            'entrepot_nom': m.entrepot.nom if m.entrepot else None,
            'pilier': (m.entrepot.projet.pilier if m.entrepot and m.entrepot.projet else None),
            'demandeur': m.demandeur.username if m.demandeur else None,
            'fournisseur': m.fournisseur.nom if m.fournisseur else None,
            'raison': m.raison or '',
        }
        for m in qs
    ]

    if export_csv:
        rows = [
            [
                p['id'], p['reference'], p['date_mvt'], p['type_mvt'], p['quantite'],
                p['materiel_id'], p['materiel_code'], p['materiel_description'],
                p['entrepot_id'], p['entrepot_nom'], p['pilier'], p['demandeur'],
                p['fournisseur'], p['raison'],
            ]
            for p in payload
        ]
        return _as_csv_response(
            'relatorio_movimentos.csv',
            ['id', 'reference', 'date_mvt', 'type_mvt', 'quantite', 'materiel_id', 'materiel_code', 'materiel_description', 'entrepot_id', 'entrepot_nom', 'pilier', 'demandeur', 'fournisseur', 'raison'],
            rows,
        )

    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorio_operacoes(request):
    """
    Relatorio MVP: operações (demandes) par fluxo/status.
    Query params:
      - date_from, date_to, pilier, tipo_fluxo, statut, search, format=csv
    """
    qs = DemandeLot.objects.select_related('demandeur', 'projet', 'formulario').prefetch_related('items')
    pilier = request.query_params.get('pilier')
    tipo_fluxo = request.query_params.get('tipo_fluxo')
    statut = request.query_params.get('statut')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = (request.query_params.get('search') or '').strip()
    export_csv = (request.query_params.get('format') or '').lower() == 'csv'

    if date_from:
        qs = qs.filter(date_demande__date__gte=date_from)
    if date_to:
        qs = qs.filter(date_demande__date__lte=date_to)
    if tipo_fluxo:
        qs = qs.filter(formulario__tipo_fluxo=tipo_fluxo)
    if statut:
        qs = qs.filter(statut=statut)

    if pilier in {'PILAR1', 'PILAR2', 'PILAR3'}:
        qs = qs.filter(
            Q(projet__pilier=pilier) |
            Q(items__entrepot__projet__pilier=pilier)
        ).distinct()
    elif not _is_all_pilier_user(request.user):
        user_pilier = getattr(request.user, 'pilier_affectation', None)
        qs = qs.filter(
            Q(demandeur=request.user) |
            Q(projet__pilier=user_pilier) |
            Q(items__entrepot__projet__pilier=user_pilier)
        ).distinct()

    if search:
        qs = qs.filter(
            Q(reference__icontains=search) |
            Q(description__icontains=search) |
            Q(demandeur__username__icontains=search)
        )

    qs = qs.annotate(total_items=Count('items', distinct=True)).order_by('-date_demande', '-id')[:1500]

    payload = []
    for lot in qs:
        pending_items = 0
        for item in lot.items.all():
            target = item.quantite_approuvee or item.quantite_demandee or 0
            if (item.quantite_entregue or 0) < target:
                pending_items += 1
        payload.append({
            'id': lot.id,
            'reference': lot.reference,
            'date_demande': lot.date_demande,
            'statut': lot.statut,
            'tipo_fluxo': lot.formulario.tipo_fluxo if getattr(lot, 'formulario', None) else None,
            'demandeur': lot.demandeur.username if lot.demandeur else None,
            'projet': lot.projet.nom if lot.projet else None,
            'total_items': lot.total_items,
            'items_pendentes': pending_items,
        })

    if export_csv:
        rows = [
            [
                p['id'], p['reference'], p['date_demande'], p['statut'], p['tipo_fluxo'],
                p['demandeur'], p['projet'], p['total_items'], p['items_pendentes'],
            ]
            for p in payload
        ]
        return _as_csv_response(
            'relatorio_operacoes.csv',
            ['id', 'reference', 'date_demande', 'statut', 'tipo_fluxo', 'demandeur', 'projet', 'total_items', 'items_pendentes'],
            rows,
        )

    return Response(payload)
