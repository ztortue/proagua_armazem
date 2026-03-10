from django.db import migrations


def update_demande_reference_prefixes(apps, schema_editor):
    DemandeLot = apps.get_model('api', 'DemandeLot')
    PedidoFormulario = apps.get_model('api', 'PedidoFormulario')

    fluxo_to_prefix = {
        'INSTALACAO': 'SAI',
        'EMPRESTIMO': 'EMP',
        'COMPRAS': 'COM',
        'TRANSFERENCIA': 'TRA',
    }

    formulario_by_demande = {
        f.demande_lot_id: (f.tipo_fluxo or '').upper()
        for f in PedidoFormulario.objects.all().only('demande_lot_id', 'tipo_fluxo')
    }

    for demande in DemandeLot.objects.exclude(reference__isnull=True).exclude(reference='').only('id', 'reference'):
        fluxo = formulario_by_demande.get(demande.id, '')
        target_prefix = fluxo_to_prefix.get(fluxo)
        if not target_prefix:
            continue

        parts = (demande.reference or '').split('-')
        if len(parts) < 3 or parts[0] != 'PED':
            continue
        if parts[1] == target_prefix:
            continue

        parts[1] = target_prefix
        candidate = '-'.join(parts)

        if not DemandeLot.objects.filter(reference=candidate).exclude(pk=demande.pk).exists():
            DemandeLot.objects.filter(pk=demande.pk).update(reference=candidate)
            continue

        # Resolve rare collisions by incrementing trailing sequence.
        if len(parts) >= 5 and parts[-1].isdigit():
            base_without_seq = '-'.join(parts[:-1])
            chosen = None
            for seq in range(1, 100):
                trial = f"{base_without_seq}-{seq:02d}"
                if not DemandeLot.objects.filter(reference=trial).exclude(pk=demande.pk).exists():
                    chosen = trial
                    break
            if chosen:
                DemandeLot.objects.filter(pk=demande.pk).update(reference=chosen)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0036_alter_souscategorie_nom'),
    ]

    operations = [
        migrations.RunPython(update_demande_reference_prefixes, migrations.RunPython.noop),
    ]

