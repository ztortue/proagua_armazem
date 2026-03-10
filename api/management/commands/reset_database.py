from django.core.management.base import BaseCommand
from api.models import Famille, Categorie, Materiel, Fournisseur, Entrepot

class Command(BaseCommand):
    help = 'Supprime toutes les données de test (Familles, Catégories, Matériaux)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirme la suppression sans demander',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            confirm = input('⚠️  Voulez-vous vraiment supprimer toutes les donnéesó (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Annulé.'))
                return
        
        self.stdout.write(self.style.WARNING('🗑️  Suppression des données...'))
        
        # Supprimer dans l'ordre (à cause des foreign keys)
        count_mat = Materiel.objects.count()
        Materiel.objects.all().delete()
        self.stdout.write(f'  ✅ {count_mat} matériaux supprimés')
        
        count_cat = Categorie.objects.count()
        Categorie.objects.all().delete()
        self.stdout.write(f'  ✅ {count_cat} catégories supprimées')
        
        count_fam = Famille.objects.count()
        Famille.objects.all().delete()
        self.stdout.write(f'  ✅ {count_fam} familles supprimées')
        
        count_fourn = Fournisseur.objects.count()
        Fournisseur.objects.all().delete()
        self.stdout.write(f'  ✅ {count_fourn} fournisseurs supprimés')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Base de données nettoyée!'))
