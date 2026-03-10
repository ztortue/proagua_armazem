# ============================================================================
# FICHIER 2: api/tasks.py - CORRECTION
# ============================================================================

from celery import shared_task  # ✅ CORRIGÉ
from api.models import generate_rapport_quotidien

@shared_task  # ✅ CORRIGÉ
def task_generate_daily_rapport_quotidien():
    generate_rapport_quotidien()