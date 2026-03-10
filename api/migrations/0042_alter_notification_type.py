from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0041_recebimentohistorico'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(
                choices=[
                    ('STOCK_BA', 'Stock Ba'),
                    ('DEMANN_APWOUVE', 'Demann Apwouve'),
                    ('OPERACAO_PENDENTE', 'Operação Pendente'),
                    ('ENTREGA_PENDENTE', 'Entrega Pendente'),
                    ('RECEBIMENTO_PENDENTE', 'Recebimento Pendente'),
                ],
                max_length=20,
            ),
        ),
    ]

