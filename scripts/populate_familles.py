"""
Script pou kreye Famille + Categorie ak sous-kategori yo
Run: python manage.py shell < scripts/populate_familles.py
"""

from api.models import Famille, Categorie

def populate_familles_et_categories():
    print("🚀 Création des Familles et Catégories...")
    
    # === FAMILLE 1: PLOMBERIE ===
    plomberie, _ = Famille.objects.get_or_create(
        nom='PLOMBERIE',
        defaults={
            'description': 'Tuyauterie, raccords et accessoires hydrauliques',
            'icone': '🔧',
            'ordre': 1
        }
    )
    
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
        cat, _ = Categorie.objects.get_or_create(
            famille=plomberie,
            nom=cat_nom,
            defaults={'description': cat_desc}
        )
        print(f"  ✅ {plomberie.nom} → {cat_nom}")
        
        for sous_nom, sous_desc in sous_cats:
            Categorie.objects.get_or_create(
                famille=plomberie,
                nom=sous_nom,
                parent=cat,
                defaults={'description': sous_desc}
            )
            print(f"    ✅ {cat_nom} → {sous_nom}")
    
    # === FAMILLE 2: ÉLECTROMÉCANIQUE ===
    electro, _ = Famille.objects.get_or_create(
        nom='ELECTROMECANIQUE',
        defaults={
            'description': 'Équipements électriques et mécaniques',
            'icone': '⚡',
            'ordre': 2
        }
    )
    
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
        cat, _ = Categorie.objects.get_or_create(
            famille=electro,
            nom=cat_nom,
            defaults={'description': cat_desc}
        )
        print(f"  ✅ {electro.nom} → {cat_nom}")
        
        for sous_nom, sous_desc in sous_cats:
            Categorie.objects.get_or_create(
                famille=electro,
                nom=sous_nom,
                parent=cat,
                defaults={'description': sous_desc}
            )
            print(f"    ✅ {cat_nom} → {sous_nom}")
    
    # === FAMILLE 3: INSTRUMENTATION ===
    instru, _ = Famille.objects.get_or_create(
        nom='INSTRUMENTATION',
        defaults={
            'description': 'Instruments de mesure et contrôle',
            'icone': '📊',
            'ordre': 3
        }
    )
    
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
        cat, _ = Categorie.objects.get_or_create(
            famille=instru,
            nom=cat_nom,
            defaults={'description': cat_desc}
        )
        print(f"  ✅ {instru.nom} → {cat_nom}")
        
        for sous_nom, sous_desc in sous_cats:
            Categorie.objects.get_or_create(
                famille=instru,
                nom=sous_nom,
                parent=cat,
                defaults={'description': sous_desc}
            )
            print(f"    ✅ {cat_nom} → {sous_nom}")
    
    # === FAMILLE 4: SCADA ===
    scada, _ = Famille.objects.get_or_create(
        nom='SCADA_AUTOMATISME',
        defaults={
            'description': 'Systèmes SCADA et automatisation',
            'icone': '🖥️',
            'ordre': 4
        }
    )
    
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
        cat, _ = Categorie.objects.get_or_create(
            famille=scada,
            nom=cat_nom,
            defaults={'description': cat_desc}
        )
        print(f"  ✅ {scada.nom} → {cat_nom}")
        
        for sous_nom, sous_desc in sous_cats:
            Categorie.objects.get_or_create(
                famille=scada,
                nom=sous_nom,
                parent=cat,
                defaults={'description': sous_desc}
            )
            print(f"    ✅ {cat_nom} → {sous_nom}")
    
    print("\n✅ TERMINÉ!")
    print(f"Total Familles: {Famille.objects.count()}")
    print(f"Total Catégories: {Categorie.objects.count()}")

if __name__ == '__main__':
    populate_familles_et_categories()