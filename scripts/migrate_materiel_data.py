"""
Script pour migrer les matériels existants sans pilier/entrepot
Run: python manage.py shell < scripts/migrate_materiel_data.py
"""

from api.models import Materiel, Entrepot

def migrer_materiels_existants():
    """Assigne pilier et entrepot par défaut aux matériels existants"""
    
    print("🔄 Migration des matériels existants...")
    
    # Récupérer le premier entrepot comme défaut
    entrepot_defaut = Entrepot.objects.first()
    
    if not entrepot_defaut:
        print("⚠️  Aucun dépôt trouvé! Créez d'abord un dépôt.")
        return
    
    materiels_sans_pilier = Materiel.objects.filter(pilier__isnull=True)
    count = materiels_sans_pilier.count()
    
    if count == 0:
        print("✅ Tous les matériels ont déjà un pilier assigné.")
        return
    
    print(f"📦 {count} matériels à mettre à jour...")
    
    # Assigner TOUS par défaut et entrepot principal
    materiels_sans_pilier.update(
        pilier='TOUS',
        entrepot_principal=entrepot_defaut
    )
    
    print(f"✅ {count} matériels mis à jour!")
    print(f"   - Pilier: TOUS")
    print(f"   - Dépôt: {entrepot_defaut.nom}")

if __name__ == '__main__':
    migrer_materiels_existants()