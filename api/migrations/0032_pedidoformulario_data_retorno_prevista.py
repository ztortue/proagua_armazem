from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_demandeitem_comentario_recebimento_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedidoformulario',
            name='data_retorno_prevista',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Data/Hora Prevista de Retorno'),
        ),
    ]

