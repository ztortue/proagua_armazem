'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type PedidoItem = {
  id: number;
  materiel_code: string;
  materiel_description: string;
  entrepot_pilier?: string | null;
  quantite_demandee: number;
  quantite_approuvee: number;
  quantite_entregue?: number;
  estado_recebimento?: 'PENDENTE' | 'CONFORME' | 'AVARIA' | 'INCOMPLETO';
  comentario_recebimento?: string;
  data_necessaria?: string | null;
};

type Pedido = {
  id: number;
  reference?: string;
  date_demande: string;
  statut: string;
  demandeur?: { first_name?: string; last_name?: string; username?: string };
  demandeur_reel?: { entreprise?: string } | null;
  projet?: { nom?: string; pilier?: string } | string | null;
  items: PedidoItem[];
};

type Formulerio = {
  id: number;
  tipo_fluxo?: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
  numero_formulario_recebimento?: string | null;
  estado_recebimento_geral?: 'CONFORME' | 'AVARIA' | 'INCOMPLETO' | null;
  local_recebimento?: string;
  observacao_recebimento?: string;
  entregue_por_nome?: string;
  entregue_em?: string | null;
  recebido_por_nome?: string;
  recebido_em?: string | null;
};

type HistoricoRecebimento = {
  id: number;
  numero_sessao: number;
  recebido_por_nome?: string;
  recebido_em: string;
  quantite_recebida: number;
  quantite_acumulada: number;
  quantite_pendente: number;
  estado_recebimento: string;
  comentario_recebimento?: string;
  materiel_code?: string;
  materiel_description?: string;
};

const MAX_ITEMS_PER_PAGE = 20;

function normalizeEstadoRecebimento(estado?: string | null): string {
  if (!estado) return 'CONFORME';
  return estado === 'PENDENTE' ? 'INCOMPLETO' : estado;
}

function estadoItemDisplay(item: PedidoItem, estadoAtual?: string | null): string {
  const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
  const qtdRecebida = item.quantite_entregue ?? 0;
  if (qtdBase > 0 && qtdRecebida >= qtdBase) return 'CONFORME';
  if (qtdRecebida > 0 && qtdRecebida < qtdBase) return 'INCOMPLETO';
  return normalizeEstadoRecebimento(estadoAtual);
}

function estadoHistoricoDisplay(h: HistoricoRecebimento): string {
  if (h.estado_recebimento === 'PENDENTE') {
    return (h.quantite_pendente ?? 0) === 0 ? 'CONFORME' : 'INCOMPLETO';
  }
  return normalizeEstadoRecebimento(h.estado_recebimento);
}

export default function PedidoRecebimentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pedidoId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [formulario, setFormulerio] = useState<Formulerio | null>(null);
  const [itemRows, setItemRows] = useState<Record<number, { quantite_receber_agora: number; estado_recebimento: string; comentario_recebimento: string }>>({});
  const [historico, setHistorico] = useState<HistoricoRecebimento[]>([]);

  useEffect(() => {
    if (!Number.isFinite(pedidoId)) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [pedidoRes, formRes, historicoRes] = await Promise.all([
          api.get(`/pedidos/${pedidoId}/`),
          api.get(`/pedidos/${pedidoId}/formulario/`),
          api.get(`/pedidos/${pedidoId}/historico-recebimento/`),
        ]);
        const pedidoData: Pedido = pedidoRes.data;
        const formData: Formulerio = formRes.data;
        const historicoData: HistoricoRecebimento[] = Array.isArray(historicoRes.data) ? historicoRes.data : [];
        setPedido(pedidoData);
        setFormulerio(formData);
        setHistorico(historicoData);
        const initialRows: Record<number, { quantite_receber_agora: number; estado_recebimento: string; comentario_recebimento: string }> = {};
        for (const item of pedidoData.items || []) {
          const qtdBase = item.quantite_approuvee || item.quantite_demandee;
          const qtdRecebida = item.quantite_entregue ?? 0;
          const qtdPendente = Math.max(0, qtdBase - qtdRecebida);
          initialRows[item.id] = {
            quantite_receber_agora: qtdPendente,
            estado_recebimento: normalizeEstadoRecebimento(item.estado_recebimento),
            comentario_recebimento: item.comentario_recebimento || '',
          };
        }
        setItemRows(initialRows);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao carregar formulário de recebimento.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pedidoId]);

  const projetoPilar = useMemo(() => {
    if (!pedido) return '-';
    const nome = typeof pedido.projet === 'string' ? pedido.projet : pedido.projet?.nom || '-';
    const pilier = typeof pedido.projet === 'string' ? '' : pedido.projet?.pilier || '';
    return pilier ? `${nome} :${pilier}` : nome;
  }, [pedido]);

  const pilarLabel = useMemo(() => {
    if (!pedido) return '-';
    if (typeof pedido.projet !== 'string' && pedido.projet?.pilier) return pedido.projet.pilier;
    const itemPilier = pedido.items.find((item) => item.entrepot_pilier)?.entrepot_pilier;
    return itemPilier || '-';
  }, [pedido]);

  const itemPages = useMemo(() => {
    if (!pedido) return [] as PedidoItem[][];
    const pages: PedidoItem[][] = [];
    for (let i = 0; i < pedido.items.length; i += MAX_ITEMS_PER_PAGE) {
      pages.push(pedido.items.slice(i, i + MAX_ITEMS_PER_PAGE));
    }
    return pages.length ? pages : [[]];
  }, [pedido]);

  const pendingItems = useMemo(() => {
    if (!pedido) return [] as Array<{ id: number; code: string; pendente: number }>;
    return (pedido.items || [])
      .map((item) => {
        const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
        const qtdEntregue = item.quantite_entregue || 0;
        return {
          id: item.id,
          code: item.materiel_code,
          pendente: Math.max(0, qtdBase - qtdEntregue),
        };
      })
      .filter((x) => x.pendente > 0);
  }, [pedido]);

  const isRecebimentoFechado = useMemo(
    () => !!formulario?.recebido_em && pendingItems.length === 0,
    [formulario?.recebido_em, pendingItems.length]
  );

  const formatSolicitante = (demandeur?: Pedido['demandeur']) =>
    demandeur?.username?.trim() ||
    `${demandeur?.first_name || ''} ${demandeur?.last_name || ''}`.trim() ||
    '-';

  const recebimentoResumo = useMemo(() => {
    if (!pedido) return { solicitado: 0, recebido: 0, pendente: 0 };
    return (pedido.items || []).reduce(
      (acc, item) => {
        const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
        const qtdRecebida = item.quantite_entregue || 0;
        acc.solicitado += qtdBase;
        acc.recebido += qtdRecebida;
        acc.pendente += Math.max(0, qtdBase - qtdRecebida);
        return acc;
      },
      { solicitado: 0, recebido: 0, pendente: 0 }
    );
  }, [pedido]);

  const statusLabel = useMemo(() => {
    const s = pedido?.statut || '';
    const fluxo = formulario?.tipo_fluxo;
    if (s === 'BROUILLON') return 'Rascunho';
    if (s === 'EN_ATTENTE') return 'Pendente';
    if (s === 'APPROUVEE') return 'Aprovada';
    if (s === 'ENTREGUE') return fluxo === 'ENTRADA' ? 'Recebida' : 'Entregue';
    if (s === 'RECEBIDA') return 'Recebida';
    if (s === 'REFUSEE') return 'Recusada';
    return s || '-';
  }, [pedido?.statut, formulario?.tipo_fluxo]);

  const fechamentoLabel = useMemo(() => {
    const isRecebida = pedido?.statut === 'RECEBIDA' || Boolean(formulario?.recebido_em);
    if (isRecebida) {
      return {
        actorLabel: 'Recebido por',
        actorName: formulario?.recebido_por_nome || formulario?.entregue_por_nome || '-',
        actorDate: formulario?.recebido_em || formulario?.entregue_em || null,
      };
    }
    return {
      actorLabel: 'Entregue por',
      actorName: formulario?.entregue_por_nome || '-',
      actorDate: formulario?.entregue_em || null,
    };
  }, [pedido?.statut, formulario?.recebido_em, formulario?.recebido_por_nome, formulario?.entregue_em, formulario?.entregue_por_nome]);


  const ultimaSessaoHistorico = useMemo(
    () => historico.reduce((max, h) => Math.max(max, h.numero_sessao || 0), 0),
    [historico]
  );

  const handleConfirmarRecebimento = async () => {
    if (!pedido || !formulario) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload = {
        estado_recebimento_geral: formulario.estado_recebimento_geral || null,
        local_recebimento: formulario.local_recebimento || '',
        observacao_recebimento: formulario.observacao_recebimento || '',
        items: pedido.items.map((item) => ({
          id: item.id,
          quantite_receber_agora: itemRows[item.id]?.quantite_receber_agora ?? 0,
          estado_recebimento: itemRows[item.id]?.estado_recebimento || 'CONFORME',
          comentario_recebimento: itemRows[item.id]?.comentario_recebimento || '',
        })),
      };
      const res = await api.post(`/pedidos/${pedido.id}/confirmar-recebimento/`, payload);
      setSuccess(res.data?.detail || 'Recebimento confirmado com sucesso.');
      const [pedidoRes, formRes, historicoRes] = await Promise.all([
        api.get(`/pedidos/${pedido.id}/`),
        api.get(`/pedidos/${pedido.id}/formulario/`),
        api.get(`/pedidos/${pedido.id}/historico-recebimento/`),
      ]);
      const pedidoData: Pedido = pedidoRes.data;
      const formData: Formulerio = formRes.data;
      const historicoData: HistoricoRecebimento[] = Array.isArray(historicoRes.data) ? historicoRes.data : [];
      setPedido(pedidoData);
      setFormulerio(formData);
      setHistorico(historicoData);
      const refreshedRows: Record<number, { quantite_receber_agora: number; estado_recebimento: string; comentario_recebimento: string }> = {};
      for (const item of pedidoData.items || []) {
        const qtdBase = item.quantite_approuvee || item.quantite_demandee;
        const qtdRecebida = item.quantite_entregue ?? 0;
        const qtdPendente = Math.max(0, qtdBase - qtdRecebida);
        refreshedRows[item.id] = {
          quantite_receber_agora: qtdPendente,
          estado_recebimento: normalizeEstadoRecebimento(item.estado_recebimento),
          comentario_recebimento: item.comentario_recebimento || '',
        };
      }
      setItemRows(refreshedRows);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao confirmar recebimento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  if (!pedido || !formulario) {
    return (
      <div className="p-8">
        <div className="alert alert-error">{error || 'Pedido não encontrado.'}</div>
        <div className="mt-4"><Link href="/dashboard/pedidos" className="btn btn-outline">Voltar</Link></div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media screen {
          .print-only {
            display: none;
          }
        }

        @media print {
          @page {
            margin: 8mm;
          }

          header, footer, .drawer-side, .drawer-overlay, #left-sidebar, .no-print { display: none !important; }
          .drawer-content, .drawer-content.lg\\:ml-80 { margin-left: 0 !important; }
          main { padding: 0 !important; }

          .print-only {
            display: block !important;
          }

          .print-page {
            padding: 0;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
            table-layout: fixed;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #999;
            padding: 4px 6px;
            vertical-align: top;
            white-space: normal;
            word-break: break-word;
          }

          .print-signatures {
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid #999;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 8px;
          }

          .print-sign-box {
            min-height: 70px;
            border: 1px dashed #999;
            padding: 8px;
          }
        }
      `}</style>

      <div className="p-6 space-y-6 no-print">
        <div className="flex itemsstart justify-between gap-4">
          <div className="flex itemsstart gap-4">
            <div className="flex flex-col gap-2">
              <img src="/suezlogo.png" alt="Suez" className="h-8 w-auto" />
              <img src="/mitrelli-logo.jpeg" alt="Mitrelli" className="h-8 w-auto" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Formulerio de Recebimento de Material</h1>
              <p className="text-sm opacity-70">{`Pedido ${pedido.reference || `#${pedido.id}`}`}</p>
            </div>
          </div>
          <img src="/EPAL-logo.jpeg" alt="EPAL" className="h-8 w-auto rounded-sm" />
        </div>

        <div className="no-print flex itemscenter justify-end gap-2">
          <button className="btn btn-outline" onClick={() => router.back()}>Voltar</button>
          <button className="btn btn-outline" onClick={() => window.print()}>Imprimir</button>
          <button className="btn btn-primary" onClick={handleConfirmarRecebimento} disabled={saving || isRecebimentoFechado}>
            {saving ? 'Confirmando...' : isRecebimentoFechado ? 'Operação Fechada' : 'Confirmar Recebimento'}
          </button>
        </div>

        {!isRecebimentoFechado && pendingItems.length > 0 && (
          <div className="alert alert-warning">
            <div className="w-full">
              <div>
                Recebimento em curso. Referência {pedido.reference || `#${pedido.id}`} ainda possui {pendingItems.length} item(ns) pendente(s).
              </div>
              <div className="mt-2 text-sm">
                {pendingItems.map((x) => `${x.code}: falta ${x.pendente}`).join(' | ')}
              </div>
            </div>
          </div>
        )}

        <div className="card bg-base-100 shadow">
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><div className="text-xs uppercase opacity-60">Referência Pedido</div><div className="font-semibold">{pedido.reference || '-'}</div></div>
            <div><div className="text-xs uppercase opacity-60">Solicitante</div><div className="font-semibold">{formatSolicitante(pedido.demandeur)}</div></div>
            <div><div className="text-xs uppercase opacity-60">Projeto</div><div className="font-semibold">{pilarLabel !== '-' ? pilarLabel : projetoPilar}</div></div>
            <div><div className="text-xs uppercase opacity-60">Data Recebimento</div><div className="font-semibold">{formulario.recebido_em ? new Date(formulario.recebido_em).toLocaleString('pt-BR') : '-'}</div></div>
            <div><div className="text-xs uppercase opacity-60">Número Formulerio</div><div className="font-semibold">{formulario.numero_formulario_recebimento || '-'}</div></div>
            <div><div className="text-xs uppercase opacity-60">{fechamentoLabel.actorLabel}</div><div className="font-semibold">{fechamentoLabel.actorName}</div></div>
            <div><div className="text-xs uppercase opacity-60">Qtd Solicitada</div><div className="font-semibold">{recebimentoResumo.solicitado}</div></div>
            <div><div className="text-xs uppercase opacity-60">Qtd Ja Recebida</div><div className="font-semibold">{recebimentoResumo.recebido}</div></div>
            <div><div className="text-xs uppercase opacity-60">Qtd Pendente</div><div className="font-semibold">{recebimentoResumo.pendente}</div></div>
            <div><div className="text-xs uppercase opacity-60">Status da Operação</div><div className="font-semibold">{statusLabel}</div></div>
            <div><div className="text-xs uppercase opacity-60">Última Sessão</div><div className="font-semibold">{ultimaSessaoHistorico ? `#${ultimaSessaoHistorico}` : '-'}</div></div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label"><span className="label-text">Estado geral do recebimento</span></label>
              <select
                className="select select-bordered w-full"
                value={formulario.estado_recebimento_geral || ''}
                disabled={isRecebimentoFechado}
                onChange={(e) => setFormulerio((prev) => prev ? { ...prev, estado_recebimento_geral: (e.target.value || null) as any } : prev)}
              >
                <option value="">Selecione</option>
                <option value="CONFORME">Em conformidade</option>
                <option value="AVARIA">Com avaria</option>
                <option value="INCOMPLETO">Incompleto</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label"><span className="label-text">Local de recebimento</span></label>
              <input
                className="input input-bordered w-full"
                value={formulario.local_recebimento || ''}
                disabled={isRecebimentoFechado}
                onChange={(e) => setFormulerio((prev) => prev ? { ...prev, local_recebimento: e.target.value } : prev)}
              />
            </div>
            <div className="md:col-span-3">
              <label className="label"><span className="label-text">Observações de recebimento</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                value={formulario.observacao_recebimento || ''}
                disabled={isRecebimentoFechado}
                onChange={(e) => setFormulerio((prev) => prev ? { ...prev, observacao_recebimento: e.target.value } : prev)}
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="font-semibold mb-2">Lista de materiais entregues</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Ref Item</th>
                    <th>Designacao</th>
                    <th>Qtd Pedida</th>
                    <th>Qtd Ja Recebida</th>
                    <th>Qtd Pendente</th>
                    <th>Receber Agora</th>
                    <th>Estado</th>
                    <th>Comentário</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items.map((item) => {
                    const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
                    const qtdRecebida = item.quantite_entregue || 0;
                    const qtdPendente = Math.max(0, qtdBase - qtdRecebida);
                    return (
                      <tr key={item.id}>
                        <td>{item.materiel_code}</td>
                        <td>{item.materiel_description}</td>
                        <td>{qtdBase}</td>
                        <td>{qtdRecebida}</td>
                        <td>{qtdPendente}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={qtdPendente}
                            className="input input-bordered input-sm w-28"
                            disabled={isRecebimentoFechado}
                            value={itemRows[item.id]?.quantite_receber_agora ?? 0}
                            onChange={(e) =>
                              setItemRows((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || { quantite_receber_agora: 0, estado_recebimento: 'CONFORME', comentario_recebimento: '' }),
                                  quantite_receber_agora: Math.min(qtdPendente, Math.max(0, Number(e.target.value || 0))),
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <select
                            className="select select-bordered select-sm w-44"
                            disabled={isRecebimentoFechado}
                            value={itemRows[item.id]?.estado_recebimento || 'CONFORME'}
                            onChange={(e) =>
                              setItemRows((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || { quantite_receber_agora: 0, estado_recebimento: 'CONFORME', comentario_recebimento: '' }),
                                  estado_recebimento: e.target.value,
                                },
                              }))
                            }
                          >
                            <option value="CONFORME">Conforme</option>
                            <option value="AVARIA">Com avaria</option>
                            <option value="INCOMPLETO">Incompleto</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="input input-bordered input-sm w-full min-w-[220px]"
                            disabled={isRecebimentoFechado}
                            value={itemRows[item.id]?.comentario_recebimento || ''}
                            onChange={(e) =>
                              setItemRows((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || { quantite_receber_agora: 0, estado_recebimento: 'CONFORME', comentario_recebimento: '' }),
                                  comentario_recebimento: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="font-semibold mb-2">Histórico de recebimentos por sessão</h2>
            {historico.length === 0 ? (
              <div className="text-sm text-gray-500">Sem histórico ainda para esta referencia.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr>
                      <th>Sessão</th>
                      <th>Data/Hora</th>
                      <th>Usuário</th>
                      <th>Material</th>
                      <th>Estado</th>
                      <th>Comentário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h) => (
                      <tr key={h.id}>
                        <td>#{h.numero_sessao}</td>
                        <td>{h.recebido_em ? new Date(h.recebido_em).toLocaleString('pt-BR') : '-'}</td>
                        <td>{h.recebido_por_nome || '-'}</td>
                        <td>{h.materiel_code || '-'} - {h.materiel_description || '-'}</td>
                        <td>{estadoHistoricoDisplay(h)}</td>
                        <td>{h.comentario_recebimento || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="no-print flex itemscenter justify-end gap-2">
          <button className="btn btn-outline" onClick={() => router.back()}>Voltar</button>
          <button className="btn btn-outline" onClick={() => window.print()}>Imprimir</button>
          <button className="btn btn-primary" onClick={handleConfirmarRecebimento} disabled={saving || isRecebimentoFechado}>
            {saving ? 'Confirmando...' : isRecebimentoFechado ? 'Operação Fechada' : 'Confirmar Recebimento'}
          </button>
        </div>
      </div>

      <div className="print-only">
        {itemPages.map((items, pageIndex) => (
          <section
            key={pageIndex}
            className="print-page"
            style={{
              pageBreakAfter: pageIndex < itemPages.length - 1 ? 'always' : 'auto',
              minHeight: '250mm',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <img src="/suezlogo.png" alt="Suez" style={{ height: '24px', width: 'auto' }} />
                  <img src="/mitrelli-logo.jpeg" alt="Mitrelli" style={{ height: '24px', width: 'auto' }} />
                </div>
                <div>
                  <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#0284c7' }}>
                    Formulerio de Recebimento de Material
                  </h1>
                  <div style={{ fontSize: '12px' }}>{`Pedido ${pedido.reference || `#${pedido.id}`}`}</div>
                </div>
              </div>
              <img src="/EPAL-logo.jpeg" alt="EPAL" style={{ height: '24px', width: 'auto' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '12px' }}>
              <div><strong>Referência Pedido:</strong> {pedido.reference || '-'}</div>
              <div><strong>Projeto:</strong> {pilarLabel !== '-' ? pilarLabel : projetoPilar}</div>
              <div><strong>Número Formulerio:</strong> {formulario.numero_formulario_recebimento || '-'}</div>
              <div><strong>Estado geral:</strong> {formulario.estado_recebimento_geral || '-'}</div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>REF ITEM</th>
                  <th style={{ width: '36%' }}>DESIGNAÇÃO</th>
                  <th style={{ width: '12%' }}>QTDE RECEB.</th>
                  <th style={{ width: '16%' }}>ESTADO</th>
                  <th style={{ width: '20%' }}>COMENTÁRIO</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.materiel_code}</td>
                    <td>{item.materiel_description}</td>
                    <td>{item.quantite_entregue ?? 0}</td>
                    <td>{estadoItemDisplay(item, itemRows[item.id]?.estado_recebimento)}</td>
                    <td>{itemRows[item.id]?.comentario_recebimento || '________________'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pageIndex === itemPages.length - 1 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  HISTORICO DE RECEBIMENTOS POR SESSAO
                </div>
                {historico.length === 0 ? (
                  <div style={{ fontSize: '11px' }}>Sem historico registrado.</div>
                ) : (
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%' }}>SESSAO</th>
                        <th style={{ width: '18%' }}>DATA/HORA</th>
                        <th style={{ width: '18%' }}>USUARIO</th>
                        <th style={{ width: '34%' }}>MATERIAL</th>
                        <th style={{ width: '22%' }}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h) => (
                        <tr key={`print-h-${h.id}`}>
                          <td>#{h.numero_sessao}</td>
                          <td>{h.recebido_em ? new Date(h.recebido_em).toLocaleString('pt-BR') : '-'}</td>
                          <td>{h.recebido_por_nome || '-'}</td>
                          <td>{h.materiel_code || '-'} - {h.materiel_description || '-'}</td>
                          <td>{estadoHistoricoDisplay(h)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="print-signatures" style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '12px' }}><strong>Página:</strong> {pageIndex + 1} / {itemPages.length}</div>
              <div className="print-signatures-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="print-sign-box">
                  <div><strong>Recebido por:</strong> {formulario.recebido_por_nome || '-'}</div>
                  <div><strong>Data:</strong> {formulario.recebido_em ? new Date(formulario.recebido_em).toLocaleString('pt-BR') : '-'}</div>
                  <div style={{ marginTop: '24px' }}>Assinatura: ____________________</div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
