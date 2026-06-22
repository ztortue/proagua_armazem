'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
    materiel_code: string;
    materiel_description: string;
    entrepot_id?: number;
    entrepot_pilier?: string | null;
    quantite_demandee: number;
    quantite_approuvee?: number;
    quantite_entregue?: number;
  }>;
  formulario?: {
    tipo_fluxo?: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
    entrepot_origem?: number | null;
    entrepot_origem_nome?: string | null;
    entrepot_destino?: number | null;
    entrepot_destino_nome?: string | null;
  } | null;
};

type Entrepot = { id: number; nom: string };
type UtilisateurFinal = { id: number; entreprise?: string };
type PaginatedResponse<T> = { results: T[]; next?: string | null };

type CreateItem = {
  materiel_id: number;
  entrepot_id: number;
  quantite_demandee: number;
  code: string;
  description: string;
};

type OrigemMateriel = {
  id: number;
  code: string;
  description: string;
  stock: number;
};

function parseOrigemMeta(text?: string) {
  const src = text || '';
  const tipoMatch = src.match(/\[ORIGEM_TIPO:([A-Z_]+)\]/);
  const refMatch = src.match(/\[ORIGEM_REF:([^\]]+)\]/);
  return {
    tipo: tipoMatch?.[1] || null,
    referencia: refMatch?.[1] || null,
  };
}

function TransferenciasContent() {
  const searchParams = useSearchParams();
  const pilierParam = searchParams.get('pilier');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Pedido[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<UtilisateurFinal[]>([]);

  const [selectedEntrepotOrigemId, setSelectedEntrepotOrigemId] = useState('');
  const [selectedEntrepotDestinoId, setSelectedEntrepotDestinoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [demandeurReelId, setDemandeurReelId] = useState('');

  const [origemMateriais, setOrigemMateriais] = useState<OrigemMateriel[]>([]);
  const [loadingOrigemMateriais, setLoadingOrigemMateriais] = useState(false);
  const [selectedMaterielId, setSelectedMaterielId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [items, setItems] = useState<CreateItem[]>([]);
  const [searchMateriel, setSearchMateriel] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const fetchAllPedidos = async (): Promise<Pedido[]> => {
    const collected: Pedido[] = [];
    let nextPath: string | null = '/pedidos/?page=1';
    while (nextPath) {
      const res: { data: Pedido[] | PaginatedResponse<Pedido> } = await api.get(nextPath);
      const data = res.data;
      const batch: Pedido[] = Array.isArray(data) ? data : data.results || [];
      collected.push(...batch);
      if (Array.isArray(data) || !data.next) {
        nextPath = null;
      } else {
        const u = new URL(data.next);
        nextPath = u.pathname.replace(/^\/api/, '') + u.search;
      }
    }
    return collected;
  };

  const loadTransferencias = async () => {
    setLoading(true);
    try {
      const collected = await fetchAllPedidos();
      const transferencias = collected
        .filter((p) => p.formulario?.tipo_fluxo === 'TRANSFERENCIA')
        .sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
      setRows(transferencias);
    } catch (error) {
      console.error('Erro ao carregar transferencias:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransferencias();
  }, []);

  const loadCreateDependencies = async () => {
    try {
      const [entrepotsRes, demandeurRes] = await Promise.all([
        api.get('/entrepots/'),
        api.get('/utilisateurs-final/'),
      ]);
      setEntrepots(Array.isArray(entrepotsRes.data) ? entrepotsRes.data : entrepotsRes.data?.results || []);
      setUtilisateursFinal(Array.isArray(demandeurRes.data) ? demandeurRes.data : demandeurRes.data?.results || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const loadMateriaisOrigem = async (entrepotId: number) => {
    setLoadingOrigemMateriais(true);
    setOrigemMateriais([]);
    try {
      const allMaterials: any[] = [];
      let nextPath: string | null = '/materiais/';
      while (nextPath) {
        const res: any = await api.get(nextPath);
        const data = res.data;
        const batch: any[] = Array.isArray(data) ? data : data.results || [];
        allMaterials.push(...batch);
        if (Array.isArray(data) || !data.next) {
          nextPath = null;
        } else {
          const u = new URL(data.next);
          nextPath = u.pathname.replace(/^\/api/, '') + u.search;
        }
      }
      const result: OrigemMateriel[] = allMaterials
        .map((m: any) => {
          const loc = (m.stock_locations || []).find(
            (l: any) => Number(l.entrepot_id_value ?? l.entrepot_id) === entrepotId
          );
          const stock = loc ? Number(loc.quantite) : 0;
          return { id: m.id, code: m.code, description: m.description, stock };
        })
        .filter((m) => m.stock > 0)
        .sort((a, b) => a.code.localeCompare(b.code));
      setOrigemMateriais(result);
    } catch (error) {
      console.error('Erro ao carregar materiais do depósito de origem:', error);
      setOrigemMateriais([]);
    } finally {
      setLoadingOrigemMateriais(false);
    }
  };

  const openCreate = async () => {
    setCreateOpen(true);
    setCreateError(null);
    setSelectedEntrepotOrigemId('');
    setSelectedEntrepotDestinoId('');
    setObservacao('');
    setDemandeurReelId('');
    setSelectedMaterielId('');
    setQuantidade('');
    setItems([]);
    setOrigemMateriais([]);
    await loadCreateDependencies();
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length]);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const addItem = () => {
    setCreateError(null);
    if (!selectedMaterielId || !quantidade) {
      setCreateError('Selecione o material e a quantidade.');
      return;
    }
    const qty = Number(quantidade);
    if (!Number.isFinite(qty) || qty <= 0) {
      setCreateError('Quantidade inválida.');
      return;
    }
    const material = origemMateriais.find((m) => m.id === Number(selectedMaterielId));
    if (!material) {
      setCreateError('Material não encontrado no depósito de origem.');
      return;
    }
    if (items.some((i) => i.materiel_id === material.id)) {
      setCreateError('Material já adicionado.');
      return;
    }
    if (qty > material.stock) {
      setCreateError(`Quantidade excede o stock disponível (${material.stock}) para ${material.code}.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        materiel_id: material.id,
        entrepot_id: Number(selectedEntrepotOrigemId),
        quantite_demandee: qty,
        code: material.code,
        description: material.description,
      },
    ]);
    setSelectedMaterielId('');
    setQuantidade('');
    setSearchMateriel('');
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((x) => x.materiel_id !== id));

  const createTransferencia = async () => {
    setCreateError(null);
    if (!demandeurReelId) { setCreateError('Selecione o demandante real.'); return; }
    if (!selectedEntrepotOrigemId) { setCreateError('Selecione o depósito de origem.'); return; }
    if (!selectedEntrepotDestinoId) { setCreateError('Selecione o depósito de destino.'); return; }
    if (Number(selectedEntrepotOrigemId) === Number(selectedEntrepotDestinoId)) {
      setCreateError('Origem e destino não podem ser iguais.');
      return;
    }
    if (items.length === 0) { setCreateError('Adicione pelo menos um material.'); return; }

    setCreateLoading(true);
    try {
      const createRes = await api.post('/pedidos/', {
        description: observacao.trim() || undefined,
        demandeur_reel_id: Number(demandeurReelId),
        tipo_fluxo: 'TRANSFERENCIA',
        entrepot_destino_id: Number(selectedEntrepotDestinoId),
        items: items.map((it) => ({
          materiel_id: it.materiel_id,
          entrepot_id: Number(selectedEntrepotOrigemId),
          quantite_demandee: it.quantite_demandee,
        })),
      });
      const createdId = createRes.data?.id;
      if (createdId) {
        await api.post(`/pedidos/${createdId}/valider/`);
      }
      setCreateOpen(false);
      await loadTransferencias();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setCreateError(detail || JSON.stringify(data) || 'Erro ao criar transferência.');
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
    if (s === 'ENTREGUE' || s === 'RECEBIDA') return 'Transferência concluída';
    if (s === 'REFUSEE') return 'Recusada';
    return s || '-';
  };

  const refreshAndKeepSelection = async (pedidoId?: number) => {
    await loadTransferencias();
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
      }
      await refreshAndKeepSelection(selectedPedido.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao atualizar transferência.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const markEntradaFeita = async () => {
    if (!selectedPedido) return;
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      await api.post(`/pedidos/${selectedPedido.id}/livrer/`, {});
      await refreshAndKeepSelection(selectedPedido.id);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const data = err?.response?.data;
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao confirmar transferência.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-primary">Transferências</h1>
        <button className="btn btn-info" onClick={openCreate}>+ Nova Transferência</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3">
          <span className="loading loading-spinner loading-md" />
          <span>Carregando transferências...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500">Nenhuma transferência encontrada.</div>
      ) : (
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Referência</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Data</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <button className="font-semibold text-primary hover:underline" onClick={() => openDetail(p)}>
                          {p.reference || `#${p.id}`}
                        </button>
                      </td>
                      <td>{p.formulario?.entrepot_origem_nome || '-'}</td>
                      <td>{p.formulario?.entrepot_destino_nome || '-'}</td>
                      <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <span className={`badge ${
                          p.statut === 'RECEBIDA' || p.statut === 'ENTREGUE' ? 'badge-success' :
                          p.statut === 'REFUSEE' ? 'badge-error' :
                          p.statut === 'EN_ATTENTE' || p.statut === 'APPROUVEE' ? 'badge-warning' :
                          'badge-ghost'
                        }`}>
                          {statusLabel(p.statut)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-base-content/60">
                  {rows.length} transferência{rows.length !== 1 ? 's' : ''} · página {page} de {totalPages}
                </span>
                <div className="join">
                  <button className="join-item btn btn-sm" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1}>‹ Anterior</button>
                  <button className="join-item btn btn-sm btn-active pointer-events-none">{page}</button>
                  <button className="join-item btn btn-sm" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page >= totalPages}>Próxima ›</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailOpen && selectedPedido && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="text-2xl font-bold mb-4">Detalhes da Transferência</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-gray-500">Referência</div><div className="font-semibold">{selectedPedido.reference || `#${selectedPedido.id}`}</div></div>
              <div><div className="text-gray-500">Status</div><div className="font-semibold">{statusLabel(selectedPedido.statut)}</div></div>
              <div><div className="text-gray-500">Data</div><div className="font-semibold">{new Date(selectedPedido.date_demande).toLocaleDateString('pt-BR')}</div></div>
              <div><div className="text-gray-500">Depósito de origem</div><div className="font-semibold">{selectedPedido.formulario?.entrepot_origem_nome || '-'}</div></div>
              <div><div className="text-gray-500">Depósito de destino</div><div className="font-semibold">{selectedPedido.formulario?.entrepot_destino_nome || '-'}</div></div>
              {selectedPedido.description && (
                <div><div className="text-gray-500">Motivo</div><div className="font-semibold">{selectedPedido.description}</div></div>
              )}
            </div>

            <div className="mt-5">
              <div className="font-semibold mb-2">Materiais da transferência</div>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead><tr><th>Código</th><th>Descrição</th><th>Qtd</th></tr></thead>
                  <tbody>
                    {(selectedPedido.items || []).map((it) => (
                      <tr key={it.id}>
                        <td>{it.materiel_code}</td>
                        <td>{it.materiel_description}</td>
                        <td>{it.quantite_approuvee || it.quantite_demandee || 0}</td>
                      </tr>
                    ))}
                    {(!selectedPedido.items || selectedPedido.items.length === 0) && (
                      <tr><td colSpan={3} className="text-center text-gray-500">Nenhum item encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {workflowError && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{workflowError}</div>}

            <div className="modal-action">
              <Link href={`/dashboard/pedidos/${selectedPedido.id}/formulario`} className="btn btn-outline">Formulário</Link>
              {selectedPedido.statut === 'BROUILLON' && (
                <button className="btn btn-warning" onClick={markAsTraiter} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Marcar como pendente'}
                </button>
              )}
              {(selectedPedido.statut === 'EN_ATTENTE' || selectedPedido.statut === 'APPROUVEE') && (
                <button className="btn btn-success" onClick={markEntradaFeita} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Transferência feita'}
                </button>
              )}
              {(selectedPedido.statut === 'ENTREGUE' || selectedPedido.statut === 'RECEBIDA') && (
                <span className="badge badge-success badge-lg">Transferência concluída</span>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailOpen(false)} disabled={workflowLoading}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="mb-6 text-2xl font-bold">Nova Transferência</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label"><span className="label-text font-semibold">Depósito de origem</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedEntrepotOrigemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedEntrepotOrigemId(id);
                                    setSelectedEntrepotDestinoId('');
                    setItems([]);
                    setSelectedMaterielId('');
                    setQuantidade('');
                    setSearchMateriel('');
                    if (id) loadMateriaisOrigem(Number(id));
                    else setOrigemMateriais([]);
                  }}
                >
                  <option value="">Selecione o depósito de origem</option>
                  {entrepots.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-semibold">Depósito de destino</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedEntrepotDestinoId}
                  onChange={(e) => setSelectedEntrepotDestinoId(e.target.value)}
                  disabled={!selectedEntrepotOrigemId}
                >
                  <option value="">Selecione o depósito de destino</option>
                  {entrepots
                    .filter((e) => String(e.id) !== selectedEntrepotOrigemId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-semibold">Demandante real</span></label>
                <select className="select select-bordered w-full" value={demandeurReelId} onChange={(e) => setDemandeurReelId(e.target.value)}>
                  <option value="">Selecione</option>
                  {utilisateursFinal.map((u) => (
                    <option key={u.id} value={u.id}>{u.entreprise || `#${u.id}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-semibold">Motivo / Observação</span></label>
                <input
                  className="input input-bordered w-full"
                  placeholder="Motivo da transferência (opcional)"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </div>

            {selectedEntrepotOrigemId && (
              <div className="mt-6 border rounded-xl p-4">
                <div className="font-semibold mb-3 flex items-center gap-2">
                  Materiais disponíveis no depósito
                  {loadingOrigemMateriais && <span className="loading loading-spinner loading-xs" />}
                </div>

                {!loadingOrigemMateriais && origemMateriais.length === 0 && (
                  <div className="text-sm text-gray-500 py-2">
                    Nenhum material com stock disponível neste depósito.
                  </div>
                )}

                {!loadingOrigemMateriais && origemMateriais.length > 0 && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Pesquisar por código ou descrição..."
                      value={searchMateriel}
                      onChange={(e) => {
                        setSearchMateriel(e.target.value);
                        setSelectedMaterielId('');
                      }}
                    />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <select
                        className="select select-bordered md:col-span-2"
                        value={selectedMaterielId}
                        onChange={(e) => setSelectedMaterielId(e.target.value)}
                        size={1}
                      >
                        <option value="">
                          {searchMateriel
                            ? `${origemMateriais.filter((m) => {
                                const term = searchMateriel.toLowerCase();
                                return (
                                  !items.some((i) => i.materiel_id === m.id) &&
                                  (m.code.toLowerCase().includes(term) || m.description.toLowerCase().includes(term))
                                );
                              }).length} resultado(s) — selecione`
                            : 'Selecione o material'}
                        </option>
                        {origemMateriais
                          .filter((m) => {
                            if (items.some((i) => i.materiel_id === m.id)) return false;
                            if (!searchMateriel) return true;
                            const term = searchMateriel.toLowerCase();
                            return m.code.toLowerCase().includes(term) || m.description.toLowerCase().includes(term);
                          })
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {`${m.code} — ${m.description} (Stock: ${m.stock})`}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        className="input input-bordered"
                        placeholder="Quantidade"
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                      />
                      <button className="btn btn-outline" type="button" onClick={addItem}>
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="table table-zebra table-sm">
                      <thead><tr><th>Código</th><th>Descrição</th><th>Qtd</th><th></th></tr></thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.materiel_id}>
                            <td className="font-mono font-semibold">{it.code}</td>
                            <td>{it.description}</td>
                            <td>{it.quantite_demandee}</td>
                            <td className="text-right">
                              <button className="btn btn-xs btn-error" onClick={() => removeItem(it.materiel_id)}>
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {createError && (
              <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{createError}</div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Cancelar
              </button>
              <button className="btn btn-info" onClick={createTransferencia} disabled={createLoading}>
                {createLoading ? 'Criando...' : 'Criar transferência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransferenciasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <TransferenciasContent />
    </Suspense>
  );
}
