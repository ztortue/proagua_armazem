from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0042_alter_notification_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pedidoformulario",
            name="tipo_fluxo",
            field=models.CharField(
                choices=[
                    ("INSTALACAO", "Instalacao"),
                    ("EMPRESTIMO", "Empréstimo"),
                    ("COMPRAS", "Compras"),
                    ("TRANSFERENCIA", "Transferencia"),
                    ("DEVOLUCAO", "Devolucao"),
                ],
                default="INSTALACAO",
                max_length=15,
            ),
        ),
    ]
