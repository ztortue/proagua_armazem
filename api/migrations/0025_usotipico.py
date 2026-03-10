from django.db import migrations, models


def seed_usos_tipicos(apps, schema_editor):
    UsoTipico = apps.get_model('api', 'UsoTipico')
    defaults = [
        (1, 'Extensao de rede'),
        (2, 'Caixa com grade'),
        (3, 'Caminho de cabos'),
        (4, 'SCADA'),
        (5, 'Deteccao de fuga'),
        (6, 'Reparacao de fuga'),
    ]
    for ordem, nom in defaults:
        UsoTipico.objects.get_or_create(nom=nom, defaults={'ordem': ordem, 'actif': True})


def unseed_usos_tipicos(apps, schema_editor):
    UsoTipico = apps.get_model('api', 'UsoTipico')
    UsoTipico.objects.filter(
        nom__in=[
            'Extensao de rede',
            'Caixa com grade',
            'Caminho de cabos',
            'SCADA',
            'Deteccao de fuga',
            'Reparacao de fuga',
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_merge_0022_0023'),
    ]

    operations = [
        migrations.CreateModel(
            name='UsoTipico',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=150, unique=True, verbose_name='Nome')),
                ('actif', models.BooleanField(default=True, verbose_name='Ativo')),
                ('ordem', models.PositiveIntegerField(default=0, verbose_name='Ordem')),
            ],
            options={
                'verbose_name': 'Uso Tipico',
                'verbose_name_plural': 'Usos Tipicos',
                'ordering': ['ordem', 'nom'],
            },
        ),
        migrations.RunPython(seed_usos_tipicos, unseed_usos_tipicos),
    ]

