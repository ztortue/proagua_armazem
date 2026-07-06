from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0053_add_annule_to_demandelot_statut'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedidoformulario',
            name='nome_solicitante_fisico',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
