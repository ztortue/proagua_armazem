from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db.models import Sum
from django.core.cache import cache
from django.utils import timezone
import re
import unicodedata
# from requests import Response



class Famille(models.Model):
    """
    Famille = Nivo pi wo nan classification materyel
    Egzanp: PLOMBERIE, ELECTRIQUE, SCADA,
    """

    code = models.CharField(
        "Code Famille",
        max_length=10,
        unique=True,
        null=True,
        help_text="Code court et lisible (ex: PLB, ELEC, INST)"
    )
    nom = models.CharField("Nom de la Famille", max_length=100, unique=True)
    description=models.TextField("Description", blank=True)
    icone = models.CharField("Icone(emoji)", max_length=10, blank=True, default='📦')
    ordre = models.PositiveBigIntegerField("Ordre d'affichage", default=0)

    class Meta:
        verbose_name = "Famille de Materiaux"
        verbose_name_plural = "Familles de Materiaux"
        ordering = ['ordre', 'nom']


    def __str__(self):
        return f"{self.icone} {self.nom}"
    
# ===================================================================
# 1. Itilizatè / Anplwaye (Custom User)
# ===================================================================

class Utilisateur(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrador'),
        ('MANAGER', 'Gestor'),
        ('USER', 'Usuário Comum'),
        ('CONSULTATION', 'Consulta'),
    )
    PILIER_AFFECTATION_CHOICES = (
        ('PILAR1', 'Pilar 1'),
        ('PILAR2', 'Pilar 2'),
        ('PILAR3', 'Pilar 3'),
        ('TODOS', 'Todos os Pilares'),
    )

    poste = models.CharField("Cargo", max_length=100, blank=True)
    service = models.CharField("Departamento", max_length=100, blank=True)
    telephone = models.CharField("Telefone", max_length=20, blank=True)
    role = models.CharField("Papel no Sistema", max_length=20, choices=ROLE_CHOICES, default='USER')
    pilier_affectation = models.CharField(
        "Pilar de Afetação",
        max_length=20,
        choices=PILIER_AFFECTATION_CHOICES,
        default='TODOS',
    )

    def __str__(self):
        return self.get_full_name() or self.username
    
    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"


# ===================================================================
# 2. Baz pou Magazen
# ===================================================================

# ===================================================================
# Utilisateur Final
# ===================================================================
class UtilisateurFinal(models.Model):
    nom = models.CharField("Nome", max_length=100, null=True, blank=True)
    prenom = models.CharField("Prenome", max_length=100, null=True, blank=True)
    entreprise = models.CharField("Empresa", max_length=150)
    fonction = models.CharField("Funcao", max_length=150, null=True, blank=True)

    def __str__(self):
        return f"{self.prenom} {self.nom} - {self.entreprise}"

    class Meta:
        verbose_name = "Utilisateur Final"
        verbose_name_plural = "Utilisateurs Finals"


class UsoTipico(models.Model):
    nom = models.CharField("Nome", max_length=150, unique=True)
    actif = models.BooleanField("Ativo", default=True)
    ordem = models.PositiveIntegerField("Ordem", default=0)

    class Meta:
        verbose_name = "Uso Tipico"
        verbose_name_plural = "Usos Tipicos"
        ordering = ['ordem', 'nom']

    def __str__(self):
        return self.nom


class Categorie(models.Model):
    """
    Categorie = Kategori prensipal oswa sous-kategori
    Hierarki: Famille → Categorie Parent → Categorie Enfant
    """
    nom = models.CharField("Nome da Categoria", max_length=100)
    description = models.TextField("Descrição", blank=True)
    
    # ✅ NOUVO: Relasyon ak Famille
    famille = models.ForeignKey(
        Famille, 
        on_delete=models.CASCADE, 
        related_name='categories',
        verbose_name='Famille',
        null=True,  # Pou compatibility ak done ki deja genyen
        blank=True
    )
    
    # Deja genyen: Parent pou sous-kategori
    parent = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='subcategories', 
        verbose_name='Categoria Pai'
    )
    
    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        ordering = ['famille', 'nom']
        # ✅ Nom dwe inik nan menm famille
        unique_together = [['famille', 'nom']]
    
    def __str__(self):
        if self.famille:
            return f"{self.famille.nom} → {self.nom}"
        return self.nom
    
    @property
    def chemin_complet(self):
        """Retounen chemen konplè: Famille → Parent → Enfant"""
        parts = []
        if self.famille:
            parts.append(self.famille.nom)
        if self.parent:
            parts.append(self.parent.nom)
        parts.append(self.nom)
        return ' → '.join(parts)

class SousCategorie(models.Model):
    """
    Categorie = Kategori prensipal oswa sous-kategori
    Hierarki: Famille → Categorie Parent → Categorie Enfant
    """
    nom = models.CharField("Nome da Subcategoria", max_length=100)
    description = models.TextField("Descrição", blank=True)
    
    # ✅ NOUVO: Relasyon ak Categorie
    categorie = models.ForeignKey(
        Categorie, 
        on_delete=models.CASCADE, 
        related_name='sous_categories',
        verbose_name='Categorie',
        null=True,  # Pou compatibility ak done ki deja genyen
        blank=True
    )


class Fournisseur(models.Model):
    nom = models.CharField("Nome do Fornecedor", max_length=255)
    contact = models.CharField("Pessoa de Contato", max_length=100, blank=True)
    telephone = models.CharField("Telefone", max_length=20, blank=True)
    email = models.EmailField("E-mail", blank=True)
    adresse = models.TextField("Endereço", blank=True)
    actif = models.BooleanField("Ativo", blank=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Fornecedor"
        verbose_name_plural = "Fornecedores"

class ProjetChantier(models.Model):
    PILIER_CHOICES = (
        ('PILAR1', 'Pilar 1'),
        ('PILAR2', 'Pilar 2'),
        ('PILAR3', 'Pilar 3'),
    )
    nom = models.CharField("Nome do Projeto", max_length=255)
    localisation = models.TextField("Localização", blank=True)
    pilier = models.CharField("Pilar", max_length=20, choices=PILIER_CHOICES)
    responsable = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True,
                                   related_name='projets_geres', verbose_name="Responsável")
    date_debut = models.DateField("Data de Início", null=True, blank=True)
    date_fin_prevue = models.DateField("Data Prevista de Término", null=True, blank=True)

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Projeto / Canteiro"
        verbose_name_plural = "Projetos / Canteiros"


class Entrepot(models.Model):
    nom = models.CharField("Nome do Depósito", max_length=100, unique=True)
    localisation = models.TextField("Localização", blank=True)
    projet = models.ForeignKey(ProjetChantier, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='entrepots', verbose_name="Projeto Associado")
    responsable = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True,
                                   related_name='depositos_geridos', verbose_name="Responsável pelo Depósito")

    def __str__(self):
        return self.nom

    class Meta:
        verbose_name = "Depósito"
        verbose_name_plural = "Depósitos"


# ===================================================================
# 6. LOCALISATION FIZIK NAN MAGAZEN (Adressage Magasin)
# ===================================================================

class Zone(models.Model):
    """ZONA A, ZONA B, ZONA C ..."""
    code = models.CharField("Código da Zona", max_length=10, unique=True)  # ex: A, B, C, AA, Z1
    nom = models.CharField("Nome da Zona", max_length=50)
    famille = models.ForeignKey(
        Famille,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='zones',
        verbose_name='Famille'
    )
    entrepot = models.ForeignKey(Entrepot, on_delete=models.CASCADE, related_name='zones')

    def __str__(self):
        return f"Zona {self.code} - {self.nom}"

    class Meta:
        verbose_name = "Zona"
        verbose_name_plural = "Zonas"
        unique_together = ('code', 'entrepot')  # yon ZONA A nan depo X diferan de ZONA A nan depo Y


class Corredor(models.Model):
    """Corredor 01, 02, 03... nan yon zòn"""
    numero = models.PositiveIntegerField("Número do Corredor")
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='corredors')

    def __str__(self):
        return f"Corredor {self.numero:02d}"

    class Meta:
        verbose_name = "Corredor"
        verbose_name_plural = "Corredores"
        unique_together = ('numero', 'zone')


class Etagere(models.Model):
    """Etagère / Rack"""
    numero = models.PositiveIntegerField("Número da Estante")
    corredor = models.ForeignKey(Corredor, on_delete=models.CASCADE, related_name='etageres')

    def __str__(self):
        return f"Estante {self.numero:02d}"

    class Meta:
        verbose_name = "Estante"
        verbose_name_plural = "Estantes"
        unique_together = ('numero', 'corredor')


class Niveau(models.Model):
    """Niveau 1, 2, 3, 4 nan yon etagère"""
    numero = models.PositiveIntegerField("Nível")
    etagere = models.ForeignKey(Etagere, on_delete=models.CASCADE, related_name='niveaux')

    def __str__(self):
        return f"Nível {self.numero}"

    class Meta:
        verbose_name = "Nível"
        verbose_name_plural = "Níveis"
        unique_together = ('numero', 'etagere')


class Emplacement(models.Model):
    """
    Emplacement final: yon selil fizik nan depo a
    Ex: ZONA A → Corredor 03 → Estante 05 → Nível 2
    """
    niveau = models.OneToOneField(Niveau, on_delete=models.CASCADE, related_name='emplacement')

    class Meta:
        verbose_name = "Emplacement"
        verbose_name_plural = "Emplacements"

    def __str__(self):
        return f"{self.niveau.etagere.corredor.zone.code}-{self.niveau.etagere.corredor.numero:02d}-{self.niveau.etagere.numero:02d}-{self.niveau.numero}"

    @property
    def adresse_complete(self):
        """Retounen adrès konplè pou afichaj: A-03-05-2"""
        z = self.niveau.etagere.corredor.zone.code
        c = self.niveau.etagere.corredor.numero
        e = self.niveau.etagere.numero
        n = self.niveau.numero
        return f"{z}-{c:02d}-{e:02d}-{n}"


# ===================================================================
# 3. Materyèl ak Stock pa Depósito (trè enpòtan!)
# ===================================================================
class Materiel(models.Model):
    # Keep deterministic order to avoid endless spurious migrations.
    UNITE_CHOICES = [
        ('lot', 'Lote'),
        ('un', 'Unidade'),
        ('kg', 'Quilo'),
        ('m', 'Metro'),
    ]

    # Order aligned with latest applied migration state.
    PILIER_CHOICES = [
        ('TODOS', 'Todos os Pilares'),
        ('PILAR3', 'Pilar 3'),
        ('PILAR2', 'Pilar 2'),
        ('PILAR1', 'Pilar 1'),
    ]
    code = models.CharField("Código", max_length=50, unique=True, db_index=True, blank=True)
    description = models.TextField("Descrição")
    unite = models.CharField("Unidade", max_length=20, choices=UNITE_CHOICES)  # ex: un, kg, m, litro...
    stock_min = models.PositiveIntegerField("Estoque Mínimo", default=0)
    stock_max = models.PositiveIntegerField("Estoque Máximo", null=True, blank=True)
    prix_unitaire = models.DecimalField( 
        max_digits=12, 
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Preço Unitário", 
        default=0, 
        validators=[MinValueValidator(0)]
    )

    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, related_name='materiels')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True, related_name='materiels')
    fournisseurs = models.ManyToManyField(
        Fournisseur,
        through='MaterielFournisseur',
        related_name='materiels_catalogo',
        blank=True,
    )
    souscategorie = models.ForeignKey(
        SousCategorie,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materiels',
        verbose_name='Subcategoria'
    )
    entrepot_principal = models.ForeignKey(Entrepot, on_delete=models.SET_NULL, null=True, blank=True, related_name='materias_principios', verbose_name="Depot Principal", help_text="Depot ou ce materiel est priclipalement stocke")
    pilier = models.CharField(
        Entrepot,
        max_length=10,
        choices=PILIER_CHOICES,
        default='TODOS',
        help_text="Pilar auquel ce matériel est affecté"
    )

    pression_nominal = models.CharField(
        "Pressão Nominal", 
        max_length=20, 
        blank=True, 
        default='N/A'          # ← VALÈ DEFAULT SI PA GEN ANYEN
    )

    type_materiau = models.CharField(
        "Tipo de Material", 
        max_length=50, 
        blank=True, 
        default='N/A'
    )

    usage_typique = models.CharField(
        "Uso Típico", 
        max_length=200, 
        blank=True, 
        default='N/A'
    )

    diametre_nominal = models.PositiveIntegerField(
        "Diâmetro Nominal (mm)", 
        null=True, 
        blank=True, 
        default=0               # ← 0 si pa gen valè
    )
    photo = models.ImageField("Foto do Material", upload_to='materiais/', null=True, blank=True)
    usage_type = models.CharField(
        "Tipo de Uso",
        max_length=10,
        choices=[('PRET', 'Pret'), ('INSTALL', 'Install')],
        default='INSTALL'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materiels_created'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='materiels_updated'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def _normalize_text(self, value: str) -> str:
        if not value:
            return ''
        normalized = unicodedata.normalize('NFKD', value)
        return ''.join([c for c in normalized if not unicodedata.combining(c)]).upper()

    def _token3(self, value: str, fallback: str = 'MAT') -> str:
        norm = self._normalize_text(value)
        alnum = re.sub(r'[^A-Z0-9]', '', norm)
        if not alnum:
            return fallback
        return alnum[:3]

    def _generate_code_base(self) -> str:
        famille = self.categorie.famille if self.categorie and self.categorie.famille else None
        famille_raw = (famille.code if famille and famille.code else (famille.nom if famille else ''))
        categorie_raw = self.categorie.nom if self.categorie else ''
        souscategorie_raw = self.souscategorie.nom if self.souscategorie else ''

        fam = self._token3(famille_raw or 'MAT', 'MAT')
        cat = self._token3(categorie_raw or 'CAT', 'CAT')
        sub = self._token3(souscategorie_raw or 'SUB', 'SUB')
        return f'{fam}-{cat}-{sub}'

    def _generate_code(self) -> str:
        # New standard: Famille-Categorie-SousCategorie-XXXX
        base = self._generate_code_base()
        regex = re.compile(rf'^{re.escape(base)}-(\d{{4}})$')
        max_seq = 0
        for existing in Materiel.objects.filter(code__startswith=f'{base}-').exclude(pk=self.pk).values_list('code', flat=True):
            match = regex.match((existing or '').upper())
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return f'{base}-{max_seq + 1:04d}'

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    @property
    def stock_actuel(self):
        # from django.db.models import Sum
        
        cache_key = f"stock_actuel_{self.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        total =  self.stocks.aggregate(Sum('quantite'))['quantite__sum'] or 0
        cache.set(cache_key, total, 60)
        return total
    
    @property
    def stock_par_entrepot(self):
        """"Retourne dictionnaire _entrepot_id: quantite"""
        return {
            stock.entrepot.id: stock.quantite
            for stock in self.stocks.select_related('entrepot')
        }
    
    
    @property
    def alert_stock_ba(self):
        return self.stock_actuel < self.stock_min

    @property
    def alert_stock_max(self):
        if self.stock_max:
            return self.stock_actuel > self.stock_max
        return False
    
    @property
    def famille(self):
        """Retourne la famille via la categorie"""
        if self.categorie and self.categorie.famille:
            return self.categorie.famille
        return None
    
    @property
    def categorie_principale(self):
        """"Retourne la categorie principale(parent) si c'est une sous-categorie"""
        if self.categorie and self.categorie.parent:
            return self.categorie.parent
        return self.categorie
    
    @property
    def chemin_complet(self):
        """Retourne: famille → Catégorie → Sous-catégorie"""
        if not self.categorie:
            return "Non classé"
        
        parts = []
        if self.categorie.famille:
            parts.append(self.categorie.famille.nom)
        if self.categorie.parent:
            parts.append(self.categorie.parent.nom)
        parts.append(self.categorie.nom)

        return ' → '.join(parts)
    

    def __str__(self):
        return f"{self.code} - {self.description}"

    class Meta:
        verbose_name = "Material"
        verbose_name_plural = "Materiais"
        ordering = ['code']
        indexes = [
            models.Index(fields=['code', 'description']),
            models.Index(fields=['pilier', 'entrepot_principal']),
        ]


class MaterielFournisseur(models.Model):
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE, related_name='fournisseur_links')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.CASCADE, related_name='materiel_links')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Relação Material-Fornecedor"
        verbose_name_plural = "Relações Material-Fornecedor"
        unique_together = [('materiel', 'fournisseur')]

    def __str__(self):
        return f"{self.materiel.code} <-> {self.fournisseur.nom}"


class StockEntrepot(models.Model):
    """Stock fizik pa depo – sa ki pèmèt nou gen stock diferan nan chak depo"""
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE, related_name='stocks')
    entrepot = models.ForeignKey(Entrepot, on_delete=models.CASCADE, related_name='stocks')
    quantite = models.PositiveIntegerField("Quantidade Atual", default=0)
    status = models.CharField(
        "Estado",
        max_length=20,
        choices=[
            ('DISPONIVEL', 'Disponivel'),
            ('EMPRESTADO', 'Emprestado'),
            ('A_INSTALAR', 'A instalar'),
            ('INSTALADO', 'Instalado'),
        ],
        default='DISPONIVEL'
    )
    data_retorno_prevista = models.DateField("Data Retorno Prevista", null=True, blank=True)
    emplacement = models.ForeignKey(Emplacement, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Localização Física")
    projet = models.ForeignKey(ProjetChantier, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('materiel', 'entrepot')
        verbose_name = "Estoque no Depósito"
        verbose_name_plural = "Estoques nos Depósitos"

    def __str__(self):
        loc = f" [{self.emplacement.adresse_complete}]" if self.emplacement else ""
        return f"{self.quantite} x {self.materiel} em {self.entrepot}{loc}"


# ===================================================================
# 4. Mouvman Materyèl
# ===================================================================
class Mouvement(models.Model):
    TYPE_CHOICES = (
        ('ENTREE', 'Entrada'),
        ('SORTIE', 'Saída'),
        ('TRANSFERT', 'Transferência'),
        ('RETOUR', 'Devolução'),
    )

    date_mvt = models.DateTimeField("Data do Movimento", auto_now_add=True)
    type_mvt = models.CharField("Tipo", max_length=10, choices=TYPE_CHOICES)
    quantite = models.PositiveIntegerField("Quantidade")
    raison = models.TextField("Motivo / Observação", blank=True)
    reference = models.CharField("Referencia", max_length=20, unique=True, blank=True, null=True)

    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE, related_name='mouvements', null=True, blank=True)
    entrepot = models.ForeignKey(Entrepot, on_delete=models.CASCADE, related_name='mouvements', null=True, blank=True)
    projet = models.ForeignKey(ProjetChantier, on_delete=models.SET_NULL, null=True, blank=True)
    demandeur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True,
                                 related_name='mouvements_demandes')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            today = timezone.localdate()
            date_str = today.strftime("%d%m%y")
            if self.type_mvt == "ENTREE":
                prefix = "REC"
            elif self.type_mvt == "SORTIE":
                prefix = "PED"
            else:
                prefix = "MOV"
            base = f"{prefix}{date_str}"
            count = Mouvement.objects.filter(
                reference__startswith=base,
                date_mvt__date=today
            ).count()
            self.reference = f"{base}{count + 1:02d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference or self.type_mvt} - {self.quantite} x {self.materiel.code}"

    class Meta:
        verbose_name = "Movimento"
        verbose_name_plural = "Movimentos"
        ordering = ['-date_mvt']


# ===================================================================
# 5. Demann Materyèl (Lot + Items)
# ===================================================================
class DemandeLot(models.Model):
    STATUT_CHOICES = (
        ('BROUILLON', 'Rascunho'),
        ('EN_ATTENTE', 'Pendente'),
        ('APPROUVEE', 'Aprovada'),
        ('REFUSEE', 'Recusada'),
        ('ENTREGUE', 'Entregue'),
        ('RECEBIDA', 'Recebida'),
    )

    demandeur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='demandes')
    demandeur_reel = models.ForeignKey(
        'UtilisateurFinal',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes',
        verbose_name='Demandeur Real'
    )
    projet = models.ForeignKey(ProjetChantier, on_delete=models.SET_NULL, null=True, blank=True)
    date_demande = models.DateTimeField("Data do Pedido", auto_now_add=True)
    statut = models.CharField("Status", max_length=15, choices=STATUT_CHOICES, default='BROUILLON')
    description = models.TextField("Justificativa", blank=True)
    raison_refus = models.TextField("Motivo da Recusa", blank=True, null=True)
    is_consultation = models.BooleanField(default=False)
    reference = models.CharField("Referencia", max_length=20, unique=True, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operations_created'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operations_updated'
    )
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def _normalize_token(self, value: str) -> str:
        if not value:
            return ''
        normalized = unicodedata.normalize('NFKD', value)
        cleaned = ''.join([c for c in normalized if not unicodedata.combining(c)])
        return re.sub(r'[^A-Za-z0-9]', '', cleaned).upper()

    def _prefix_from_fluxo(self) -> str:
        fluxo = ''
        try:
            if getattr(self, 'formulario', None):
                fluxo = (self.formulario.tipo_fluxo or '').upper()
        except Exception:
            fluxo = ''
        mapping = {
            'INSTALACAO': 'SAI',
            'EMPRESTIMO': 'EMP',
            'COMPRAS': 'COM',
            'TRANSFERENCIA': 'TRA',
            'DEVOLUCAO': 'DEV',
            'ENTRADA': 'ENT',
            'RETORNO': 'RET',
        }
        return mapping.get(fluxo, 'SAI')

    def _parts_from_first_item(self):
        first_item = self.items.select_related('materiel').order_by('id').first()
        materiel_code = ''
        if first_item and first_item.materiel and first_item.materiel.code:
            materiel_code = first_item.materiel.code

        first_block = self._normalize_token((materiel_code or '').split('-')[0])[:3] or 'GEN'
        last_number_match = re.search(r'(\d+)(?!.*\d)', materiel_code or '')
        if last_number_match:
            number4 = last_number_match.group(1).zfill(4)[-4:]
        else:
            number4 = str(self.pk or 0).zfill(4)[-4:]
        return first_block, number4

    def _next_reference(self) -> str:
        tipo = self._prefix_from_fluxo()
        key3, num4 = self._parts_from_first_item()
        base = f"{tipo}-{key3}-{num4}-"
        qs = DemandeLot.objects.filter(reference__startswith=base)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        seq = 0
        for ref in qs.values_list('reference', flat=True):
            match = re.search(rf"^{re.escape(base)}(\d{{2}})$", ref or '')
            if match:
                seq = max(seq, int(match.group(1)))
        return f"{base}{seq + 1:02d}"

    def regenerate_reference(self):
        self.reference = self._next_reference()
        super().save(update_fields=['reference'])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = self._next_reference()
            super().save(update_fields=['reference'])

    def __str__(self):
        return f"{self.reference or f'Pedido #{self.id}'} - {self.demandeur} - {self.get_statut_display()}"

    class Meta:
        verbose_name = "Pedido de Material"
        verbose_name_plural = "Pedidos de Materiais"
    
    def approuver(self, approuveur):
        with transaction.atomic():
            self.statut = 'APPROUVEE'
            self.updated_by = approuveur
            self.save(update_fields=['statut', 'updated_by', 'updated_at'])

            # Kreye mouvman yo ak entrepot ki byen detemine, sinon bloke apwobasyon an.
            for item in self.items.select_related('materiel', 'entrepot'):
                # Si pa gen kantite apwouve se kantite mande a pa default.
                if not item.quantite_approuvee:
                    item.quantite_approuvee = item.quantite_demandee or 0
                    item.save(update_fields=['quantite_approuvee'])
                quantite = item.quantite_approuvee or item.quantite_demandee or 0
                if quantite <= 0:
                    continue

                stock = item.materiel.stocks.select_related('entrepot').first()
                entrepot = item.entrepot or (stock.entrepot if stock else None) or item.materiel.entrepot_principal
                if not entrepot:
                    raise ValueError(
                        f"Impossible d'approuver la demande #{self.id}: aucun entrepot pour le materiel "
                        f"{item.materiel_id} ({item.materiel.description})."
                    )

                Mouvement.objects.create(
                    type_mvt='SORTIE',
                    quantite=quantite,
                    materiel=item.materiel,
                    entrepot=entrepot,
                    demandeur=approuveur,
                    raison=f'Apwouve demann #{self.id}'
                )

    def refuser(self, raison):
        self.statut = 'REFUSEE'
        self.raison_refus = raison
        self.save(update_fields=['statut', 'raison_refus', 'updated_at'])


class DemandeItem(models.Model):
    ESTADO_RECEBIMENTO_CHOICES = (
        ('PENDENTE', 'Pendente'),
        ('CONFORME', 'Em conformidade'),
        ('AVARIA', 'Com avaria'),
        ('INCOMPLETO', 'Incompleto'),
    )

    lot = models.ForeignKey(DemandeLot, on_delete=models.CASCADE, related_name='items')
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE)
    entrepot = models.ForeignKey(
        Entrepot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demande_items'
    )
    quantite_demandee = models.PositiveIntegerField("Qtd Pedida")
    quantite_approuvee = models.PositiveIntegerField("Qtd Aprovada", default=0)
    quantite_entregue = models.PositiveIntegerField("Qtd Entregue", default=0)
    estado_recebimento = models.CharField(
        "Estado de Recebimento",
        max_length=20,
        choices=ESTADO_RECEBIMENTO_CHOICES,
        default='PENDENTE'
    )
    comentario_recebimento = models.TextField("Comentário de Recebimento", blank=True)
    data_necessaria = models.DateField("Data Necessária", null=True, blank=True)
    emplacement = models.ForeignKey(Emplacement, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('lot', 'materiel')
        verbose_name = "Item do Pedido"
        verbose_name_plural = "Itens do Pedido"

    def __str__(self):
        return f"{self.quantite_demandee} × {self.materiel}"
    
class PedidoFormulario(models.Model):
    TIPO_FLUXO_CHOICES = (
        ('INSTALACAO', 'Instalacao'),
        ('EMPRESTIMO', 'Empréstimo'),
        ('COMPRAS', 'Compras'),
        ('ENTRADA', 'Entrada'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('DEVOLUCAO', 'Devolucao'),
    )
    PRIORIDADE_CHOICES = (
        ('BAIXA', 'Baixa'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente'),
    )

    demande_lot = models.OneToOneField(
        DemandeLot,
        on_delete=models.CASCADE,
        related_name='formulario',
    )
    tipo_fluxo = models.CharField(max_length=15, choices=TIPO_FLUXO_CHOICES, default='INSTALACAO')
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default='MEDIA')
    motivo = models.TextField(blank=True)
    destino_uso = models.CharField(max_length=255, blank=True)
    observacoes = models.TextField(blank=True)
    data_retorno_prevista = models.DateTimeField(
        "Data/Hora Prevista de Retorno",
        null=True,
        blank=True,
    )
    numero_formulario_saida = models.CharField(max_length=30, blank=True, null=True, unique=True)
    numero_formulario_recebimento = models.CharField(max_length=30, blank=True, null=True, unique=True)
    estado_recebimento_geral = models.CharField(
        max_length=20,
        choices=(
            ('CONFORME', 'Em conformidade'),
            ('AVARIA', 'Com avaria'),
            ('INCOMPLETO', 'Incompleto'),
        ),
        blank=True,
        null=True,
    )
    local_recebimento = models.CharField(max_length=255, blank=True)
    observacao_recebimento = models.TextField(blank=True)
    entrepot_origem = models.ForeignKey(
        Entrepot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_origem',
    )
    entrepot_destino = models.ForeignKey(
        Entrepot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_destino',
    )

    solicitado_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_solicitados',
    )
    solicitado_em = models.DateTimeField(null=True, blank=True)
    validado_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_validados',
    )
    validado_em = models.DateTimeField(null=True, blank=True)
    aprovado_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_aprovados',
    )
    aprovado_em = models.DateTimeField(null=True, blank=True)
    entregue_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_entregues',
    )
    entregue_em = models.DateTimeField(null=True, blank=True)
    recebido_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='formulários_recebidos',
    )
    recebido_em = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'api_pedidoformulario'
        verbose_name = 'Formulário do Pedido'
        verbose_name_plural = 'Formulários dos Pedidos'

    def __str__(self):
        return f'Formulário #{self.demande_lot_id}'


class RecebimentoHistorico(models.Model):
    demande_lot = models.ForeignKey(
        DemandeLot,
        on_delete=models.CASCADE,
        related_name='historico_recebimentos',
    )
    item = models.ForeignKey(
        DemandeItem,
        on_delete=models.CASCADE,
        related_name='historico_recebimentos',
    )
    numero_sessao = models.PositiveIntegerField(default=1)
    recebido_por = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historico_recebimentos',
    )
    recebido_em = models.DateTimeField()
    quantite_recebida = models.PositiveIntegerField(default=0)
    quantite_acumulada = models.PositiveIntegerField(default=0)
    quantite_pendente = models.PositiveIntegerField(default=0)
    estado_recebimento = models.CharField(max_length=20, default='PENDENTE')
    comentario_recebimento = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Histórico de Recebimento'
        verbose_name_plural = 'Histórico de Recebimentos'
        ordering = ['-recebido_em', '-id']

    def __str__(self):
        return (
            f"Pedido #{self.demande_lot_id} sessão {self.numero_sessao} "
            f"item #{self.item_id} +{self.quantite_recebida}"
        )


class AuditLog(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)  # ex: 'create', 'update', 'delete'
    module = models.CharField(max_length=50, blank=True, default='')
    model_name = models.CharField(max_length=50)  # ex: 'Materiel', 'Mouvement'
    object_id = models.PositiveIntegerField()
    reference = models.CharField(max_length=80, blank=True, default='')
    snapshot = models.JSONField(default=dict, blank=True)
    changes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['module']),
            models.Index(fields=['model_name']),
            models.Index(fields=['reference']),
        ]

    def __str__(self):
        return f"{self.action} on {self.model_name} #{self.object_id} by {self.user}"

class RapportMouvman(models.Model):
    date_debut = models.DateField()
    date_fin = models.DateField()
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE)
    mouvman_entrees = models.PositiveIntegerField(default=0)
    mouvman_sorties = models.PositiveIntegerField(default=0)
    stock_initial = models.PositiveIntegerField()
    stock_final = models.PositiveIntegerField()
    projet = models.ForeignKey(ProjetChantier, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"Rapò {self.materiel} soti {self.date_debut} rive {self.date_fin}"

    class Meta:
      verbose_name = "Rapò Mouvman"
      verbose_name_plural = "Rapò Mouvman yo"

# Pou jenere
# Anba modèl yo – ranplase fonksyon sa a
def generate_rapport_quotidien():
    from datetime import date
    aujourdhui = date.today()
    
    for materiel in Materiel.objects.all():
        # Kalkile stock aktyèl (san cache pou rapò)
        stock_actuel = materiel.stocks.aggregate(Sum('quantite'))['quantite__sum'] or 0
        
        # Rechèch si gen rapò pou jodi a deja
        rapport, created = RapportMouvman.objects.get_or_create(
            date_debut=aujourdhui,
            date_fin=aujourdhui,
            materiel=materiel,
            defaults={
                'stock_initial': stock_actuel,
                'stock_final': stock_actuel,
                'mouvman_entrees': 0,
                'mouvman_sorties': 0,
            }
        )
        
        if not created:
            # Si deja egziste, mete ajou stock_final
            rapport.stock_final = stock_actuel
            rapport.save()

    print(f"Rapò jounen {aujourdhui} jenere avèk siksè!")

class Facture(models.Model):
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True)
    numero = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    statut = models.CharField(max_length=20, choices=[('PENDENTE', 'Pendente'), ('PAGA', 'Paga')])
    mouvman = models.OneToOneField(Mouvement, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['numero', 'date'])]
    
class Commande(models.Model):
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True)
    date_commande = models.DateField(auto_now_add=True)
    date_livraison_prevue = models.DateField(null=True)
    statut = models.CharField(max_length=20, choices=[('EN_ATTENTE', 'Pendente'), ('ENTREGUE', 'Entregue')])
    items = models.ManyToManyField(Materiel, through='CommandeItem')

class CommandeItem(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE)
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE)
    quantite = models.PositiveIntegerField()

class Notification(models.Model):
    user = models.ForeignKey(Utilisateur, on_delete=models.CASCADE)
    message = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    lu = models.BooleanField(default=False)
    type = models.CharField(
        max_length=20,
        choices=[
            ('STOCK_BA', 'Stock Ba'),
            ('DEMANN_APWOUVE', 'Demann Apwouve'),
            ('OPERACAO_PENDENTE', 'Operação Pendente'),
            ('ENTREGA_PENDENTE', 'Entrega Pendente'),
            ('RECEBIMENTO_PENDENTE', 'Recebimento Pendente'),
        ],
    )

class Lot(models.Model):
    materiel = models.ForeignKey(Materiel, on_delete=models.CASCADE)
    numero_lot = models.CharField(max_length=50)
    date_fabrication = models.DateField(null=True)
    date_expiration = models.DateField(null=True)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.SET_NULL, null=True)

