from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0047_auditlog_journal_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedidoformulario',
            name='numero_formulario_saida',
            field=models.CharField(blank=True, max_length=30, null=True, unique=True),
        ),
    ]

