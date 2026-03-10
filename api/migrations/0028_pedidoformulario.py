from django.db import migrations, models
import django.db.models.deletion


def seed_formularios(apps, schema_editor):
    DemandeLot = apps.get_model('api', 'DemandeLot')
    PedidoFormulario = apps.get_model('api', 'PedidoFormulario')
    for lot in DemandeLot.objects.all().iterator():
        PedidoFormulario.objects.get_or_create(
            demande_lot=lot,
            defaults={
                'solicitado_por_id': lot.demandeur_id,
                'solicitado_em': lot.date_demande,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0027_materielfournisseur_and_optional_fournisseur'),
    ]

    operations = [
        migrations.CreateModel(
            name='PedidoFormulario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo_fluxo', models.CharField(choices=[('INSTALACAO', 'Instalacao'), ('EMPRESTIMO', 'Empréstimo')], default='INSTALACAO', max_length=15)),
                ('prioridade', models.CharField(choices=[('BAIXA', 'Baixa'), ('MEDIA', 'Media'), ('ALTA', 'Alta'), ('URGENTE', 'Urgente')], default='MEDIA', max_length=10)),
                ('motivo', models.TextField(blank=True)),
                ('destino_uso', models.CharField(blank=True, max_length=255)),
                ('observacoes', models.TextField(blank=True)),
                ('solicitado_em', models.DateTimeField(blank=True, null=True)),
                ('validado_em', models.DateTimeField(blank=True, null=True)),
                ('aprovado_em', models.DateTimeField(blank=True, null=True)),
                ('entregue_em', models.DateTimeField(blank=True, null=True)),
                ('recebido_em', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('aprovado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='formulários_aprovados', to='api.utilisateur')),
                ('demande_lot', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='formulario', to='api.demandelot')),
                ('entregue_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='formulários_entregues', to='api.utilisateur')),
                ('recebido_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='formulários_recebidos', to='api.utilisateur')),
                ('solicitado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='formulários_solicitados', to='api.utilisateur')),
                ('validado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='formulários_validados', to='api.utilisateur')),
            ],
            options={
                'verbose_name': 'Formulário do Pedido',
                'verbose_name_plural': 'Formulários dos Pedidos',
            },
        ),
        migrations.RunPython(seed_formularios, migrations.RunPython.noop),
    ]
