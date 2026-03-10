from django.db import migrations


def normalize_demande_references(apps, schema_editor):
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

    valid_prefixes = set(fluxo_to_prefix.values())

    for demande in DemandeLot.objects.exclude(reference__isnull=True).exclude(reference='').only('id', 'reference'):
        ref = (demande.reference or '').strip().upper()
        parts = [p for p in ref.split('-') if p]
        if len(parts) < 4:
            continue

        # Legacy format: PED-XXX-AAA-0001-01
        if parts[0] == 'PED' and len(parts) >= 5:
            rest = parts[2:]
        else:
            rest = parts[1:]

        if len(rest) < 3:
            continue

        fluxo = formulario_by_demande.get(demande.id, '')
        target_prefix = fluxo_to_prefix.get(fluxo)
        if not target_prefix:
            current_prefix = parts[1] if parts[0] == 'PED' and len(parts) > 1 else parts[0]
            target_prefix = current_prefix if current_prefix in valid_prefixes else 'SAI'

        candidate = '-'.join([target_prefix] + rest)
        if candidate == ref:
            continue

        if not DemandeLot.objects.filter(reference=candidate).exclude(pk=demande.pk).exists():
            DemandeLot.objects.filter(pk=demande.pk).update(reference=candidate)
            continue

        # Resolve rare collisions by incrementing trailing 2-digit sequence.
        if rest[-1].isdigit() and len(rest[-1]) == 2:
            base = '-'.join([target_prefix] + rest[:-1])
            chosen = None
            for seq in range(1, 100):
                trial = f"{base}-{seq:02d}"
                if not DemandeLot.objects.filter(reference=trial).exclude(pk=demande.pk).exists():
                    chosen = trial
                    break
            if chosen:
                DemandeLot.objects.filter(pk=demande.pk).update(reference=chosen)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_update_demande_reference_prefixes'),
    ]

    operations = [
        migrations.RunPython(normalize_demande_references, migrations.RunPython.noop),
    ]

