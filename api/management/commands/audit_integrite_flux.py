from django.core.management.base import BaseCommand
from django.db.models import F, Q, Count

from api.models import DemandeLot, PedidoFormulario, DemandeItem, StockEntrepot


class Command(BaseCommand):
    help = "Audit rapid integrite flux (status, pendencias recebimento, stock negatif, coherence entrepots/projets)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== AUDIT INTEGRITE FLUX ==="))

        # 1) repartition status x fluxo
        self.stdout.write(self.style.HTTP_INFO("1) Repartition statuts par fluxo"))
        repartition = (
            PedidoFormulario.objects
            .values("tipo_fluxo", "demande_lot__statut")
            .annotate(total=Count("id"))
            .order_by("tipo_fluxo", "demande_lot__statut")
        )
        for row in repartition:
            self.stdout.write(
                f" - {row['tipo_fluxo']}: {row['demande_lot__statut']} => {row['total']}"
            )

        # 2) COMPRAS ENTREGUE mais deja complets (a fermer en RECEBIDA)
        self.stdout.write(self.style.HTTP_INFO("2) COMPRAS ENTREGUE avec 0 item pendente"))
        compras_entregue = (
            DemandeLot.objects
            .filter(formulario__tipo_fluxo="COMPRAS", statut="ENTREGUE")
            .distinct()
        )
        compras_to_close = 0
        for d in compras_entregue:
            has_pending = DemandeItem.objects.filter(lot=d).filter(
                Q(quantite_entregue__lt=F("quantite_approuvee")) |
                (Q(quantite_approuvee=0) & Q(quantite_entregue__lt=F("quantite_demandee")))
            ).exists()
            if not has_pending:
                compras_to_close += 1
                self.stdout.write(f" - #{d.id} {d.reference} (ENTREGUE sans pendencia)")
        self.stdout.write(f" -> total candidats fermeture: {compras_to_close}")

        # 3) ENTRADA en statut inattendu
        self.stdout.write(self.style.HTTP_INFO("3) ENTRADA hors RECEBIDA"))
        entradas_bad = DemandeLot.objects.filter(formulario__tipo_fluxo="ENTRADA").exclude(statut="RECEBIDA")
        if entradas_bad.exists():
            for d in entradas_bad.order_by("-id"):
                self.stdout.write(f" - #{d.id} {d.reference}: statut={d.statut}")
        else:
            self.stdout.write(" - OK (toutes les ENTRADA sont RECEBIDA)")

        # 4) stock negatif
        self.stdout.write(self.style.HTTP_INFO("4) Stocks negatifs"))
        neg_stocks = StockEntrepot.objects.filter(quantite__lt=0).select_related("materiel", "entrepot")
        if neg_stocks.exists():
            for s in neg_stocks:
                self.stdout.write(
                    f" - materiel={s.materiel.code} entrepot={s.entrepot.nom} quantite={s.quantite}"
                )
        else:
            self.stdout.write(" - OK (aucun stock negatif)")

        # 5) entrepots sans projet (controle visibilite pilier)
        self.stdout.write(self.style.HTTP_INFO("5) Entrepots sans projet associe"))
        no_project = PedidoFormulario.objects.filter(
            Q(entrepot_origem__isnull=False, entrepot_origem__projet__isnull=True) |
            Q(entrepot_destino__isnull=False, entrepot_destino__projet__isnull=True)
        ).count()
        self.stdout.write(f" - formulaires impactes: {no_project}")

        self.stdout.write(self.style.SUCCESS("=== AUDIT TERMINE ==="))

