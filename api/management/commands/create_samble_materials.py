from django.core.management.base import BaseCommand
from api.models import Categorie, Fournisseur, Materiel, Entrepot

class Command(BaseCommand):
    help = 'Crée des matériaux d\'exemple pour tester le système'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Création des matériaux exemples...'))
        
        # Vérifier les catégories
        try:
            cat_tuyau_pehd = Categorie.objects.get(nom='TUYAU_PEHD')
            cat_vanne = Categorie.objects.get(nom='VANNE_ARRET')
            cat_compteur = Categorie.objects.get(nom='COMPTEUR_EAU')
        except Categorie.DoesNotExist:
            self.stdout.write(self.style.ERROR('❌ Catégories manquantes! Exécutez d\'abord: python manage.py populate_familles'))
            return
        
        # Get or create fournisseur
        fournisseur, _ = Fournisseur.objects.get_or_create(
            nom='SUEZ Supply',
            defaults={
                'contact': 'Service Commercial',
                'telephone': '+244 923 456 789',
                'email': 'supply@suez.ao',
                'actif': True
            }
        )
        
        # Get or create entrepot
        entrepot, _ = Entrepot.objects.get_or_create(
            nom='Dépôt Central',
            defaults={'localisation': 'Luanda'}
        )
        
        materiaux = [
            {
                'code': 'TUB-PE-110-PN10-12M',
                'description': 'Tuyau PEHD Ø110mm PN10 barre de 12m',
                'categorie': cat_tuyau_pehd,
                'unite': 'un',
                'stock_min': 10,
                'stock_max': 50,
                'prix_unitaire': 8500.00,
                'diametre_nominal': 110,
                'pression_nominal': 'PN10',
                'type_materiau': 'PEHD',
                'usage_typique': 'Extension réseau',
            },
            {
                'code': 'TUB-PE-63-PN16-12M',
                'description': 'Tuyau PEHD Ø63mm PN16 barre de 12m',
                'categorie': cat_tuyau_pehd,
                'unite': 'un',
                'stock_min': 15,
                'stock_max': 60,
                'prix_unitaire': 4200.00,
                'diametre_nominal': 63,
                'pression_nominal': 'PN16',
                'type_materiau': 'PEHD',
                'usage_typique': 'Extension réseau',
            },
            {
                'code': 'VAN-ARR-110-PN10',
                'description': 'Vanne d\'arrêt Ø110mm PN10 à opercule',
                'categorie': cat_vanne,
                'unite': 'un',
                'stock_min': 5,
                'stock_max': 20,
                'prix_unitaire': 15000.00,
                'diametre_nominal': 110,
                'pression_nominal': 'PN10',
                'type_materiau': 'Fonte',
                'usage_typique': 'Régulation réseau',
            },
            {
                'code': 'CPT-EAU-20-MEC',
                'description': 'Compteur d\'eau mécanique Ø20mm',
                'categorie': cat_compteur,
                'unite': 'un',
                'stock_min': 20,
                'stock_max': 100,
                'prix_unitaire': 2500.00,
                'diametre_nominal': 20,
                'pression_nominal': 'PN16',
                'type_materiau': 'Laiton',
                'usage_typique': 'Comptage abonné',
            },
        ]
        
        for mat_data in materiaux:
            mat, created = Materiel.objects.get_or_create(
                code=mat_data['code'],
                defaults={
                    **mat_data,
                    'fournisseur': fournisseur,
                    'entrepot_principal': entrepot
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✅ Créé: {mat.code}'))
            else:
                self.stdout.write(self.style.WARNING(f'  ℹ️  Existe déjà: {mat.code}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Total matériaux: {Materiel.objects.count()}'))
