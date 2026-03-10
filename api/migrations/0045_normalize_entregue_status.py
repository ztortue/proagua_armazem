from django.db import migrations


def normalize_livree_to_entregue(apps, schema_editor):
    DemandeLot = apps.get_model('api', 'DemandeLot')
    Commande = apps.get_model('api', 'Commande')

    DemandeLot.objects.filter(statut='LIVREE').update(statut='ENTREGUE')
    Commande.objects.filter(statut='LIVREE').update(statut='ENTREGUE')


def rollback_entregue_to_livree(apps, schema_editor):
    DemandeLot = apps.get_model('api', 'DemandeLot')
    Commande = apps.get_model('api', 'Commande')

    DemandeLot.objects.filter(statut='ENTREGUE').update(statut='LIVREE')
    Commande.objects.filter(statut='ENTREGUE').update(statut='LIVREE')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0044_alter_pedidoformulario_tipo_fluxo_add_entrada'),
    ]

    operations = [
        migrations.RunPython(normalize_livree_to_entregue, rollback_entregue_to_livree),
    ]

