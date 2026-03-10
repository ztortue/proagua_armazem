# Generated manually to align Materiel.pilier default with model choices.

import api.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_pedidoformulario_data_retorno_prevista'),
    ]

    operations = [
        migrations.AlterField(
            model_name='materiel',
            name='pilier',
            field=models.CharField(
                choices=[('TODOS', 'Todos os Pilares'), ('PILAR3', 'Pilar 3'), ('PILAR2', 'Pilar 2'), ('PILAR1', 'Pilar 1')],
                default='TODOS',
                help_text='Pilar auquel ce matÃ©riel est affectÃ©',
                max_length=10,
                verbose_name=api.models.Entrepot,
            ),
        ),
    ]

