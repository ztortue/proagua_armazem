# ============================================================================
# FICHIER 2: api/serializers.py - KOREKSYON FINAL
# ============================================================================
# api/serializers.py
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Famille, Utilisateur, UtilisateurFinal, UsoTipico, Categorie, SousCategorie, Fournisseur, ProjetChantier, Entrepot,
    Materiel, MaterielFournisseur, StockEntrepot, Mouvement, PedidoFormulario,
    Zone, Corredor, Etagere, Niveau, Emplacement,
    DemandeLot, DemandeItem, Notification, RecebimentoHistorico, AuditLog
)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['is_superuser'] = user.is_superuser
        token['username'] = user.username
        return token


class FamilleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Famille 
        fields = ['id', 'code', 'nom', 'description', 'icone', 'ordre']

# ===============================================================
# 1. Utilisateur (pou afichaj)
# ===============================================================
class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Utilisateur
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'poste',
            'service',
            'telephone',
            'role',
            'pilier_affectation',
            'is_active',
            'password'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False},
        }

    def create (self, validated_data):
        password = validated_data.pop('password', None)
        user = Utilisateur(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attri, value in validated_data.items():
            setattr(instance, attri, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UtilisateurFinalSerializer(serializers.ModelSerializer):
    class Meta:
        model = UtilisateurFinal
        fields = ['id', 'nom', 'prenom', 'entreprise', 'fonction']


class UsoTipicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsoTipico
        fields = ['id', 'nom', 'actif', 'ordem']


# ===============================================================
# 2. Localisation (Zona → Corredor → Estante → Nível → Emplacement)
# ===============================================================
class EmplacementSerializer(serializers.ModelSerializer):
    adresse_complete = serializers.CharField(source='adresse_complete', read_only=True)
    
    class Meta:
        model = Emplacement
        fields = ['id', 'adresse_complete']


# ===============================================================
# 3. Stock + Localisation
# ===============================================================
class StockEntrepotSerializer(serializers.ModelSerializer):
    materiel = serializers.StringRelatedField()
    materiel_id_value = serializers.IntegerField(source='materiel.id', read_only=True)
    materiel_code = serializers.CharField(source='materiel.code', read_only=True)
    materiel_description = serializers.CharField(source='materiel.description', read_only=True)
    materiel_usage_type = serializers.CharField(source='materiel.usage_type', read_only=True)
    entrepot = serializers.StringRelatedField()
    entrepot_id = serializers.IntegerField(source='entrepot.id', read_only=True)
    entrepot_id_value = serializers.IntegerField(source='entrepot.id', read_only=True)
    emplacement = EmplacementSerializer(read_only=True)
    entrepot_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source='entrepot',
        required=False,
        allow_null=True
    )
    materiel_id = serializers.PrimaryKeyRelatedField(
        queryset=Materiel.objects.all(),
        source='materiel',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = StockEntrepot
        fields = [
            'id',
            'materiel',
            'materiel_id_value',
            'materiel_code',
            'materiel_description',
            'materiel_usage_type',
            'entrepot',
            'entrepot_id_value',
            'entrepot_id',
            'materiel_id',
            'quantite',
            'status',
            'data_retorno_prevista',
            'emplacement',
        ]

    def validate(self, attrs):
        materiel = attrs.get('materiel') or getattr(self.instance, 'materiel', None)
        entrepot = attrs.get('entrepot') or getattr(self.instance, 'entrepot', None)
        if not materiel or not entrepot:
            return attrs
        existing = StockEntrepot.objects.filter(materiel=materiel, entrepot=entrepot)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError({
                'entrepot': 'Este material já existe neste depósito.'
            })
        return attrs


# ===============================================================
# 4. Materiel ak tout kote li ye a
# ===============================================================
class MaterielSerializer(serializers.ModelSerializer):
    categorie = serializers.StringRelatedField()
    categorie_id = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(),
        source='categorie',
        write_only=True,
        required=False,
        allow_null=True
    )
    fournisseur = serializers.StringRelatedField()
    fournisseur_id = serializers.PrimaryKeyRelatedField(
        queryset=Fournisseur.objects.all(),
        source='fournisseur',
        write_only=True,
        required=False,
        allow_null=True
    )
    fournisseur_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    fournisseurs_possibles = serializers.SerializerMethodField(read_only=True)
    entrepot_principal = serializers.StringRelatedField(read_only=True)
    entrepot_principal_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source='entrepot_principal',
        write_only=True,
        required=True,
        allow_null=False
    )
    stock_locations = StockEntrepotSerializer(source='stocks', many=True, read_only=True)
    stock_actuel = serializers.IntegerField(read_only=True)
    souscategorie = serializers.SerializerMethodField(read_only=True)
    created_by_nome = serializers.SerializerMethodField(read_only=True)
    updated_by_nome = serializers.SerializerMethodField(read_only=True)
    souscategorie_id = serializers.PrimaryKeyRelatedField(
        queryset=SousCategorie.objects.all(),
        source='souscategorie',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Materiel
        fields = [
            'id', 'code', 'description', 'unite',
            'categorie', 'categorie_id',
            'fournisseur', 'fournisseur_id', 'fournisseur_nom', 'fournisseurs_possibles',
            'entrepot_principal', 'entrepot_principal_id',
            'souscategorie', 'souscategorie_id',
            'stock_min', 'stock_max', 'prix_unitaire',
            'diametre_nominal', 'pression_nominal', 'type_materiau', 'usage_typique',
            'usage_type',
            'photo', 'stock_locations', 'stock_actuel',
            'created_at', 'updated_at', 'created_by_nome', 'updated_by_nome',
        ]
        extra_kwargs = {
            'code': {'required': False, 'allow_blank': True},
        }

    def get_fournisseurs_possibles(self, obj):
        return list(
            obj.fournisseurs.order_by('nom').values_list('nom', flat=True)
        )

    def get_souscategorie(self, obj):
        if not obj.souscategorie_id:
            return None
        return {
            'id': obj.souscategorie.id,
            'nom': obj.souscategorie.nom,
            'categorie_id': obj.souscategorie.categorie_id,
        }

    def _user_name(self, user):
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_created_by_nome(self, obj):
        return self._user_name(getattr(obj, 'created_by', None))

    def get_updated_by_nome(self, obj):
        return self._user_name(getattr(obj, 'updated_by', None))

    def _resolve_fournisseur_by_name(self, nom):
        value = (nom or '').strip()
        if not value:
            return None
        fournisseur = Fournisseur.objects.filter(nom__iexact=value).first()
        if fournisseur:
            return fournisseur
        return Fournisseur.objects.create(
            nom=value,
            actif=True,
        )

    def create(self, validated_data):
        fournisseur_nom = validated_data.pop('fournisseur_nom', '')
        fournisseur = validated_data.get('fournisseur')
        if fournisseur is None and fournisseur_nom:
            fournisseur = self._resolve_fournisseur_by_name(fournisseur_nom)
            validated_data['fournisseur'] = fournisseur
        materiel = super().create(validated_data)
        if fournisseur:
            MaterielFournisseur.objects.get_or_create(
                materiel=materiel,
                fournisseur=fournisseur,
            )
        return materiel

    def update(self, instance, validated_data):
        fournisseur_nom = validated_data.pop('fournisseur_nom', '')
        fournisseur = validated_data.get('fournisseur', instance.fournisseur)
        if validated_data.get('fournisseur') is None and fournisseur_nom:
            fournisseur = self._resolve_fournisseur_by_name(fournisseur_nom)
            validated_data['fournisseur'] = fournisseur
        materiel = super().update(instance, validated_data)
        if fournisseur:
            MaterielFournisseur.objects.get_or_create(
                materiel=materiel,
                fournisseur=fournisseur,
            )
        return materiel
    


# ===============================================================
# 5. Mouvement
# ===============================================================
class MouvementSerializer(serializers.ModelSerializer):
    materiel = serializers.StringRelatedField()
    demandeur = serializers.StringRelatedField(default='Sistema')
    entrepot = serializers.StringRelatedField()
    entrepot_id_value = serializers.IntegerField(source='entrepot.id', read_only=True)
    projet = serializers.StringRelatedField()

    materiel_id = serializers.PrimaryKeyRelatedField(
        queryset=Materiel.objects.all(),
        source="materiel",
        write_only=True,
        required=True
    )

    projet_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjetChantier.objects.all(),
        source="projet",
        write_only=True,
        required=False,
        allow_null=True
    )
    fournisseur_id = serializers.PrimaryKeyRelatedField(
        queryset=Fournisseur.objects.all(),
        source="fournisseur",
        write_only=True,
        required=False,
        allow_null=True
    )
    entrepot_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source="entrepot",
        write_only=True,
        required=False,
        allow_null=True
    )
    entrepot_destino_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )


    class Meta:
        model = Mouvement
        fields = [
            "id", "reference", "date_mvt", "type_mvt", "quantite", "raison",
            "materiel", "materiel_id",
            "projet", "projet_id",
            "fournisseur", "fournisseur_id",
            "entrepot", "entrepot_id_value", "entrepot_id", "entrepot_destino_id",
            "demandeur",
        ]
        read_only_fields = ['id', 'date_mvt', 'demandeur']

    def create(self, validated_data):
        # Champ utilité sèlman pou transfè nan view; pa egziste nan modèl Mouvement.
        validated_data.pop('entrepot_destino_id', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('entrepot_destino_id', None)
        return super().update(instance, validated_data)


# ===============================================================
# 6. DemandeLot + DemandeItem (pou pita)
# ===============================================================
class DemandeItemSerializer(serializers.ModelSerializer):
    materiel = serializers.StringRelatedField()
    materiel_id = serializers.IntegerField(source='materiel.id', read_only=True)
    materiel_code = serializers.CharField(source='materiel.code', read_only=True)
    materiel_description = serializers.CharField(source='materiel.description', read_only=True)
    materiel_usage_type = serializers.CharField(source='materiel.usage_type', read_only=True)
    entrepot = serializers.StringRelatedField()
    entrepot_id = serializers.IntegerField(source='entrepot.id', read_only=True)
    entrepot_pilier = serializers.CharField(source='entrepot.projet.pilier', read_only=True)

    class Meta:
        model = DemandeItem
        fields = [
            'id',
            'materiel',
            'materiel_id',
            'materiel_code',
            'materiel_description',
            'materiel_usage_type',
            'entrepot',
            'entrepot_id',
            'entrepot_pilier',
            'quantite_demandee',
            'quantite_approuvee',
            'quantite_entregue',
            'estado_recebimento',
            'comentario_recebimento',
            'data_necessaria',
        ]
    
    def get_materiel(self, obj):
        """Retourne l'objet materiel"""
        return {
            'id': obj.materiel.id,
            'code': obj.materiel.code,
            'description': obj.materiel.description,
            'unite': obj.materiel.unite,
            'stock_actuel': obj.materiel.stock_actuel,
        }


class DemandeItemCreateSerializer(serializers.ModelSerializer):
    materiel_id = serializers.PrimaryKeyRelatedField(
        queryset=Materiel.objects.all(),
        source='materiel'
    )
    entrepot_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source='entrepot',
        required=False,
        allow_null=True
    )

    class Meta:
        model = DemandeItem
        fields = ['materiel_id', 'entrepot_id', 'quantite_demandee', 'data_necessaria']


class DemandeLotCreateSerializer(serializers.ModelSerializer):
    items = DemandeItemCreateSerializer(many=True)
    tipo_fluxo = serializers.ChoiceField(
        choices=PedidoFormulario.TIPO_FLUXO_CHOICES,
        required=False,
        default='INSTALACAO'
    )
    data_retorno_prevista = serializers.DateTimeField(required=False, allow_null=True)
    projet_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjetChantier.objects.all(),
        source='projet',
        required=False,
        allow_null=True
    )
    demandeur_reel_id = serializers.PrimaryKeyRelatedField(
        queryset=UtilisateurFinal.objects.all(),
        source='demandeur_reel',
        required=False,
        allow_null=True
    )
    entrepot_destino_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = DemandeLot
        fields = [
            'id',
            'description',
            'projet_id',
            'demandeur_reel_id',
            'tipo_fluxo',
            'data_retorno_prevista',
            'entrepot_destino_id',
            'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        tipo_fluxo = validated_data.pop('tipo_fluxo', 'INSTALACAO')
        data_retorno_prevista = validated_data.pop('data_retorno_prevista', None)
        entrepot_destino = validated_data.pop('entrepot_destino_id', None)
        demandeur_reel = validated_data.get('demandeur_reel')
        description = (validated_data.get('description') or '').strip()
        expected_devolucao_entrepot_id = None
        if not items_data:
            raise serializers.ValidationError({'items': 'Itens obrigatórios.'})
        if not demandeur_reel:
            raise serializers.ValidationError({'demandeur_reel': 'Demandante real é obrigatório.'})
        if tipo_fluxo == 'EMPRESTIMO' and not data_retorno_prevista:
            raise serializers.ValidationError({'data_retorno_prevista': 'Informe a data/hora prevista de retorno para empréstimo.'})
        if tipo_fluxo == 'TRANSFERENCIA' and not entrepot_destino:
            raise serializers.ValidationError({'entrepot_destino_id': 'Selecione o depósito de destino para transferência.'})
        if tipo_fluxo == 'TRANSFERENCIA':
            marker_tipo = '[ORIGEM_TIPO:'
            marker_id = '[ORIGEM_PEDIDO_ID:'
            if marker_tipo not in description or marker_id not in description:
                raise serializers.ValidationError({
                    'description': 'Transferencia exige metadados de origem: ORIGEM_TIPO e ORIGEM_PEDIDO_ID.'
                })

            start_tipo = description.find(marker_tipo) + len(marker_tipo)
            end_tipo = description.find(']', start_tipo)
            origem_tipo = description[start_tipo:end_tipo].strip().upper() if end_tipo > start_tipo else ''

            start_id = description.find(marker_id) + len(marker_id)
            end_id = description.find(']', start_id)
            origem_id_raw = description[start_id:end_id].strip() if end_id > start_id else ''
            if not origem_id_raw.isdigit():
                raise serializers.ValidationError({'description': 'ORIGEM_PEDIDO_ID invalido para transferencia.'})

            if origem_tipo not in ['ENTRADA', 'COMPRAS']:
                raise serializers.ValidationError({
                    'description': 'Transferencia deve referenciar origem do tipo ENTRADA ou COMPRAS.'
                })

            origem_pedido = (
                DemandeLot.objects
                .select_related('formulario')
                .prefetch_related('items')
                .filter(id=int(origem_id_raw))
                .first()
            )
            if not origem_pedido:
                raise serializers.ValidationError({'description': 'Operação de origem não encontrada para transferencia.'})

            origem_flux = (getattr(origem_pedido, 'formulario', None) and origem_pedido.formulario.tipo_fluxo) or None
            if origem_flux != origem_tipo:
                raise serializers.ValidationError({
                    'description': 'Tipo da operação de origem não corresponde ao tipo informado na transferencia.'
                })

            if origem_tipo == 'COMPRAS':
                # Robustesse metier: compras so podem originar transferencia apos recebimento final.
                if origem_pedido.statut != 'RECEBIDA':
                    raise serializers.ValidationError({
                        'description': 'Transferencia a partir de compra exige operação de origem RECEBIDA.'
                    })
            else:
                if origem_pedido.statut != 'RECEBIDA':
                    raise serializers.ValidationError({
                        'description': 'Transferencia a partir de entrada exige operação de origem RECEBIDA.'
                    })

            origem_form = getattr(origem_pedido, 'formulario', None)
            origem_entrepot = getattr(origem_form, 'entrepot_destino', None)
            if not origem_entrepot:
                raise serializers.ValidationError({
                    'description': 'Deposito de origem não definido na operação referenciada.'
                })

            origem_items = {it.materiel_id: it for it in origem_pedido.items.all()}
            for item_data in items_data:
                mat = item_data.get('materiel')
                if not mat:
                    continue
                origem_item = origem_items.get(mat.id)
                if not origem_item:
                    raise serializers.ValidationError({
                        'items': f'Material {mat.code} não pertence a operação de origem selecionada.'
                    })

                requested_qty = int(item_data.get('quantite_demandee') or 0)
                if origem_tipo == 'COMPRAS':
                    origem_qty = int(origem_item.quantite_entregue or 0)
                else:
                    origem_qty = int(
                        origem_item.quantite_entregue
                        or origem_item.quantite_approuvee
                        or origem_item.quantite_demandee
                        or 0
                    )
                if requested_qty > origem_qty:
                    raise serializers.ValidationError({
                        'items': (
                            f'Quantidade solicitada para {mat.code} excede origem '
                            f'({requested_qty} > {origem_qty}).'
                        )
                    })
        if tipo_fluxo == 'DEVOLUCAO':
            marker_tipo = '[ORIGEM_TIPO:'
            marker_id = '[ORIGEM_PEDIDO_ID:'
            if marker_tipo not in description or marker_id not in description:
                raise serializers.ValidationError({
                    'description': 'Devolucao exige metadados de origem: ORIGEM_TIPO e ORIGEM_PEDIDO_ID.'
                })

            start_tipo = description.find(marker_tipo) + len(marker_tipo)
            end_tipo = description.find(']', start_tipo)
            origem_tipo = description[start_tipo:end_tipo].strip().upper() if end_tipo > start_tipo else ''

            start_id = description.find(marker_id) + len(marker_id)
            end_id = description.find(']', start_id)
            origem_id_raw = description[start_id:end_id].strip() if end_id > start_id else ''
            if not origem_id_raw.isdigit():
                raise serializers.ValidationError({'description': 'ORIGEM_PEDIDO_ID invalido para devolucao.'})

            expected_flux_by_origem = {
                'SAIDA': 'INSTALACAO',
                'TRANSFERENCIA': 'TRANSFERENCIA',
                'EMPRESTIMO': 'EMPRESTIMO',
                'COMPRAS': 'COMPRAS',
            }
            expected_flux = expected_flux_by_origem.get(origem_tipo)
            if not expected_flux:
                raise serializers.ValidationError({
                    'description': 'ORIGEM_TIPO invalido para devolucao. Use SAIDA, TRANSFERENCIA, EMPRESTIMO ou COMPRAS.'
                })

            origem_pedido = (
                DemandeLot.objects
                .select_related('formulario')
                .prefetch_related('items')
                .filter(id=int(origem_id_raw))
                .first()
            )
            if not origem_pedido:
                raise serializers.ValidationError({'description': 'Operação de origem não encontrada para devolucao.'})
            if origem_pedido.statut not in ['ENTREGUE', 'RECEBIDA']:
                raise serializers.ValidationError({
                    'description': 'A devolucao so e permitida para operação de origem ja entregue/recebida.'
                })

            origem_flux = (getattr(origem_pedido, 'formulario', None) and origem_pedido.formulario.tipo_fluxo) or None
            if origem_flux != expected_flux:
                raise serializers.ValidationError({
                    'description': 'Tipo da operação de origem não corresponde ao tipo de devolucao.'
                })

            origem_form = getattr(origem_pedido, 'formulario', None)
            if origem_tipo == 'COMPRAS':
                expected_devolucao_entrepot_id = getattr(origem_form, 'entrepot_destino_id', None)
            elif origem_tipo == 'TRANSFERENCIA':
                expected_devolucao_entrepot_id = getattr(origem_form, 'entrepot_origem_id', None)
            else:
                first_item = origem_pedido.items.first()
                expected_devolucao_entrepot_id = first_item.entrepot_id if first_item else None

            origem_items = {it.materiel_id: it for it in origem_pedido.items.all()}
            for item_data in items_data:
                mat = item_data.get('materiel')
                if not mat:
                    continue
                origem_item = origem_items.get(mat.id)
                if not origem_item:
                    raise serializers.ValidationError({
                        'items': f'Material {mat.code} não pertence a operação de origem selecionada.'
                    })

                requested_qty = int(item_data.get('quantite_demandee') or 0)
                origem_qty = int(
                    origem_item.quantite_entregue
                    or origem_item.quantite_approuvee
                    or origem_item.quantite_demandee
                    or 0
                )
                if requested_qty > origem_qty:
                    raise serializers.ValidationError({
                        'items': (
                            f'Quantidade de devolucao para {mat.code} excede origem '
                            f'({requested_qty} > {origem_qty}).'
                        )
                    })

        piliers = set()
        entrepot_ids = set()
        for item_data in items_data:
            entrepot = item_data.get('entrepot')
            if not entrepot:
                materiel = item_data.get('materiel')
                stocks = list(materiel.stocks.select_related('entrepot', 'entrepot__projet'))
                if len(stocks) == 1:
                    entrepot = stocks[0].entrepot
                    item_data['entrepot'] = entrepot
            if not entrepot:
                raise serializers.ValidationError({'entrepot': 'Depósito obrigatório para cada item.'})
            entrepot_ids.add(entrepot.id)
            pilier = getattr(entrepot.projet, 'pilier', None)
            if not pilier:
                raise serializers.ValidationError({'entrepot': 'Depósito sem projeto/pilar definido.'})
            piliers.add(pilier)
        if len(entrepot_ids) > 1:
            raise serializers.ValidationError({
                'items': 'Estes materiais não podem ficar no mesmo pedido porque estão em depósitos diferentes. '
                         'Crie pedidos separados ou escolha materiais do mesmo depósito.'
            })
        if len(piliers) > 1:
            raise serializers.ValidationError({'items': 'Todos os itens devem ser do mesmo pilar.'})
        entrepot_origem = items_data[0].get('entrepot') if items_data else None
        if tipo_fluxo == 'DEVOLUCAO' and expected_devolucao_entrepot_id and entrepot_origem:
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else None
            can_override_devolucao_entrepot = bool(
                user and (getattr(user, 'role', None) == 'ADMIN' or getattr(user, 'pilier_affectation', None) == 'TODOS')
            )
            if entrepot_origem.id != int(expected_devolucao_entrepot_id) and not can_override_devolucao_entrepot:
                raise serializers.ValidationError({
                    'items': 'Deposito de retorno deve corresponder ao deposito esperado da operação de origem.'
                })
        if tipo_fluxo == 'TRANSFERENCIA':
            marker_id = '[ORIGEM_PEDIDO_ID:'
            if marker_id in description:
                start_id = description.find(marker_id) + len(marker_id)
                end_id = description.find(']', start_id)
                origem_id_raw = description[start_id:end_id].strip() if end_id > start_id else ''
                if origem_id_raw.isdigit():
                    origem_pedido_check = (
                        DemandeLot.objects.select_related('formulario')
                        .filter(id=int(origem_id_raw)).first()
                    )
                    origem_entrepot = getattr(getattr(origem_pedido_check, 'formulario', None), 'entrepot_destino', None)
                    if origem_entrepot and entrepot_origem and origem_entrepot.id != entrepot_origem.id:
                        raise serializers.ValidationError({
                            'items': 'Deposito de origem dos itens deve corresponder ao deposito da referencia de origem.'
                        })
        if tipo_fluxo == 'TRANSFERENCIA' and entrepot_origem and entrepot_destino and entrepot_origem.id == entrepot_destino.id:
            raise serializers.ValidationError({'entrepot_destino_id': 'Origem e destino não podem ser iguais na transferência.'})
        demande = DemandeLot.objects.create(**validated_data)
        for item_data in items_data:
            DemandeItem.objects.create(lot=demande, **item_data)
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        PedidoFormulario.objects.create(
            demande_lot=demande,
            tipo_fluxo=tipo_fluxo,
            data_retorno_prevista=data_retorno_prevista if tipo_fluxo == 'EMPRESTIMO' else None,
            entrepot_origem=entrepot_origem if tipo_fluxo == 'TRANSFERENCIA' else None,
            entrepot_destino=(
                entrepot_destino
                if tipo_fluxo == 'TRANSFERENCIA'
                else (entrepot_origem if tipo_fluxo == 'ENTRADA' else None)
            ),
            solicitado_por=user,
            solicitado_em=timezone.now(),
        )
        # Rebuild reference after items/formulario exist, so format includes tipo + item code.
        demande.regenerate_reference()
        return demande


class PedidoFormularioSerializer(serializers.ModelSerializer):
    solicitado_por_nome = serializers.SerializerMethodField()
    validado_por_nome = serializers.SerializerMethodField()
    aprovado_por_nome = serializers.SerializerMethodField()
    entregue_por_nome = serializers.SerializerMethodField()
    recebido_por_nome = serializers.SerializerMethodField()
    entrepot_origem_nome = serializers.CharField(source='entrepot_origem.nom', read_only=True)
    entrepot_destino_nome = serializers.CharField(source='entrepot_destino.nom', read_only=True)
    entrepot_origem_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source='entrepot_origem',
        required=False,
        allow_null=True,
        write_only=True
    )
    entrepot_destino_id = serializers.PrimaryKeyRelatedField(
        queryset=Entrepot.objects.all(),
        source='entrepot_destino',
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = PedidoFormulario
        fields = [
            'id', 'demande_lot', 'tipo_fluxo', 'prioridade', 'motivo', 'destino_uso', 'observacoes', 'data_retorno_prevista',
            'numero_formulario_saida', 'numero_formulario_recebimento', 'estado_recebimento_geral', 'local_recebimento', 'observacao_recebimento',
            'entrepot_origem', 'entrepot_origem_id', 'entrepot_origem_nome',
            'entrepot_destino', 'entrepot_destino_id', 'entrepot_destino_nome',
            'solicitado_por', 'solicitado_por_nome', 'solicitado_em',
            'validado_por', 'validado_por_nome', 'validado_em',
            'aprovado_por', 'aprovado_por_nome', 'aprovado_em',
            'entregue_por', 'entregue_por_nome', 'entregue_em',
            'recebido_por', 'recebido_por_nome', 'recebido_em',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id',
            'solicitado_por', 'solicitado_por_nome', 'solicitado_em',
            'validado_por', 'validado_por_nome', 'validado_em',
            'aprovado_por', 'aprovado_por_nome', 'aprovado_em',
            'entregue_por', 'entregue_por_nome', 'entregue_em',
            'numero_formulario_saida',
            'created_at', 'updated_at',
        ]

    def _name(self, user):
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_solicitado_por_nome(self, obj):
        return self._name(obj.solicitado_por)

    def get_validado_por_nome(self, obj):
        return self._name(obj.validado_por)

    def get_aprovado_por_nome(self, obj):
        return self._name(obj.aprovado_por)

    def get_entregue_por_nome(self, obj):
        return self._name(obj.entregue_por)

    def get_recebido_por_nome(self, obj):
        return self._name(obj.recebido_por)

    def validate(self, attrs):
        tipo_fluxo = attrs.get('tipo_fluxo')
        if tipo_fluxo is None and self.instance:
            tipo_fluxo = self.instance.tipo_fluxo
        data_retorno_prevista = attrs.get('data_retorno_prevista')
        if data_retorno_prevista is None and self.instance:
            data_retorno_prevista = self.instance.data_retorno_prevista
        if tipo_fluxo == 'EMPRESTIMO' and not data_retorno_prevista:
            raise serializers.ValidationError({
                'data_retorno_prevista': 'Informe a data/hora prevista de retorno para empréstimo.'
            })
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'message', 'date', 'lu', 'type']


class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'timestamp',
            'user',
            'user_username',
            'user_full_name',
            'action',
            'module',
            'model_name',
            'object_id',
            'reference',
            'changes',
            'snapshot',
        ]

    def get_user_full_name(self, obj):
        if not obj.user:
            return ''
        return obj.user.get_full_name() or obj.user.username


class RecebimentoHistoricoSerializer(serializers.ModelSerializer):
    recebido_por_nome = serializers.SerializerMethodField()
    materiel_code = serializers.CharField(source='item.materiel.code', read_only=True)
    materiel_description = serializers.CharField(source='item.materiel.description', read_only=True)

    class Meta:
        model = RecebimentoHistorico
        fields = [
            'id',
            'demande_lot',
            'item',
            'numero_sessao',
            'recebido_por',
            'recebido_por_nome',
            'recebido_em',
            'quantite_recebida',
            'quantite_acumulada',
            'quantite_pendente',
            'estado_recebimento',
            'comentario_recebimento',
            'materiel_code',
            'materiel_description',
        ]

    def get_recebido_por_nome(self, obj):
        if not obj.recebido_por:
            return ''
        return obj.recebido_por.get_full_name() or obj.recebido_por.username


class DemandeLotSerializer(serializers.ModelSerializer):
    items = DemandeItemSerializer(many=True, read_only=True)
    demandeur = UtilisateurSerializer(read_only=True)
    demandeur_reel = UtilisateurFinalSerializer(read_only=True)
    projet = serializers.StringRelatedField()
    formulario = PedidoFormularioSerializer(read_only=True)
    created_by_nome = serializers.SerializerMethodField(read_only=True)
    updated_by_nome = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DemandeLot
        fields = [
            'id', 'reference', 'demandeur', 'demandeur_reel', 'projet', 'date_demande',
            'statut', 'description', 'raison_refus', 'items', 'formulario',
            'updated_at', 'created_by_nome', 'updated_by_nome'
        ]
    def _user_name(self, user):
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_created_by_nome(self, obj):
        return self._user_name(getattr(obj, 'created_by', None))

    def get_updated_by_nome(self, obj):
        return self._user_name(getattr(obj, 'updated_by', None))
    def get_projet(self, obj):
        """Retourne les detais du projet, l'objet au complet"""
        if not obj.projet:
            return None
        return {
            'id': obj.projet.id,
            'nom': obj.projet.nom,
            'pilier': obj.projet.pilier,
            'localisation': obj.projet.localisation
        }

class ProjetChantierSerializer(serializers.ModelSerializer):
    responspable = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ProjetChantier
        fields = '__all__'

# api/serializers.py – Ajoute sa anba lòt serializer yo
class CategorieSerializer(serializers.ModelSerializer):
    famille = FamilleSerializer(read_only=True)
    famille_id = serializers.PrimaryKeyRelatedField(
        queryset=Famille.objects.all(),
        source='famille',
        write_only=True,
        required=False,
        allow_null=True
    )
    parent_nom = serializers.CharField(source='parent.nom', read_only=True)
    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'famille', 'famille_id', 'parent', 'parent_nom', 'chemin_complet']  # Tout chan yo (nom, description, parent)


class SousCategorieSerializer(serializers.ModelSerializer):
    categorie_id = serializers.PrimaryKeyRelatedField(
        queryset=Categorie.objects.all(),
        source='categorie',
        write_only=True,
        required=False,
        allow_null=True
    )
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)

    class Meta:
        model = SousCategorie
        fields = ['id', 'nom', 'description', 'categorie', 'categorie_id', 'categorie_nom']


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'  # Tout chan yo (nom, contact, telephone, email, adresse, actif)


class EntrepotSerializer(serializers.ModelSerializer):
    projet = serializers.StringRelatedField(read_only=True)
    projet_pilier = serializers.CharField(source='projet.pilier', read_only=True)
    responsable = serializers.StringRelatedField(read_only=True)
    projet_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjetChantier.objects.all(),
        source='projet',
        write_only=True,
        required=False,
        allow_null=True
    )
    responsable_id = serializers.PrimaryKeyRelatedField(
        queryset=Utilisateur.objects.all(),
        source='responsable',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Entrepot
        fields = '__all__'
