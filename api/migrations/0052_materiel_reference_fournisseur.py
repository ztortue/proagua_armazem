from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0051_add_stock_inicial_to_materiel'),
    ]

    operations = [
        migrations.AddField(
            model_name='materiel',
            name='reference_fournisseur',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Referencia do Fornecedor'),
        ),
    ]
