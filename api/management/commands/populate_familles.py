from django.core.management.base import BaseCommand
from api.models import Famille, Categorie

class Command(BaseCommand):
    help = 'Crée les Familles et Catégories de matériaux'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Création des Familles et Catégories...'))
        
        # === FAMILLE 1: PLOMBERIE ===
        plomberie, created = Famille.objects.get_or_create(
            nom='PLOMBERIE',
            defaults={
                'description': 'Tuyauterie, raccords et accessoires hydrauliques',
                'icone': '🔧',
                'ordre': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ Famille créée: {plomberie.nom}'))
        
        categories_plomberie = [
            ('TUYAUTERIE', 'Tuyaux et conduites', [
                ('TUYAU_PEHD', 'Tuyaux PEHD'),
                ('TUYAU_PVC', 'Tuyaux PVC'),
                ('TUYAU_FONTE', 'Tuyaux fonte'),
            ]),
            ('RACCORDEMENT', 'Raccords et joints', [
                ('COUDE', 'Coudes'),
                ('TE', 'Tés et dérivations'),
                ('REDUCTION', 'Réductions'),
            ]),
            ('VANNES', 'Vannes et robinets', [
                ('VANNE_ARRET', 'Vannes d\'arrêt'),
                ('VANNE_REGULATION', 'Vannes de régulation'),
            ]),
        ]
        
        for cat_nom, cat_desc, sous_cats in categories_plomberie:
            cat, created = Categorie.objects.get_or_create(
                famille=plomberie,
                nom=cat_nom,
                defaults={'description': cat_desc}
            )
            if created:
                self.stdout.write(f'  ✅ {plomberie.nom} → {cat_nom}')
            
            for sous_nom, sous_desc in sous_cats:
                sous_cat, created = Categorie.objects.get_or_create(
                    famille=plomberie,
                    nom=sous_nom,
                    parent=cat,
                    defaults={'description': sous_desc}
                )
                if created:
                    self.stdout.write(f'    ✅ {cat_nom} → {sous_nom}')
        
        # === FAMILLE 2: ÉLECTROMÉCANIQUE ===
        electro, created = Famille.objects.get_or_create(
            nom='ELECTROMECANIQUE',
            defaults={
                'description': 'Équipements électriques et mécaniques',
                'icone': '⚡',
                'ordre': 2
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ Famille créée: {electro.nom}'))
        
        categories_electro = [
            ('POMPAGE', 'Pompes et équipements', [
                ('POMPE_IMMERGEE', 'Pompes immergées'),
                ('ELECTROPOMPE', 'Électropompes'),
            ]),
            ('CABLES', 'Câbles et accessoires', [
                ('CABLE_ELECTRIQUE', 'Câbles électriques'),
                ('CHEMIN_CABLE', 'Chemins de câbles'),
            ]),
        ]
        
        for cat_nom, cat_desc, sous_cats in categories_electro:
            cat, created = Categorie.objects.get_or_create(
                famille=electro,
                nom=cat_nom,
                defaults={'description': cat_desc}
            )
            if created:
                self.stdout.write(f'  ✅ {electro.nom} → {cat_nom}')
            
            for sous_nom, sous_desc in sous_cats:
                sous_cat, created = Categorie.objects.get_or_create(
                    famille=electro,
                    nom=sous_nom,
                    parent=cat,
                    defaults={'description': sous_desc}
                )
                if created:
                    self.stdout.write(f'    ✅ {cat_nom} → {sous_nom}')
        
        # === FAMILLE 3: INSTRUMENTATION ===
        instru, created = Famille.objects.get_or_create(
            nom='INSTRUMENTATION',
            defaults={
                'description': 'Instruments de mesure et contrôle',
                'icone': '📊',
                'ordre': 3
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ Famille créée: {instru.nom}'))
        
        categories_instru = [
            ('COMPTAGE', 'Comptage et mesure', [
                ('COMPTEUR_EAU', 'Compteurs d\'eau'),
                ('DEBITMETRE', 'Débitmètres'),
            ]),
            ('CAPTEURS', 'Capteurs et analyseurs', [
                ('CAPTEUR_PRESSION', 'Capteurs de pression'),
                ('ANALYSEUR_QUALITE', 'Analyseurs qualité'),
            ]),
        ]
        
        for cat_nom, cat_desc, sous_cats in categories_instru:
            cat, created = Categorie.objects.get_or_create(
                famille=instru,
                nom=cat_nom,
                defaults={'description': cat_desc}
            )
            if created:
                self.stdout.write(f'  ✅ {instru.nom} → {cat_nom}')
            
            for sous_nom, sous_desc in sous_cats:
                sous_cat, created = Categorie.objects.get_or_create(
                    famille=instru,
                    nom=sous_nom,
                    parent=cat,
                    defaults={'description': sous_desc}
                )
                if created:
                    self.stdout.write(f'    ✅ {cat_nom} → {sous_nom}')
        
        # === FAMILLE 4: SCADA ===
        scada, created = Famille.objects.get_or_create(
            nom='SCADA_AUTOMATISME',
            defaults={
                'description': 'Systèmes SCADA et automatisation',
                'icone': '🖥️',
                'ordre': 4
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✅ Famille créée: {scada.nom}'))
        
        categories_scada = [
            ('AUTOMATISME', 'Automates et contrôle', [
                ('AUTOMATE_PLC', 'Automates PLC'),
                ('SUPERVISION', 'Systèmes de supervision'),
            ]),
            ('COMMUNICATION', 'Communication et réseau', [
                ('MODEM', 'Modems industriels'),
                ('ANTENNE', 'Antennes de communication'),
            ]),
        ]
        
        for cat_nom, cat_desc, sous_cats in categories_scada:
            cat, created = Categorie.objects.get_or_create(
                famille=scada,
                nom=cat_nom,
                defaults={'description': cat_desc}
            )
            if created:
                self.stdout.write(f'  ✅ {scada.nom} → {cat_nom}')
            
            for sous_nom, sous_desc in sous_cats:
                sous_cat, created = Categorie.objects.get_or_create(
                    famille=scada,
                    nom=sous_nom,
                    parent=cat,
                    defaults={'description': sous_desc}
                )
                if created:
                    self.stdout.write(f'    ✅ {cat_nom} → {sous_nom}')
        
        # === RÉSUMÉ ===
        self.stdout.write(self.style.SUCCESS('\n✅ TERMINÉ!'))
        self.stdout.write(f'Total Familles: {Famille.objects.count()}')
        self.stdout.write(f'Total Catégories: {Categorie.objects.count()}')