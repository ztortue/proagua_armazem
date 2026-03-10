# api/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django import forms 
from .models import (
    Famille, 
    Utilisateur,
    UtilisateurFinal,
    UsoTipico,
    Categorie, Fournisseur,
    ProjetChantier, Entrepot,
    Materiel, StockEntrepot, 
    Mouvement,Zone, Corredor, 
    Etagere, Niveau, Emplacement,
    DemandeLot, DemandeItem
)

@admin.register(Famille)
class FamilleAdmin(admin.ModelAdmin):
    list_display = ('icone', 'nom', 'ordre', 'nb_categories')
    list_editable = ('ordre',)
    search_fields = ('nom', 'description')
    ordering = ('ordre', 'nom')
    
    def nb_categories(self, obj):
        return obj.categories.count()
    nb_categories.short_description = 'Nb Catégories'


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ('nom', 'famille', 'parent', 'nb_materiels')
    list_filter = ('famille', 'parent')
    search_fields = ('nom', 'description')
    
    def nb_materiels(self, obj):
        return obj.materiels.count()
    nb_materiels.short_description = 'Nb Matériels'

class UtilisateurCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Confirmation Password", widget=forms.PasswordInput)
    
    class Meta:
        model = Utilisateur
        fields = ("username", "email", "first_name", "last_name", "role", "pilier_affectation", "service", "telephone", "poste")

    def clean_password2(self):
        p1 = self.cleaned_data.get("password1")
        p2 = self.cleaned_data.get("password2")
        if p1 and p2 and p1 != p2:
            raise forms.ValidationError("Passwords don't match")
        return p2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"]) # for the Hash Function
        if commit:
            user.save()
        return user

class UtilisateurChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(label="Password (hashed)")

    class Meta:
        model = Utilisateur
        fields = ("username", "email", "first_name", "last_name", "role", "pilier_affectation", "service", "telephone", "poste", "is_active", "is_staff", "is_superuser", "password")

    def clean_password(self):
        return self.initial["password"]

@admin.register(Utilisateur)
class UtilisateurAdmin(DjangoUserAdmin):
    add_form = UtilisateurCreationForm
    form = UtilisateurChangeForm
    model = Utilisateur

    list_display = ('username', 'first_name', 'last_name', 'role', 'pilier_affectation', 'service', 'is_active')
    list_filter = ('role', 'pilier_affectation', 'service', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'email')

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email", "telephone", "poste", "service")}),
        ("Role", {"fields": ("role", "pilier_affectation")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "first_name", "last_name", "role", "pilier_affectation", "service", "telephone", "poste", "password1", "password2", "is_active", "is_staff"),
        }),
    )


# @admin.register(Categorie)
# class CategorieAdmin(admin.ModelAdmin):
#     list_display = ('nom', 'parent')
#     search_fields = ('nom',)

@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ('nom', 'telephone', 'email', 'actif')
    list_filter = ('actif',)
    search_fields = ('nom', 'email')

@admin.register(ProjetChantier)
class ProjetAdmin(admin.ModelAdmin):
    list_display = ('nom', 'pilier', 'responsable', 'date_debut')
    list_filter = ('pilier',)
    search_fields = ('nom',)

@admin.register(Entrepot)
class EntrepotAdmin(admin.ModelAdmin):
    list_display = ('nom', 'projet', 'responsable')
    search_fields = ('nom',)

@admin.register(Materiel)
class MaterielAdmin(admin.ModelAdmin):
    list_display = (
        'code', 
        'description_courte', 
        'get_famille', 
        'get_categorie',
        'entrepot_principal',
        'pilier',
        'stock_actuel', 
        'stock_min',
        'alert'
    )
    
    list_filter = (
        'pilier',
        'entrepot_principal',
        'categorie__famille',
        'categorie',
        'fournisseur',
    )
    
    search_fields = ('code', 'description', 'type_materiau')
    
    fieldsets = (
        ('Informations de Base', {
            'fields': ('code', 'description', 'unite', 'photo')
        }),
        ('Classification', {
            'fields': ('categorie', 'fournisseur', 'pilier', 'entrepot_principal'),
            'description': 'Famille et Catégorie Principale sont automatiquement déterminées'
        }),
        ('Caractéristiques Techniques', {
            'fields': (
                'diametre_nominal', 
                'pression_nominal', 
                'type_materiau', 
                'usage_typique'
            ),
            'classes': ('collapse',)
        }),
        ('Gestion de Stock', {
            'fields': ('stock_min', 'stock_max', 'prix_unitaire')
        }),
    )
    
    readonly_fields = ('stock_actuel',)
    
    def description_courte(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_courte.short_description = 'Description'
    
    def get_famille(self, obj):
        if obj.famille:
            return f"{obj.famille.icone} {obj.famille.nom}"
        return '-'
    get_famille.short_description = 'Famille'
    
    def get_categorie(self, obj):
        if obj.categorie:
            if obj.categorie.parent:
                return f"{obj.categorie.parent.nom} → {obj.categorie.nom}"
            return obj.categorie.nom
        return '-'
    get_categorie.short_description = 'Catégorie'
    
    def alert(self, obj):
        if obj.alert_stock_ba:
            return '⚠️ Stock Baixo'
        elif obj.alert_stock_max:
            return '⚠️ Stock Alto'
        return '✅ OK'
    alert.short_description = 'Alerta'

@admin.register(StockEntrepot)
class StockEntrepotAdmin(admin.ModelAdmin):
    list_display = ('materiel', 'entrepot', 'quantite', 'emplacement')
    search_fields = ('materiel__code', 'materiel__description')
    raw_id_fields = ('emplacement',)

@admin.register(Mouvement)
class MouvementAdmin(admin.ModelAdmin):
    list_display = ('date_mvt', 'type_mvt', 'materiel', 'quantite', 'entrepot', 'demandeur')
    list_filter = ('type_mvt', 'date_mvt')
    search_fields = ('materiel__code',)

# Localização física
admin.site.register(Zone)
admin.site.register(Corredor)
admin.site.register(Etagere)
admin.site.register(Niveau)
admin.site.register(Emplacement)

# Demandas
@admin.register(DemandeLot)
class DemandeLotAdmin(admin.ModelAdmin):
    list_display = ('id', 'demandeur', 'projet', 'date_demande', 'statut')
    list_filter = ('statut', 'date_demande')
    search_fields = ('demandeur__username',)

@admin.register(DemandeItem)
class DemandeItemAdmin(admin.ModelAdmin):
    list_display = ('lot', 'materiel', 'quantite_demandee', 'quantite_approuvee')


@admin.register(UtilisateurFinal)
class UtilisateurFinalAdmin(admin.ModelAdmin):
    list_display = ('entreprise', 'nom', 'prenom', 'fonction')
    search_fields = ('entreprise', 'nom', 'prenom', 'fonction')


@admin.register(UsoTipico)
class UsoTipicoAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ordem', 'actif')
    list_filter = ('actif',)
    search_fields = ('nom',)
