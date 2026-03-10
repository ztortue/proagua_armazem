'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

type Pedido = {
  id: number;
  reference?: string;
  statut: string;
  date_demande: string;
  description?: string;
  items: Array<{
    id: number;
    materiel_id?: number;
    entrepot_id?: number;
    materiel_code: string;
    materiel_description: string;
    quantite_demandee: number;
    quantite_approuvee?: number;
    quantite_entregue?: number;
  }>;
  formulario?: {
    tipo_fluxo?: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
    entrepot_origem_id?: number | null;
    entrepot_origem_nome?: string | null;
    entrepot_destino_id?: number | null;
    entrepot_destino_nome?: string | null;
  } | null;
};

type Materiel = { id: number; code: string; description: string };
type Entrepot = { id: number; nom: string };
type UtilisateurFinal = { id: number; nom?: string; prenom?: string; entreprise?: string };

type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

type CreateItem = {
  materiel_id: number;
  entrepot_id: number;
  quantite_demandee: number;
  code: string;
  description: string;
};

type OrigemTipo = 'SAIDA' | 'TRANSFERENCIA' | 'EMPRESTIMO' | 'COMPRAS';
type FluxoTipo = 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';

const origemLabel: Record<OrigemTipo, string> = {
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  EMPRESTIMO: 'Empréstimo',
  COMPRAS: 'Compras',
};

function getExpectedReturnEntrepotId(pedido: Pedido | null, origemTipo: OrigemTipo): number | null {
  if (!pedido) return null;
  if (origemTipo === 'COMPRAS') {
    return typeof pedido.formulario?.entrepot_destino_id === 'number' ? pedido.formulario.entrepot_destino_id : null;
  }
  if (origemTipo === 'TRANSFERENCIA') {
    return typeof pedido.formulario?.entrepot_origem_id === 'number' ? pedido.formulario.entrepot_origem_id : null;
  }
  const firstItem = (pedido.items || [])[0] as any;
  const fromItem = typeof firstItem?.entrepot_id === 'number' ? firstItem.entrepot_id : null;
  return fromItem;
}

function parseOrigemMeta(text?: string) {
  const src = text || '';
  const tipoMatch = src.match(/\[ORIGEM_TIPO:([A-Z_]+)\]/);
  const refMatch = src.match(/\[ORIGEM_REF:([^\]]+)\]/);
  return {
    tipo: tipoMatch?.[1] || '-',
    referencia: refMatch?.[1] || '-',
  };
}

function getFormularioHref(pedido: Pedido): string {
  const fluxo = (pedido.formulario?.tipo_fluxo || '').toUpperCase();
  if (fluxo === 'COMPRAS' || fluxo === 'ENTRADA') {
    return `/dashboard/pedidos/${pedido.id}/recebimento`;
  }
  if (fluxo === 'DEVOLUCAO') {
    const origem = parseOrigemMeta(pedido.description).tipo.toUpperCase();
    if (['SAIDA', 'TRANSFERENCIA', 'EMPRESTIMO'].includes(origem)) {
      return `/dashboard/pedidos/${pedido.id}/recebimento`;
    }
  }
  return `/dashboard/pedidos/${pedido.id}/formulario`;
}

export default function DevolucoesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Pedido[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<UtilisateurFinal[]>([]);

  const [origemTipo, setOrigemTipo] = useState<OrigemTipo>('SAIDA');
  const [selectedOrigemPedidoId, setSelectedOrigemPedidoId] = useState('');
  const [origemReferencia, setOrigemReferencia] = useState('');
  const [observacao, setObservacao] = useState('');
  const [demandeurReelId, setDemandeurReelId] = useState('');

  const [selectedMaterielId, setSelectedMaterielId] = useState('');
  const [selectedEntrepotId, setSelectedEntrepotId] = useState('');
  const [canOverrideReturnEntrepot, setCanOverrideReturnEntrepot] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [items, setItems] = useState<CreateItem[]>([]);
  const [origemPedidos, setOrigemPedidos] = useState<Pedido[]>([]);
  const [depsLoaded, setDepsLoaded] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const fetchAllPedidos = async (): Promise<Pedido[]> => {
    const collected: Pedido[] = [];
    let nextPath: string | null = '/pedidos/?page=1';
    while (nextPath) {
      const res: { data: Pedido[] | PaginatedResponse<Pedido> } = await api.get(nextPath);
      const data: Pedido[] | PaginatedResponse<Pedido> = res.data;
      const batch: Pedido[] = Array.isArray(data) ? data : data.results || [];
      collected.push(...batch);
      nextPath = Array.isArray(data) ? null : data.next || null;
    }
    return collected;
  };

  const loadDevolucoes = async () => {
    setLoading(true);
    try {
      const collected = await fetchAllPedidos();
      const devolucoes = collected
        .filter((p) => p.formulario?.tipo_fluxo === 'DEVOLUCAO')
        .sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
      setRows(devolucoes);
    } catch (error) {
      console.error('Erro ao carregar devolucoes:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevolucoes();
  }, []);

  const loadCreateDependencies = async (force = false) => {
    if (depsLoaded && !force) return;
    try {
      const [entrepotsRes, demandeurRes, allPedidos, meRes] = await Promise.all([
        api.get('/entrepots/'),
        api.get('/utilisateurs-final/'),
        fetchAllPedidos(),
        api.get('/me/'),
      ]);
      setEntrepots(entrepotsRes.data?.results || entrepotsRes.data || []);
      setUtilisateursFinal(demandeurRes.data?.results || demandeurRes.data || []);
      setOrigemPedidos(allPedidos);
      const meRole = String(meRes.data?.role || '').toUpperCase();
      const mePilier = String(meRes.data?.pilier_affectation || '').toUpperCase();
      setCanOverrideReturnEntrepot(meRole === 'ADMIN' || mePilier === 'TODOS');
      setDepsLoaded(true);
    } catch (error) {
      console.error('Erro ao carregar dados do modal de devoluções:', error);
    }
  };

  const openCreate = async () => {
    setCreateOpen(true);
    setCreateError(null);
    setOrigemTipo('SAIDA');
    setSelectedOrigemPedidoId('');
    setOrigemReferencia('');
    setObservacao('');
    setDemandeurReelId('');
    setSelectedMaterielId('');
    setSelectedEntrepotId('');
    setQuantidade('');
    setItems([]);
      await loadCreateDependencies(true);
  };

  const origemFluxoByTipo: Record<OrigemTipo, FluxoTipo> = {
    SAIDA: 'INSTALACAO',
    TRANSFERENCIA: 'TRANSFERENCIA',
    EMPRESTIMO: 'EMPRESTIMO',
    COMPRAS: 'COMPRAS',
  };

  const origemOptions = useMemo(() => {
    const targetFlux = origemFluxoByTipo[origemTipo];
    const fluxAliases =
      origemTipo === 'SAIDA'
        ? new Set<FluxoTipo | 'SAIDA'>(['INSTALACAO', 'SAIDA'])
        : new Set<FluxoTipo | 'SAIDA'>([targetFlux]);

    return origemPedidos
      .filter(
        (p) =>
          fluxAliases.has((p.formulario?.tipo_fluxo as FluxoTipo | 'SAIDA' | undefined) || 'INSTALACAO') &&
          Boolean(p.reference) &&
          (p.statut === 'ENTREGUE' || p.statut === 'RECEBIDA')
      )
      .sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
  }, [origemPedidos, origemTipo]);

  const selectedOrigemPedido = useMemo(
    () => origemOptions.find((p) => String(p.id) === selectedOrigemPedidoId) || null,
    [origemOptions, selectedOrigemPedidoId]
  );

  const origemMateriais = useMemo(() => {
    const originItems = selectedOrigemPedido?.items || [];
    if (!originItems.length) return [] as Array<Materiel & { origem_qtd: number }>;
    return originItems
      .map((it) => {
        const materielId = Number((it as any).materiel_id);
        if (!Number.isFinite(materielId) || materielId <= 0) return null;
        const base = it.quantite_entregue || it.quantite_approuvee || it.quantite_demandee || 0;
        return {
          id: materielId,
          code: it.materiel_code,
          description: it.materiel_description,
          origem_qtd: base,
        };
      })
      .filter((x): x is Materiel & { origem_qtd: number } => Boolean(x && x.origem_qtd > 0));
  }, [selectedOrigemPedido]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length]);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const addItem = () => {
    setCreateError(null);
    if (!selectedMaterielId || !selectedEntrepotId || !quantidade) {
      setCreateError('Selecione material, deposito e quantidade.');
      return;
    }
    const qty = Number(quantidade);
    if (!Number.isFinite(qty) || qty <= 0) {
      setCreateError('Quantidade inválida.');
      return;
    }
    const material = origemMateriais.find((m) => m.id === Number(selectedMaterielId));
    if (!material) {
      setCreateError('Selecione um material da operação de origem.');
      return;
    }
    if (items.some((i) => i.materiel_id === material.id)) {
      setCreateError('Material já adicionado na devolução.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        materiel_id: material.id,
        entrepot_id: Number(selectedEntrepotId),
        quantite_demandee: qty,
        code: material.code,
        description: material.description,
      },
    ]);
    setSelectedMaterielId('');
    setQuantidade('');
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((x) => x.materiel_id !== id));

  const createDevolucao = async () => {
    setCreateError(null);
    if (!demandeurReelId) {
      setCreateError('Selecione o demandante real.');
      return;
    }
    if (!selectedOrigemPedidoId || !origemReferencia.trim()) {
      setCreateError('Informe a referencia de origem.');
      return;
    }
    if (!selectedEntrepotId) {
      setCreateError('Selecione o deposito de retorno.');
      return;
    }
    if (items.length === 0) {
      setCreateError('Adicione pelo menos um material.');
      return;
    }

    setCreateLoading(true);
    try {
      const description = `[ORIGEM_TIPO:${origemTipo}] [ORIGEM_PEDIDO_ID:${selectedOrigemPedidoId}] [ORIGEM_REF:${origemReferencia.trim()}] ${observacao}`.trim();
      await api.post('/pedidos/', {
        description,
        demandeur_reel_id: Number(demandeurReelId),
        tipo_fluxo: 'DEVOLUCAO',
        items: items.map((it) => ({
          materiel_id: it.materiel_id,
          entrepot_id: Number(selectedEntrepotId),
          quantite_demandee: it.quantite_demandee,
        })),
      });
      setCreateOpen(false);
      await loadDevolucoes();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setCreateError(detail || JSON.stringify(data) || 'Erro ao criar devolução.');
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetail = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setWorkflowError(null);
    setDetailOpen(true);
  };

  const statusLabel = (s: string) => {
    if (s === 'BROUILLON') return 'Rascunho';
    if (s === 'EN_ATTENTE' || s === 'APPROUVEE') return 'A tratar';
    if (s === 'ENTREGUE' || s === 'RECEBIDA') return 'Retorno feito';
    if (s === 'REFUSEE') return 'Recusada';
    return s || '-';
  };

  const refreshAndKeepSelection = async (pedidoId?: number) => {
    await loadDevolucoes();
    if (!pedidoId) return;
    const all = await fetchAllPedidos();
    const next = all.find((p) => p.id === pedidoId) || null;
    setSelectedPedido(next);
  };

  const markAsTraiter = async () => {
    if (!selectedPedido) return;
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      if (selectedPedido.statut === 'BROUILLON') {
        await api.post(`/pedidos/${selectedPedido.id}/valider/`);
        await api.post(`/pedidos/${selectedPedido.id}/approuver/`);
      } else if (selectedPedido.statut === 'EN_ATTENTE') {
        await api.post(`/pedidos/${selectedPedido.id}/approuver/`);
      }
      await refreshAndKeepSelection(selectedPedido.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao atualizar devolução.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const markRetornoFeito = async () => {
    if (!selectedPedido) return;
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      await api.post(`/pedidos/${selectedPedido.id}/livrer/`, {});
      await refreshAndKeepSelection(selectedPedido.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao confirmar retorno.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex itemscenter justify-between">
        <h1 className="text-4xl font-bold text-primary">Devoluções</h1>
        <button className="btn btn-warning" onClick={openCreate}>Nova Devolução</button>
      </div>

      {loading ? (
        <div className="flex itemscenter gap-3">
          <span className="loading loading-spinner loading-md" />
          <span>Carregando operações...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500">Nenhuma operação de devolução encontrada.</div>
      ) : (
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Tipo Origem</th>
                    <th>Ref. Origem</th>
                    <th>Data</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((p) => {
                    const origem = parseOrigemMeta(p.description);
                    return (
                      <tr key={p.id}>
                        <td>
                          <button
                            className="font-semibold text-primary hover:underline"
                            onClick={() => openDetail(p)}
                          >
                            {p.reference || `#${p.id}`}
                          </button>
                        </td>
                        <td>{origem.tipo}</td>
                        <td>{origem.referencia}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p.statut)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex itemscenter justify-end gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1}>
                Anterior
              </button>
              <span className="text-sm text-gray-600">{`Página ${page} / ${totalPages}`}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page >= totalPages}>
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && selectedPedido && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="text-2xl font-bold mb-4">Detalhes da Devolução</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Referência</div>
                <div className="font-semibold">{selectedPedido.reference || `#${selectedPedido.id}`}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-semibold">{statusLabel(selectedPedido.statut)}</div>
              </div>
              <div>
                <div className="text-gray-500">Data</div>
                <div className="font-semibold">{new Date(selectedPedido.date_demande).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Tipo origem</div>
                <div className="font-semibold">{parseOrigemMeta(selectedPedido.description).tipo}</div>
              </div>
              <div>
                <div className="text-gray-500">Referência origem</div>
                <div className="font-semibold">{parseOrigemMeta(selectedPedido.description).referencia}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="font-semibold mb-2">Materiais da devolução</div>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Descricao</th>
                      <th>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPedido.items || []).map((it) => (
                      <tr key={it.id}>
                        <td>{it.materiel_code}</td>
                        <td>{it.materiel_description}</td>
                        <td>{it.quantite_approuvee || it.quantite_demandee || 0}</td>
                      </tr>
                    ))}
                    {(!selectedPedido.items || selectedPedido.items.length === 0) && (
                      <tr>
                        <td colSpan={3} className="text-center text-gray-500">Nenhum item encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {workflowError && (
              <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{workflowError}</div>
            )}

            <div className="modal-action">
              <Link href={getFormularioHref(selectedPedido)} className="btn btn-outline">
                Formulario
              </Link>
              {selectedPedido.statut === 'BROUILLON' && (
                <button className="btn btn-warning" onClick={markAsTraiter} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Marcar como pendente'}
                </button>
              )}
              {(selectedPedido.statut === 'EN_ATTENTE' || selectedPedido.statut === 'APPROUVEE') && (
                <button className="btn btn-success" onClick={markRetornoFeito} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Retorno feito'}
                </button>
              )}
              {(selectedPedido.statut === 'ENTREGUE' || selectedPedido.statut === 'RECEBIDA') && (
                <span className="badge badge-success">Retorno concluido</span>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailOpen(false)} disabled={workflowLoading}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="mb-4 text-2xl font-bold">Nova Devolução</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label"><span className="label-text">Tipo de origem</span></label>
                <select
                  className="select select-bordered w-full"
                  value={origemTipo}
                  onChange={(e) => {
                    setOrigemTipo(e.target.value as OrigemTipo);
                    setSelectedOrigemPedidoId('');
                    setOrigemReferencia('');
                    setSelectedEntrepotId('');
                    setItems([]);
                    setSelectedMaterielId('');
                  }}
                >
                  <option value="SAIDA">{origemLabel.SAIDA}</option>
                  <option value="TRANSFERENCIA">{origemLabel.TRANSFERENCIA}</option>
                  <option value="EMPRESTIMO">{origemLabel.EMPRESTIMO}</option>
                  <option value="COMPRAS">{origemLabel.COMPRAS}</option>
                </select>
                {(() => {
                  const expectedId = getExpectedReturnEntrepotId(selectedOrigemPedido, origemTipo);
                  if (!expectedId) return null;
                  const expected = entrepots.find((d) => Number(d.id) === Number(expectedId));
                  if (!canOverrideReturnEntrepot) {
                    return (
                      <div className="mt-1 text-xs text-gray-500">Deposito de retorno fixado pela operação de origem: {expected?.nom || `#${expectedId}`}</div>
                    );
                  }
                  return (
                    <div className="mt-1 text-xs text-amber-700">Voce pode redirecionar o retorno (ADMIN/TODOS). Origem sugerida: {expected?.nom || `#${expectedId}`}</div>
                  );
                })()}
              </div>
              <div>
                <label className="label"><span className="label-text">Referência de origem</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedOrigemPedidoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedOrigemPedidoId(id);
                    const pedido = origemOptions.find((p) => String(p.id) === id) || null;
                    setOrigemReferencia(pedido?.reference || '');
                    const expectedEntrepotId = getExpectedReturnEntrepotId(pedido, origemTipo);
                    setSelectedEntrepotId(expectedEntrepotId ? String(expectedEntrepotId) : '');
                    setItems([]);
                    setSelectedMaterielId('');
                  }}
                >
                  <option value="">Selecione a operação de origem</option>
                  {origemOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.reference} | ${new Date(p.date_demande).toLocaleDateString('pt-BR')} | ${p.statut}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Demandante real</span></label>
                <select className="select select-bordered w-full" value={demandeurReelId} onChange={(e) => setDemandeurReelId(e.target.value)}>
                  <option value="">Selecione</option>
                  {utilisateursFinal.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.prenom, u.nom].filter(Boolean).join(' ') || u.entreprise || `#${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Depósito de retorno</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedEntrepotId}
                  onChange={(e) => setSelectedEntrepotId(e.target.value)}
                  disabled={!canOverrideReturnEntrepot && Boolean(getExpectedReturnEntrepotId(selectedOrigemPedido, origemTipo))}
                >
                  <option value="">Selecione</option>
                  {entrepots.map((d) => (
                    <option key={d.id} value={d.id}>{d.nom}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Observação</span></label>
                <textarea className="textarea textarea-bordered w-full" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 rounded border p-4">
              <h4 className="mb-3 font-semibold">Adicionar material</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <select className="select select-bordered" value={selectedMaterielId} onChange={(e) => setSelectedMaterielId(e.target.value)}>
                  <option value="">{selectedOrigemPedidoId ? 'Material da operação origem' : 'Selecione primeiro a operação origem'}</option>
                  {origemMateriais.map((m) => (
                    <option key={m.id} value={m.id}>{`${m.code} - ${m.description} (origem: ${m.origem_qtd})`}</option>
                  ))}
                </select>
                <input type="number" min={1} className="input input-bordered" placeholder="Quantidade" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                <button className="btn btn-outline" onClick={addItem}>Adicionar item</button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Codigo</th>
                      <th>Descricao</th>
                      <th>Qtd</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.materiel_id}>
                        <td>{it.code}</td>
                        <td>{it.description}</td>
                        <td>{it.quantite_demandee}</td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-xs" onClick={() => removeItem(it.materiel_id)}>Remover</button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-gray-500">Nenhum item adicionado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {createError && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{createError}</div>}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancelar</button>
              <button className="btn btn-warning" onClick={createDevolucao} disabled={createLoading}>
                {createLoading ? 'Gravando...' : 'Criar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
