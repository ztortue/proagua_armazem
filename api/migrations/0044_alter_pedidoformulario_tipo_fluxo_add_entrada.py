from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0043_alter_pedidoformulario_tipo_fluxo"),
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
                    ("ENTRADA", "Entrada"),
                    ("TRANSFERENCIA", "Transferencia"),
                    ("DEVOLUCAO", "Devolucao"),
                ],
                default="INSTALACAO",
                max_length=15,
            ),
        ),
    ]
