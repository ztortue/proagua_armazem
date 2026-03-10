import re
from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import DemandeLot, Notification


class Command(BaseCommand):
    help = "Netwaye notifikasyon ansyen ki pa respekte nouvo reg metye yo."

    PEDIDO_PATTERN = re.compile(r"\[PEDIDO:(\d+)\]")
    TRACKED_TYPES = {
        "OPERACAO_PENDENTE",
        "ENTREGA_PENDENTE",
        "RECEBIMENTO_PENDENTE",
    }
    EXPECTED_STATUS_BY_TYPE = {
        "OPERACAO_PENDENTE": "EN_ATTENTE",
        "ENTREGA_PENDENTE": "APPROUVEE",
        "RECEBIMENTO_PENDENTE": "ENTREGUE",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplike efasman yo. San opsyon sa a, command nan ap fe dry-run.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        qs = (
            Notification.objects
            .select_related("user")
            .filter(type__in=self.TRACKED_TYPES)
            .order_by("-date", "-id")
        )

        demande_map = {
            d.id: d
            for d in DemandeLot.objects.only("id", "demandeur_id", "statut")
        }

        to_delete_ids = set()
        reasons = defaultdict(int)
        dedupe_seen = set()

        for notif in qs:
            match = self.PEDIDO_PATTERN.search(notif.message or "")
            if not match:
                to_delete_ids.add(notif.id)
                reasons["invalid_format"] += 1
                continue

            demande_id = int(match.group(1))
            demande = demande_map.get(demande_id)
            if not demande:
                to_delete_ids.add(notif.id)
                reasons["orphan_pedido"] += 1
                continue

            user = notif.user
            is_owner = user.id == demande.demandeur_id
            is_todos = (user.pilier_affectation or "").upper() == "TODOS"
            if not (is_owner or is_todos):
                to_delete_ids.add(notif.id)
                reasons["wrong_recipient"] += 1
                continue

            expected_status = self.EXPECTED_STATUS_BY_TYPE.get(notif.type)
            if expected_status and demande.statut != expected_status:
                to_delete_ids.add(notif.id)
                reasons["stale_status"] += 1
                continue

            dedupe_key = (notif.user_id, notif.type, notif.message.strip())
            if dedupe_key in dedupe_seen:
                to_delete_ids.add(notif.id)
                reasons["duplicate"] += 1
                continue
            dedupe_seen.add(dedupe_key)

        total_scanned = qs.count()
        total_to_delete = len(to_delete_ids)
        self.stdout.write(self.style.WARNING(
            f"[DRY-RUN={not apply_changes}] scanned={total_scanned} delete={total_to_delete}"
        ))
        for reason, count in sorted(reasons.items()):
            self.stdout.write(f" - {reason}: {count}")

        if not apply_changes:
            self.stdout.write("Dry-run fini. Re-lanse ak --apply pou efase yo.")
            return

        with transaction.atomic():
            deleted_count, _ = Notification.objects.filter(id__in=to_delete_ids).delete()
        self.stdout.write(self.style.SUCCESS(f"Netwayaj fini. rows deleted={deleted_count}"))
