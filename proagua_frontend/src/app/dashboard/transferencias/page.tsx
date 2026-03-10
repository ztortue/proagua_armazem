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

function parseOrigemMeta(text?: string) {
  const src = text || '';
  const tipoMatch = src.match(/\[ORIGEM_TIPO:([A-Z_]+)\]/);
  const refMatch = src.match(/\[ORIGEM_REF:([^\]]+)\]/);
  return {
    tipo: tipoMatch?.[1] || '-',
    referencia: refMatch?.[1] || '-',
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

  // materiais retiré — origemMateriais construit directement depuis selectedOrigemPedido.items
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<UtilisateurFinal[]>([]);

  const [origemFluxoTipo, setOrigemFluxoTipo] = useState<'ENTRADA' | 'COMPRAS'>('ENTRADA');
  const [selectedOrigemPedidoId, setSelectedOrigemPedidoId] = useState('');
  const [origemReferencia, setOrigemReferencia] = useState('');
  const [observacao, setObservacao] = useState('');
  const [demandeurReelId, setDemandeurReelId] = useState('');

  const [selectedMaterielId, setSelectedMaterielId] = useState('');
  const [selectedEntrepotOrigemId, setSelectedEntrepotOrigemId] = useState('');
  const [selectedEntrepotDestinoId, setSelectedEntrepotDestinoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [items, setItems] = useState<CreateItem[]>([]);
  const [origemPedidos, setOrigemPedidos] = useState<Pedido[]>([]);
  const [stockByMaterialOrigem, setStockByMaterialOrigem] = useState<Map<number, number>>(new Map());

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


  const fetchStockByEntrepot = async (entrepotId: number): Promise<Map<number, number>> => {
    const map = new Map<number, number>();
    let nextPath: string | null = `/stock-entrepot/?mode=transfer&entrepot=${entrepotId}&page=1`;
    while (nextPath) {
      const res: { data: any[] | PaginatedResponse<any> } = await api.get(nextPath);
      const data: any[] | PaginatedResponse<any> = res.data;
      const rows: any[] = Array.isArray(data) ? data : data.results || [];
      rows.forEach((row: any) => {
        const materielId = Number(row.materiel_id_value || row.materiel_id || 0);
        if (!materielId) return;
        map.set(materielId, Number(row.quantite || 0));
      });
      nextPath = Array.isArray(data) ? null : data.next || null;
    }
    return map;
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
      const [entrepotsRes, demandeurRes, allPedidos] = await Promise.all([
        api.get('/entrepots/?mode=transfer'),
        api.get('/utilisateurs-final/'),
        fetchAllPedidos(),
      ]);
      setEntrepots(entrepotsRes.data?.results || entrepotsRes.data || []);
      setUtilisateursFinal(demandeurRes.data?.results || demandeurRes.data || []);
      setOrigemPedidos(allPedidos);
    } catch (error) {
      console.error('Erro ao carregar dados do modal de transferencia:', error);
    }
  };

  const openCreate = async () => {
    setCreateOpen(true);
    setCreateError(null);
    setOrigemFluxoTipo('ENTRADA');
    setSelectedOrigemPedidoId('');
    setOrigemReferencia('');
    setObservacao('');
    setDemandeurReelId('');
    setSelectedMaterielId('');
    setSelectedEntrepotOrigemId('');
    setSelectedEntrepotDestinoId('');
    setQuantidade('');
    setItems([]);
    await loadCreateDependencies();
  };

  const getPedidoPilier = (p: Pedido): string => {
    const itemPilier = (p.items || []).find((it) => it.entrepot_pilier)?.entrepot_pilier;
    return itemPilier || '';
  };

  const origemOptions = useMemo(() => {
    return origemPedidos
      .filter((p) => {
        if (!p.reference) return false;
        if (pilierParam && getPedidoPilier(p) !== pilierParam) return false;

        const fluxo = p.formulario?.tipo_fluxo;
        if (origemFluxoTipo === 'COMPRAS') {
          return fluxo === 'COMPRAS' && p.statut === 'RECEBIDA';
        }

        return fluxo === 'ENTRADA' && p.statut === 'RECEBIDA';
      })
      .sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());
  }, [origemPedidos, pilierParam, origemFluxoTipo]);

  const entrepotOptionsTransfer = useMemo(() => {
    const map = new Map<number, string>();
    // Base list from API
    entrepots.forEach((e) => {
      map.set(Number(e.id), e.nom);
    });
    // Ensure entrepots from transfer refs are visible even if API list is restricted by pilier
    origemOptions.forEach((p) => {
      const f = p.formulario;
      if (!f) return;
      if (typeof f.entrepot_origem === 'number' && f.entrepot_origem_nome) {
        map.set(Number(f.entrepot_origem), f.entrepot_origem_nome);
      }
      if (typeof f.entrepot_destino === 'number' && f.entrepot_destino_nome) {
        map.set(Number(f.entrepot_destino), f.entrepot_destino_nome);
      }
    });
    return Array.from(map.entries())
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [entrepots, origemOptions]);

  const selectedOrigemPedido = useMemo(
    () => origemOptions.find((p) => String(p.id) === selectedOrigemPedidoId) || null,
    [origemOptions, selectedOrigemPedidoId]
  );

  const origemMateriais = useMemo(() => {
    const originItems = selectedOrigemPedido?.items || [];
    if (!originItems.length) return [] as Array<{ id: number; code: string; description: string; origem_qtd: number; origem_base: number }>;
    return originItems
      .map((it) => {
        if (!it.materiel_id) return null;
        const base = it.quantite_entregue || it.quantite_approuvee || it.quantite_demandee || 0;
        const disponivel = stockByMaterialOrigem.has(it.materiel_id)
          ? Number(stockByMaterialOrigem.get(it.materiel_id) ?? 0)
          : Number(base);
        return {
          id: it.materiel_id,
          code: it.materiel_code,
          description: it.materiel_description,
          origem_qtd: disponivel,
          origem_base: base,
        };
      })
      .filter((x): x is { id: number; code: string; description: string; origem_qtd: number; origem_base: number } =>
        Boolean(x && x.origem_base > 0)
      );
  }, [selectedOrigemPedido, stockByMaterialOrigem]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length]);
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const addItem = () => {
    setCreateError(null);
    if (!selectedMaterielId || !selectedEntrepotOrigemId || !quantidade) {
      setCreateError('Selecione material, deposito e quantidade.');
      return;
    }
    const qty = Number(quantidade);
    if (!Number.isFinite(qty) || qty <= 0) {
      setCreateError('Quantidade inv?lida.');
      return;
    }
    const material = origemMateriais.find((m) => m.id === Number(selectedMaterielId));
    if (!material) {
      setCreateError('Selecione um material da transferencia de origem.');
      return;
    }
    if (items.some((i) => i.materiel_id === material.id)) {
      setCreateError('Material ja adicionado na entrada.');
      return;
    }
    if (qty > material.origem_qtd) {
      setCreateError(`Quantidade excede o estoque disponivel (${material.origem_qtd}) para ${material.code}.`);
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
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((x) => x.materiel_id !== id));

  const createTransferencia = async () => {
    setCreateError(null);
    if (!demandeurReelId) {
      setCreateError('Selecione o demandante real.');
      return;
    }
    if (!selectedOrigemPedidoId || !origemReferencia.trim()) {
      setCreateError('Informe a referencia da transferencia de origem.');
      return;
    }
    if (!selectedEntrepotOrigemId) {
      setCreateError('Deposito de origem da entrada não identificado.');
      return;
    }
    if (!selectedEntrepotDestinoId) {
      setCreateError('Selecione o deposito de destino da transferencia.');
      return;
    }
    if (Number(selectedEntrepotOrigemId) === Number(selectedEntrepotDestinoId)) {
      setCreateError('Origem e destino não podem ser iguais.');
      return;
    }
    if (items.length === 0) {
      setCreateError('Adicione pelo menos um material.');
      return;
    }

    setCreateLoading(true);
    try {
      const origemTipo = selectedOrigemPedido?.formulario?.tipo_fluxo || 'ENTRADA';
      const description = `[ORIGEM_TIPO:${origemTipo}] [ORIGEM_PEDIDO_ID:${selectedOrigemPedidoId}] [ORIGEM_REF:${origemReferencia.trim()}] ${observacao}`.trim();
      const createRes = await api.post('/pedidos/', {
        description,
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
      setCreateError(detail || JSON.stringify(data) || 'Erro ao criar transferencia.');
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
    if (s === 'ENTREGUE' || s === 'RECEBIDA') return 'Transferencia concluida';
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
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao atualizar transferencia.');
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
      setWorkflowError(detail || JSON.stringify(data) || 'Erro ao confirmar entrada.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex itemscenter justify-between">
        <h1 className="text-4xl font-bold text-primary">Transferências</h1>
        <button className="btn btn-info" onClick={openCreate}>+ Nova Transferência</button>
      </div>

      {loading ? (
        <div className="flex itemscenter gap-3">
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
                    <th>Referencia</th>
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
                          <button className="font-semibold text-primary hover:underline" onClick={() => openDetail(p)}>
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
              <span className="text-sm text-gray-600">{`P?gina ${page} / ${totalPages}`}</span>
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
            <h3 className="text-2xl font-bold mb-4">Detalhes da Transferencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-gray-500">Referencia</div><div className="font-semibold">{selectedPedido.reference || `#${selectedPedido.id}`}</div></div>
              <div><div className="text-gray-500">Status</div><div className="font-semibold">{statusLabel(selectedPedido.statut)}</div></div>
              <div><div className="text-gray-500">Data</div><div className="font-semibold">{new Date(selectedPedido.date_demande).toLocaleDateString('pt-BR')}</div></div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><div className="text-gray-500">Tipo origem</div><div className="font-semibold">{parseOrigemMeta(selectedPedido.description).tipo}</div></div>
              <div><div className="text-gray-500">Referencia origem</div><div className="font-semibold">{parseOrigemMeta(selectedPedido.description).referencia}</div></div>
            </div>

            <div className="mt-5">
              <div className="font-semibold mb-2">Materiais da transferencia</div>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead><tr><th>Codigo</th><th>Descricao</th><th>Qtd</th></tr></thead>
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
              <Link href={`/dashboard/pedidos/${selectedPedido.id}/formulario`} className="btn btn-outline">Formulario</Link>
              {selectedPedido.statut === 'BROUILLON' && (
                <button className="btn btn-warning" onClick={markAsTraiter} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Marcar como pendente'}
                </button>
              )}
              {(selectedPedido.statut === 'EN_ATTENTE' || selectedPedido.statut === 'APPROUVEE') && (
                <button className="btn btn-success" onClick={markEntradaFeita} disabled={workflowLoading}>
                  {workflowLoading ? 'Processando...' : 'Transferencia feita'}
                </button>
              )}
              {(selectedPedido.statut === 'ENTREGUE' || selectedPedido.statut === 'RECEBIDA') && (
                <span className="badge badge-success">Transferencia concluida</span>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailOpen(false)} disabled={workflowLoading}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="mb-4 text-2xl font-bold">Nova Transferencia</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label"><span className="label-text">Origem da transferencia</span></label>
                <select
                  className="select select-bordered w-full"
                  value={origemFluxoTipo}
                  onChange={(e) => {
                    const next = e.target.value as 'ENTRADA' | 'COMPRAS';
                    setOrigemFluxoTipo(next);
                    setSelectedOrigemPedidoId('');
                    setOrigemReferencia('');
                    setSelectedEntrepotOrigemId('');
                    setSelectedEntrepotDestinoId('');
                    setItems([]);
                    setSelectedMaterielId('');
                    setQuantidade('');
                  }}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="COMPRAS">Compras</option>
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text">Referencia de {origemFluxoTipo === 'COMPRAS' ? 'Compra' : 'Entrada'} (selecione)</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedOrigemPedidoId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedOrigemPedidoId(value);
                    const selected = origemOptions.find((p) => String(p.id) === value);
                    setOrigemReferencia(selected?.reference || '');
                    const origemEntrepotFromForm = selected?.formulario?.entrepot_destino;
                    const origemEntrepotFromItem = selected?.items?.[0]?.entrepot_id;
                    const origemEntrepotResolved = origemEntrepotFromForm || origemEntrepotFromItem;
                    if (origemEntrepotResolved) {
                      setSelectedEntrepotOrigemId(String(origemEntrepotResolved));
                    } else {
                      setSelectedEntrepotOrigemId('');
                    }
                    setSelectedEntrepotDestinoId('');
                    setItems([]);
                    setSelectedMaterielId('');
                    setQuantidade('');
                  }}
                >
                  <option value="">{`Selecione ${origemFluxoTipo === 'COMPRAS' ? 'a compra' : 'a entrada'}`}</option>
                  {origemOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.reference || `#${p.id}`} - ${origemFluxoTipo === 'COMPRAS' ? 'Compra' : 'Entrada'}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Referencia selecionada</span></label>
                <input
                  className="input input-bordered w-full"
                  value={origemReferencia}
                  readOnly
                  placeholder="Selecione uma referencia"
                />
              </div>
              <div>
                <label className="label"><span className="label-text">Demandante real</span></label>
                <select className="select select-bordered w-full" value={demandeurReelId} onChange={(e) => setDemandeurReelId(e.target.value)}>
                  <option value="">Selecione</option>
                  {utilisateursFinal.map((u) => (
                    <option key={u.id} value={u.id}>{u.entreprise || `#${u.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label"><span className="label-text">Deposito de origem da entrada</span></label>
                <input
                  className="input input-bordered w-full"
                  value={selectedOrigemPedido?.formulario?.entrepot_destino_nome || ''}
                  readOnly
                  placeholder="Selecione a entrada de referencia"
                />
              </div>
              <div>
                <label className="label"><span className="label-text">Deposito de destino da transferencia</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedEntrepotDestinoId}
                  onChange={(e) => setSelectedEntrepotDestinoId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {entrepotOptionsTransfer
                    .filter((e) => String(e.id) !== String(selectedEntrepotOrigemId || ''))
                    .map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
                {selectedOrigemPedido?.formulario?.entrepot_destino_nome && (
                  <div className="mt-1 text-xs text-gray-500">
                    {`Destino previsto na transferencia: ${selectedOrigemPedido.formulario.entrepot_destino_nome}`}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="label"><span className="label-text">Motivo de transferencia</span></label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 border rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <select className="select select-bordered md:col-span-2" value={selectedMaterielId} onChange={(e) => setSelectedMaterielId(e.target.value)}>
                  <option value="">Material da transferencia</option>
                  {origemMateriais.map((m) => (
                    <option key={m.id} value={m.id}>{`${m.code} - ${m.description} (Disponivel: ${m.origem_qtd} | Origem: ${m.origem_base})`}</option>
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
                <button className="btn btn-outline" type="button" onClick={addItem}>+ Adicionar</button>
              </div>

              {items.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead><tr><th>Codigo</th><th>Descricao</th><th>Qtd</th><th></th></tr></thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.materiel_id}>
                          <td>{it.code}</td>
                          <td>{it.description}</td>
                          <td>{it.quantite_demandee}</td>
                          <td className="text-right">
                            <button className="btn btn-xs btn-error" onClick={() => removeItem(it.materiel_id)}>Remover</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {createError && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{createError}</div>}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>Cancelar</button>
              <button className="btn btn-info" onClick={createTransferencia} disabled={createLoading}>
                {createLoading ? 'Criando...' : 'Criar transferencia'}
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
