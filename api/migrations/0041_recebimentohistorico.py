from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0040_alter_souscategorie_categorie_related_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RecebimentoHistorico',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero_sessao', models.PositiveIntegerField(default=1)),
                ('recebido_em', models.DateTimeField()),
                ('quantite_recebida', models.PositiveIntegerField(default=0)),
                ('quantite_acumulada', models.PositiveIntegerField(default=0)),
                ('quantite_pendente', models.PositiveIntegerField(default=0)),
                ('estado_recebimento', models.CharField(default='PENDENTE', max_length=20)),
                ('comentario_recebimento', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('demande_lot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historico_recebimentos', to='api.demandelot')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historico_recebimentos', to='api.demandeitem')),
                ('recebido_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='historico_recebimentos', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Histórico de Recebimento',
                'verbose_name_plural': 'Histórico de Recebimentos',
                'ordering': ['-recebido_em', '-id'],
            },
        ),
    ]

