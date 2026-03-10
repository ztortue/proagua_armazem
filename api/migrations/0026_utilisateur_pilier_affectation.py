from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_usotipico'),
    ]

    operations = [
        migrations.AddField(
            model_name='utilisateur',
            name='pilier_affectation',
            field=models.CharField(
                choices=[
                    ('PILAR1', 'Pilar 1'),
                    ('PILAR2', 'Pilar 2'),
                    ('PILAR3', 'Pilar 3'),
                    ('TODOS', 'Todos os Pilares'),
                ],
                default='TODOS',
                max_length=20,
                verbose_name='Pilar de Afetação',
            ),
        ),
    ]

