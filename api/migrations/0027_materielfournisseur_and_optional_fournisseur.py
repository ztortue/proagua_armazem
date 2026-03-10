from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_utilisateur_pilier_affectation'),
    ]

    operations = [
        migrations.AlterField(
            model_name='materiel',
            name='fournisseur',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='materiels',
                to='api.fournisseur',
            ),
        ),
        migrations.CreateModel(
            name='MaterielFournisseur',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('fournisseur', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='materiel_links', to='api.fournisseur')),
                ('materiel', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fournisseur_links', to='api.materiel')),
            ],
            options={
                'verbose_name': 'Relação Material-Fornecedor',
                'verbose_name_plural': 'Relações Material-Fornecedor',
                'unique_together': {('materiel', 'fournisseur')},
            },
        ),
        migrations.AddField(
            model_name='materiel',
            name='fournisseurs',
            field=models.ManyToManyField(blank=True, related_name='materiels_catalogo', through='api.MaterielFournisseur', to='api.fournisseur'),
        ),
    ]
