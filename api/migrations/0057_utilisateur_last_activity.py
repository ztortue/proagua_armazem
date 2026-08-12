from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0056_site_intervention'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilisateur',
            name='last_activity',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Última Atividade'),
        ),
    ]
