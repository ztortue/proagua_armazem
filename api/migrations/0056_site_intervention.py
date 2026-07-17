from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0055_enable_pg_trgm'),
    ]

    operations = [
        # DemandeLot
        migrations.AddField(
            model_name='demandelot',
            name='site_intervention',
            field=models.CharField(
                verbose_name='Local / Site de Intervenção',
                max_length=500,
                blank=True,
                default='',
            ),
        ),
        migrations.AddField(
            model_name='demandelot',
            name='pilier_intervention',
            field=models.CharField(
                verbose_name='Pilar de Intervenção',
                max_length=10,
                blank=True,
                default='',
                choices=[
                    ('PILAR1', 'Pilar 1 — ETA Kifangondo'),
                    ('PILAR2', 'Pilar 2 — CD Marçal'),
                    ('PILAR3', 'Pilar 3'),
                ],
            ),
        ),
        # Mouvement
        migrations.AddField(
            model_name='mouvement',
            name='site_intervention',
            field=models.CharField(
                verbose_name='Local / Site de Intervenção',
                max_length=500,
                blank=True,
                default='',
            ),
        ),
        migrations.AddField(
            model_name='mouvement',
            name='pilier_intervention',
            field=models.CharField(
                verbose_name='Pilar de Intervenção',
                max_length=10,
                blank=True,
                default='',
            ),
        ),
    ]
