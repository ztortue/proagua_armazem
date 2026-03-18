'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './lib/api';

type Me = {
  id: number;
  username: string;
  role: string;
  pilier_affectation?: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
};

type Entrepot = {
  id: number;
  nom: string;
  responsable?: string | null;
  projet?: string | number | null;
  projet_pilier?: 'PILAR1' | 'PILAR2' | 'PILAR3' | null;
};

type Projet = {
  id: number;
  nom: string;
  pilier: 'PILAR1' | 'PILAR2' | 'PILAR3';
  responsable?: number | null;
};

type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  pilier_affectation?: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
};

type RecebimentoPendenteSummary = {
  total_pedidos_pendentes: number;
  total_items_pendentes: number;
  total_quantite_pendente: number;
  pedidos: Array<{
    id: number;
    reference?: string;
    pending_count: number;
    quantite_pendente: number;
  }>;
};

type NotificationItem = {
  id: number;
  message: string;
  date: string;
  lu: boolean;
  type: string;
};

type WeeklyMovimento = {
  id: number;
  pilier?: 'PILAR1' | 'PILAR2' | 'PILAR3' | null;
  materiel_code?: string | null;
};

type MaterialDetail = {
  id: number;
  code: string;
  description: string;
  unite?: string;
  stock_actuel?: number;
};

type MaterialOperation = {
  id: number;
  reference?: string | null;
  date_mvt?: string;
  type_mvt?: string;
  quantite?: number;
  entrepot?: string | null;
  raison?: string;
};

type StockReportRow = {
  stock_id: number;
  quantite: number;
  stock_min: number;
};

type MovimentoReportRow = {
  id: number;
};

type OperacaoReportRow = {
  id: number;
  items_pendentes: number;
};

const PILAR_CONFIG = [
  {
    code: 'PILAR1' as const,
    title: 'PILAR 1',
    description: 'Rede principal com armazem operativo.',
    expectedWarehouse: 'kifangondo',
  },
  {
    code: 'PILAR2' as const,
    title: 'PILAR 2',
    description: 'Rede secundaria com armazem operativo.',
    expectedWarehouse: 'marcal',
  },
  {
    code: 'PILAR3' as const,
    title: 'PILAR 3',
    description: 'Ainda sem armazem definido.',
    expectedWarehouse: '',
  },
];

export default function DashboardContent() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recebimentoSummary, setRecebimentoSummary] = useState<RecebimentoPendenteSummary | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<NotificationItem[]>([]);
  const [stockReport, setStockReport] = useState<StockReportRow[]>([]);
  const [movReport, setMovReport] = useState<MovimentoReportRow[]>([]);
  const [opReport, setOpReport] = useState<OperacaoReportRow[]>([]);
  const [weeklyMovements, setWeeklyMovements] = useState<WeeklyMovimento[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string | null>(null);
  const [selectedMaterialPilier, setSelectedMaterialPilier] = useState<'PILAR1' | 'PILAR2' | 'PILAR3' | null>(null);
  const [materialDetail, setMaterialDetail] = useState<MaterialDetail | null>(null);
  const [materialOps, setMaterialOps] = useState<MaterialOperation[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await api.get('/me/');
        setMe(meRes.data);

        const baseCalls = await Promise.allSettled([
          api.get('/entrepots/'),
          api.get('/users/'),
          api.get('/projets/'),
          api.get('/pedidos/recebimento-pendente-summary/'),
          api.get('/notifications/?unread=1&type=RECEBIMENTO_PENDENTE'),
        ]);

        const entrepotsData = baseCalls[0].status === 'fulfilled' ? baseCalls[0].value.data : [];
        const usersData = baseCalls[1].status === 'fulfilled' ? baseCalls[1].value.data : [];
        const projetsData = baseCalls[2].status === 'fulfilled' ? baseCalls[2].value.data : [];
        const recebimentoData = baseCalls[3].status === 'fulfilled' ? baseCalls[3].value.data : null;
        const notifData = baseCalls[4].status === 'fulfilled' ? baseCalls[4].value.data : [];

        setEntrepots(Array.isArray(entrepotsData) ? entrepotsData : entrepotsData?.results || []);
        setUsers(Array.isArray(usersData) ? usersData : usersData?.results || []);
        setProjets(Array.isArray(projetsData) ? projetsData : projetsData?.results || []);
        setRecebimentoSummary(recebimentoData || null);
        setPendingNotifications(Array.isArray(notifData) ? notifData : notifData?.results || []);

        // Relatorios summary cards on dashboard (non-blocking).
        const reportCalls = await Promise.allSettled([
          api.get('/relatorios/stock/'),
          api.get('/relatorios/movimentos/'),
          api.get('/relatorios/operacoes/'),
        ]);
        const stockData = reportCalls[0].status === 'fulfilled' && Array.isArray(reportCalls[0].value.data)
          ? reportCalls[0].value.data
          : [];
        const movData = reportCalls[1].status === 'fulfilled' && Array.isArray(reportCalls[1].value.data)
          ? reportCalls[1].value.data
          : [];
        const opData = reportCalls[2].status === 'fulfilled' && Array.isArray(reportCalls[2].value.data)
          ? reportCalls[2].value.data
          : [];
        setStockReport(stockData);
        setMovReport(movData);
        setOpReport(opData);

        // Weekly per-pilier metrics for mini chart cards.
        const now = new Date();
        const jsDay = now.getDay(); // 0..6 (Sun..Sat)
        const mondayOffset = (jsDay + 6) % 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - mondayOffset);
        const isoDate = (d: Date) => d.toISOString().slice(0, 10);
        const weekRes = await api.get('/relatorios/movimentos/', {
          params: { date_from: isoDate(monday), date_to: isoDate(now) },
        });
        setWeeklyMovements(Array.isArray(weekRes.data) ? weekRes.data : []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao carregar dashboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/', { type: 'RECEBIMENTO_PENDENTE' });
      setPendingNotifications([]);
    } catch (err) {
      console.error('Erro ao marcar notificacoes como lidas:', err);
    }
  };

  const visiblePilars = useMemo(() => {
    if (!me) return [];
    if (me.role === 'ADMIN' || me.pilier_affectation === 'TODOS') {
      return PILAR_CONFIG;
    }
    return PILAR_CONFIG.filter((p) => p.code === me.pilier_affectation);
  }, [me]);

  const normalizeText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const findWarehouse = (keyword: string) =>
    entrepots.find((e) => normalizeText(e.nom).includes(normalizeText(keyword)));

  const getUserName = (userId?: number | null) => {
    if (!userId) return '-';
    const u = users.find((x) => x.id === userId);
    if (!u) return '-';
    return `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
  };

  const lowStock = useMemo(
    () => stockReport.filter((s) => Number(s.quantite || 0) < Number(s.stock_min || 0)).length,
    [stockReport]
  );
  const pendingOps = useMemo(
    () => opReport.filter((o) => Number(o.items_pendentes || 0) > 0).length,
    [opReport]
  );

  const entrepotPilierMap = useMemo(() => {
    const map = new Map<number, 'PILAR1' | 'PILAR2' | 'PILAR3'>();
    projets.forEach((p) => {
      if (p?.id && p?.pilier) map.set(Number(p.id), p.pilier);
    });
    return map;
  }, [projets]);

  const weeklyByPilier = useMemo(() => {
    const result: Record<string, { warehouses: number; operationsWeek: number; topMaterial: string }> = {};
    const opCountByPilier: Record<string, number> = {};
    const matFreqByPilier: Record<string, Record<string, number>> = {};

    visiblePilars.forEach((p) => {
      result[p.code] = { warehouses: 0, operationsWeek: 0, topMaterial: '-' };
      opCountByPilier[p.code] = 0;
      matFreqByPilier[p.code] = {};
    });

    entrepots.forEach((e) => {
      const pilier =
        e.projet_pilier ||
        entrepotPilierMap.get(Number(e.projet || 0)) ||
        projets.find((p) => p.nom === String(e.projet || ''))?.pilier;
      if (pilier && result[pilier]) {
        result[pilier].warehouses += 1;
      }
    });

    weeklyMovements.forEach((m) => {
      const pilier = m.pilier || '';
      if (!result[pilier]) return;
      opCountByPilier[pilier] += 1;
      const code = m.materiel_code || '';
      if (code) {
        matFreqByPilier[pilier][code] = (matFreqByPilier[pilier][code] || 0) + 1;
      }
    });

    Object.keys(result).forEach((pilier) => {
      result[pilier].operationsWeek = opCountByPilier[pilier] || 0;
      const topEntry = Object.entries(matFreqByPilier[pilier]).sort((a, b) => b[1] - a[1])[0];
      result[pilier].topMaterial = topEntry ? `${topEntry[0]} (${topEntry[1]})` : '-';
    });

    return result;
  }, [visiblePilars, entrepots, entrepotPilierMap, weeklyMovements]);

  const maxWeeklyOps = useMemo(() => {
    const values = Object.values(weeklyByPilier).map((v) => v.operationsWeek || 0);
    return Math.max(1, ...values);
  }, [weeklyByPilier]);

  const openMaterialDetails = async (code: string, pilierCode?: 'PILAR1' | 'PILAR2' | 'PILAR3') => {
    if (!code || code === '-') return;
    setSelectedMaterialCode(code);
    setSelectedMaterialPilier(pilierCode || null);
    setMaterialModalOpen(true);
    setMaterialLoading(true);
    setMaterialDetail(null);
    setMaterialOps([]);

    try {
      const [matRes, movRes] = await Promise.all([
        api.get('/materiais/', { params: { search: code } }),
        api.get('/relatorios/movimentos/', { params: { search: code } }),
      ]);

      const mats = Array.isArray(matRes.data) ? matRes.data : matRes.data?.results || [];
      const exact = mats.find((m: any) => String(m.code || '').toUpperCase() === code.toUpperCase()) || mats[0] || null;
      if (exact) {
        setMaterialDetail({
          id: exact.id,
          code: exact.code,
          description: exact.description,
          unite: exact.unite,
          stock_actuel: exact.stock_actuel,
        });
      }

      const moves = Array.isArray(movRes.data) ? movRes.data : movRes.data?.results || [];
      const filtered = moves
        .filter((mv: any) => String(mv?.materiel_code || '').toUpperCase() === code.toUpperCase())
        .filter((mv: any) => !pilierCode || String(mv?.pilier || '').toUpperCase() === pilierCode)
        .map((mv: any) => ({
          id: mv.id,
          reference: mv.reference,
          date_mvt: mv.date_mvt,
          type_mvt: mv.type_mvt,
          quantite: mv.quantite,
          entrepot: mv.entrepot_nom || null,
          raison: mv.raison || '',
        }));
      setMaterialOps(filtered);
    } catch (err) {
      console.error('Erro ao carregar detalhes do material:', err);
    } finally {
      setMaterialLoading(false);
    }
  };

  const openOperationFromReference = (reference?: string | null) => {
    if (!reference) return;
    const ref = String(reference).trim().toUpperCase();
    if (!ref) return;
    setMaterialModalOpen(false);

    const operationPrefixes = ['COM-', 'SAI-', 'TRA-', 'EMP-', 'ENT-', 'DEV-', 'RET-'];
    const isOperationRef = operationPrefixes.some((prefix) => ref.startsWith(prefix));

    if (isOperationRef) {
      router.push(`/dashboard/pedidos?ref=${encodeURIComponent(ref)}`);
      return;
    }

    // MOV/REC/PED refs are movement references.
    router.push(`/dashboard/movimentos?ref=${encodeURIComponent(ref)}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingNotifications.length > 0 && (
        <div className="alert alert-warning shadow-sm">
          <div className="flex flex-col md:flex-row md:itemscenter md:justify-between gap-3 w-full">
            <div>
              <div className="font-semibold">Notificações persistentes: recebimento pendente</div>
              <div className="text-sm">
                {pendingNotifications.length} notificação(ões) não lida(s).
              </div>
              {pendingNotifications.slice(0, 3).map((n) => (
                <div key={n.id} className="text-xs opacity-80 mt-1">
                  {n.message}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-warning" onClick={() => router.push('/dashboard/pedidos?focus=recebimento-pendente')}>
                Ver operações
              </button>
              <button className="btn btn-sm btn-outline" onClick={markNotificationsAsRead}>
                Marcar como lidas
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingNotifications.length === 0 && !!recebimentoSummary && recebimentoSummary.total_pedidos_pendentes > 0 && (
        <div className="alert alert-info shadow-sm">
          <div className="flex flex-col gap-1">
            <span>
              Não há notificações pendentes não lidas. Ainda existem {recebimentoSummary.total_pedidos_pendentes} operação(oes) com recebimento incompleto.
            </span>
            {recebimentoSummary.pedidos.length > 0 && (
              <span className="text-xs opacity-80">
                Codigos: {recebimentoSummary.pedidos.slice(0, 5).map((p) => p.reference || `#${p.id}`).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Linhas de stock</div>
          <div className="stat-value text-primary">{stockReport.length}</div>
          <div className="stat-desc">
            <button className="link link-primary text-xs" onClick={() => router.push('/dashboard/estoque?view=all')}>
              Ver stock total
            </button>
          </div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Stock baixo</div>
          <div className="stat-value text-warning">{lowStock}</div>
          <div className="stat-desc">
            <button className="link link-primary text-xs" onClick={() => router.push('/dashboard/estoque?view=baixo')}>
              Ver stock baixo
            </button>
          </div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Movimentos</div>
          <div className="stat-value text-secondary">{movReport.length}</div>
          <div className="stat-desc">
            <button className="link link-primary text-xs" onClick={() => router.push('/dashboard/movimentos')}>
              Ver movimentos
            </button>
          </div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Operações pendentes</div>
          <div className="stat-value text-info">{pendingOps}</div>
          <div className="stat-desc">
            <button className="link link-primary text-xs" onClick={() => router.push('/dashboard/pedidos')}>
              Ver operações
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visiblePilars.map((pilar) => {
          const warehouse = pilar.expectedWarehouse ? findWarehouse(pilar.expectedWarehouse) : null;
          const projectFromWarehouse = warehouse
            ? projets.find((p) => p.id === Number(warehouse.projet) || p.nom === String(warehouse.projet || ''))
            : null;
          const projectByPilier = projets.find((p) => p.pilier === pilar.code);
          const effectiveProject = projectFromWarehouse || projectByPilier || null;
          const managerName = getUserName(effectiveProject?.responsable ?? null);
          const metrics = weeklyByPilier[pilar.code] || { warehouses: 0, operationsWeek: 0, topMaterial: '-' };
          const barWidth = Math.max(8, Math.round((metrics.operationsWeek / maxWeeklyOps) * 100));

          return (
            <div key={pilar.code} className="card bg-base-100 shadow-md border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-primary justify-center">{pilar.title}</h2>
                <p className="text-sm opacity-80">{pilar.description}</p>
                <div className="text-sm mt-2">
                  <div>
                    <strong>Armazem:</strong> {warehouse?.nom || 'Sem armazem'}
                  </div>
                  <div>
                    <strong>Responsavel do armazem:</strong> {warehouse?.responsable || '-'}
                  </div>
                  <div>
                    <strong>Responsavel do pilar:</strong> {managerName}
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-base-300 p-3">
                  <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Semana atual</div>
                  <div className="text-sm"><strong>Qtd. de armazens:</strong> {metrics.warehouses}</div>
                  <div className="text-sm"><strong>Operações:</strong> {metrics.operationsWeek}</div>
                  <div className="text-sm">
                    <strong>Material mais frequente:</strong>{' '}
                    {metrics.topMaterial !== '-' ? (
                      <button
                        type="button"
                        className="link link-primary"
                        onClick={() => openMaterialDetails(String(metrics.topMaterial).split(' (')[0], pilar.code)}
                      >
                        {metrics.topMaterial}
                      </button>
                    ) : (
                      metrics.topMaterial
                    )}
                  </div>
                  <div className="mt-2 h-2 rounded bg-base-200">
                    <div className="h-2 rounded bg-primary" style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
                <div className="card-actions justify-end mt-3">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => router.push(`/dashboard/armazens?pilier=${pilar.code}`)}
                  >
                    Abrir pilar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {materialModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-xl text-primary mb-3">
              Detalhes do material {selectedMaterialCode ? `- ${selectedMaterialCode}` : ''}
            </h3>

            {materialLoading ? (
              <div className="py-6 text-center">Carregando...</div>
            ) : (
              <>
                <div className="rounded-lg border border-base-300 p-3 mb-4">
                  <div className="text-sm"><strong>Código:</strong> {materialDetail?.code || selectedMaterialCode || '-'}</div>
                  <div className="text-sm"><strong>Descrição:</strong> {materialDetail?.description || '-'}</div>
                  <div className="text-sm"><strong>Unidade:</strong> {materialDetail?.unite || '-'}</div>
                  <div className="text-sm"><strong>Stock atual:</strong> {materialDetail?.stock_actuel ?? '-'}</div>
                </div>

                <div className="text-sm font-semibold mb-2">
                  Operações/Movimentos onde este material aparece
                  {selectedMaterialPilier ? ` - ${selectedMaterialPilier}` : ''}
                </div>
                <div className="overflow-x-auto border rounded-lg max-h-80">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Referência</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Depósito</th>
                        <th>Qtd</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialOps.map((op) => (
                        <tr key={op.id}>
                          <td>
                            {op.reference ? (
                              <button
                                type="button"
                                className="link link-primary"
                                onClick={() => openOperationFromReference(op.reference)}
                              >
                                {op.reference}
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{op.date_mvt ? new Date(op.date_mvt).toLocaleString() : '-'}</td>
                          <td>{op.type_mvt || '-'}</td>
                          <td>{op.entrepot || '-'}</td>
                          <td>{op.quantite ?? '-'}</td>
                          <td>{op.raison || '-'}</td>
                        </tr>
                      ))}
                      {materialOps.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-base-content/70">
                            Sem operações encontradas para este material.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setMaterialModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
