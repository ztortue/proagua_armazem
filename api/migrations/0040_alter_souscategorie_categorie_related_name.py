from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_materiel_souscategorie_alter_demandelot_statut_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='souscategorie',
            name='categorie',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='sous_categories',
                to='api.categorie',
                verbose_name='Categorie',
            ),
        ),
    ]

