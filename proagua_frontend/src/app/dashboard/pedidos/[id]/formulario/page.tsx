'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

type PedidoItem = {
  id: number;
  materiel_code: string;
  materiel_description: string;
  materiel_usage_type?: 'PRET' | 'INSTALL' | string;
  entrepot_pilier?: string | null;
  quantite_demandee: number;
  quantite_approuvee: number;
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
  description?: string;
  items: PedidoItem[];
};

type Formulario = {
  id: number;
  tipo_fluxo: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  motivo: string;
  destino_uso: string;
  observacoes: string;
  data_retorno_prevista?: string | null;
  numero_formulario_saida?: string | null;
  entrepot_origem?: number | null;
  entrepot_destino?: number | null;
  entrepot_origem_id?: number | null;
  entrepot_destino_id?: number | null;
  entrepot_origem_nome?: string;
  entrepot_destino_nome?: string;
  solicitado_por_nome?: string;
  solicitado_em?: string | null;
  validado_por_nome?: string;
  validado_em?: string | null;
  aprovado_por_nome?: string;
  aprovado_em?: string | null;
  entregue_por_nome?: string;
  entregue_em?: string | null;
  recebido_por_nome?: string;
  recebido_em?: string | null;
};

type EntrepotOption = { id: number; nom: string };

const MAX_ITEMS_PER_PAGE = 20;

function formatDate(date?: string | null) {
  return date ? new Date(date).toLocaleString('pt-BR') : '-';
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function PedidoFormularioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pedidoId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [itemDates, setItemDates] = useState<Record<number, string>>({});
  const [entrepots, setEntrepots] = useState<EntrepotOption[]>([]);

  useEffect(() => {
    if (!Number.isFinite(pedidoId)) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [pedidoRes, formRes] = await Promise.all([
          api.get(`/pedidos/${pedidoId}/`),
          api.get(`/pedidos/${pedidoId}/formulario/`),
        ]);
        const pedidoData: Pedido = pedidoRes.data;
        setPedido(pedidoData);
        setFormulario(formRes.data);
        const initialItemDates: Record<number, string> = {};
        for (const item of pedidoData.items || []) {
          initialItemDates[item.id] = toDateInputValue(item.data_necessaria);
        }
        setItemDates(initialItemDates);
        const entrepotsRes = await api.get('/entrepots/');
        const list = Array.isArray(entrepotsRes.data?.results) ? entrepotsRes.data.results : entrepotsRes.data;
        setEntrepots(Array.isArray(list) ? list.map((e: any) => ({ id: e.id, nom: e.nom })) : []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Erro ao carregar formulario do pedido.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pedidoId]);

  const pedidoTitulo = useMemo(() => {
    if (!pedido) return '';
    return pedido.reference || `#${pedido.id}`;
  }, [pedido]);

  const pilarLabel = useMemo(() => {
    if (!pedido) return '-';
    if (typeof pedido.projet !== 'string' && pedido.projet?.pilier) return pedido.projet.pilier;
    const itemPilier = pedido.items.find((item) => item.entrepot_pilier)?.entrepot_pilier;
    return itemPilier || '-';
  }, [pedido]);

  const projetoComPilar = useMemo(() => {
    if (!pedido) return '-';
    const projetoNome = typeof pedido.projet === 'string' ? pedido.projet : pedido.projet?.nom || '-';
    return `${projetoNome} :${pilarLabel}`;
  }, [pedido, pilarLabel]);

  const tipoMaterialPedido = useMemo(() => {
    if (!pedido) return '-';
    const values = new Set(
      pedido.items
        .map((item) => (item.materiel_usage_type || '').toUpperCase())
        .filter(Boolean)
    );
    if (values.size === 0) return '-';
    if (values.size > 1) return 'Misto (Empréstimo e Instalacao)';
    const only = Array.from(values)[0];
    if (only === 'PRET') return 'Material Temporario (Empréstimo)';
    if (only === 'INSTALL') return 'Material Regular (Instalacao)';
    return only;
  }, [pedido]);

  const itemPages = useMemo(() => {
    if (!pedido) return [] as PedidoItem[][];
    const pages: PedidoItem[][] = [];
    for (let i = 0; i < pedido.items.length; i += MAX_ITEMS_PER_PAGE) {
      pages.push(pedido.items.slice(i, i + MAX_ITEMS_PER_PAGE));
    }
    return pages.length ? pages : [[]];
  }, [pedido]);

  const statusLabel = useMemo(() => {
    if (!pedido) return '-';
    if (pedido.statut === 'RECEBIDA') return 'Recebida';
    if (pedido.statut === 'ENTREGUE') return 'Entregue';
    if (pedido.statut === 'EN_ATTENTE') return 'Pendente';
    if (pedido.statut === 'BROUILLON') return 'Rascunho';
    return pedido.statut;
  }, [pedido]);

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

  const solicitadoPorDisplay = useMemo(() => {
    if (!formulario) return '-';
    const isSaida = formulario.tipo_fluxo === 'INSTALACAO';
    if (isSaida) {
      return pedido?.demandeur_reel?.entreprise || formulario.solicitado_por_nome || '-';
    }
    return formulario.solicitado_por_nome || '-';
  }, [formulario, pedido?.demandeur_reel?.entreprise]);

  const saveValidationMessage = useMemo(() => {
    if (!formulario) return '';
    const isSaidaFluxo = ['INSTALACAO', 'EMPRESTIMO', 'TRANSFERENCIA', 'DEVOLUCAO'].includes(formulario.tipo_fluxo);
    const isWorkflowFinal = pedido?.statut === 'ENTREGUE' || pedido?.statut === 'RECEBIDA';
    const persistedAllDatesFilled = (pedido?.items || []).every((item) => Boolean(item.data_necessaria));
    const isDatasOnlyMode = Boolean(pedido) && isSaidaFluxo && isWorkflowFinal && !persistedAllDatesFilled;
    if (isDatasOnlyMode) {
      const allDatesFilled = (pedido?.items || []).every((item) => Boolean(itemDates[item.id]));
      if (!allDatesFilled) {
        return 'Preencha a data necessaria de todos os itens para fechar o formulario.';
      }
      return '';
    }

    const origemId = formulario.entrepot_origem_id ?? formulario.entrepot_origem ?? null;
    const destinoId = formulario.entrepot_destino_id ?? formulario.entrepot_destino ?? null;

    if ((formulario.tipo_fluxo === 'COMPRAS' || formulario.tipo_fluxo === 'ENTRADA' || formulario.tipo_fluxo === 'DEVOLUCAO') && !destinoId) {
      return 'Para Compras/Devolução, selecione o depósito de destino.';
    }
    if (formulario.tipo_fluxo === 'EMPRESTIMO' && !formulario.data_retorno_prevista) {
      return 'Para Empréstimo, informe a data/hora prevista de retorno.';
    }
    if (formulario.tipo_fluxo === 'TRANSFERENCIA') {
      if (!origemId || !destinoId) {
        return 'Para Transferência, selecione depósito de origem e de destino.';
      }
      if (origemId === destinoId) {
        return 'Na Transferência, origem e destino não podem ser iguais.';
      }
    }
    return '';
  }, [formulario, pedido, itemDates]);

  const isSaidaFlow = useMemo(
    () => ['INSTALACAO', 'EMPRESTIMO', 'TRANSFERENCIA', 'DEVOLUCAO'].includes(formulario?.tipo_fluxo || ''),
    [formulario]
  );
  const isWorkflowFinal = useMemo(
    () => pedido?.statut === 'ENTREGUE' || pedido?.statut === 'RECEBIDA',
    [pedido?.statut]
  );
  const persistedAllItemDatesFilled = useMemo(
    () => (pedido?.items || []).every((item) => Boolean(item.data_necessaria)),
    [pedido?.items]
  );
  const isDatasOnlyMode = Boolean(pedido) && isSaidaFlow && isWorkflowFinal && !persistedAllItemDatesFilled;
  const isFormularioFullyLocked = Boolean(pedido) && isSaidaFlow && isWorkflowFinal && persistedAllItemDatesFilled;

  const handleSave = async () => {
    if (!formulario || !pedido) return;
    if (isFormularioFullyLocked) return;
    try {
      setSaving(true);
      setError(null);
      const itemDatasPayload = (pedido.items || []).map((item) => ({
        item_id: item.id,
        data_necessaria: itemDates[item.id] || null,
      }));
      const payload = isDatasOnlyMode
        ? {
            item_datas_necessarias: itemDatasPayload,
          }
        : {
            tipo_fluxo: formulario.tipo_fluxo,
            prioridade: formulario.prioridade,
            motivo: formulario.motivo || '',
            destino_uso: formulario.destino_uso || '',
            observacoes: formulario.observacoes || '',
            data_retorno_prevista:
              formulario.tipo_fluxo === 'EMPRESTIMO'
                ? (formulario.data_retorno_prevista || null)
                : null,
            entrepot_origem_id: formulario.entrepot_origem_id ?? formulario.entrepot_origem ?? null,
            entrepot_destino_id: formulario.entrepot_destino_id ?? formulario.entrepot_destino ?? null,
            item_datas_necessarias: itemDatasPayload,
          };
      const res = await api.patch(`/pedidos/${pedido.id}/formulario/`, payload);
      setFormulario(res.data);
      const pedidoRes = await api.get(`/pedidos/${pedido.id}/`);
      const pedidoAtualizado: Pedido = pedidoRes.data;
      setPedido(pedidoAtualizado);
      const refreshedItemDates: Record<number, string> = {};
      for (const item of pedidoAtualizado.items || []) {
        refreshedItemDates[item.id] = toDateInputValue(item.data_necessaria);
      }
      setItemDates(refreshedItemDates);
      alert('Formulario atualizado com sucesso.');
    } catch (err: any) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erro ao guardar formulario.');
    } finally {
      setSaving(false);
    }
  };

  const handleItemDateChange = (itemId: number, value: string) => {
    setItemDates((prev) => ({ ...prev, [itemId]: value }));
  };

  if (loading) {
    return (
      <div className="p-8 no-print">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!pedido || !formulario) {
    return (
      <div className="p-8 no-print">
        <div className="alert alert-error">{error || 'Pedido não encontrado.'}</div>
        <div className="mt-4">
          <Link href="/dashboard/pedidos" className="btn btn-outline">
            Voltar para pedidos
          </Link>
        </div>
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
          header,
          footer,
          .drawer-side,
          .drawer-overlay,
          #left-sidebar,
          .no-print {
            display: none !important;
          }

          .drawer-content,
          .drawer-content.lg\:ml-80 {
            margin-left: 0 !important;
          }

          main {
            padding: 0 !important;
          }

          .print-only {
            display: block !important;
          }

          .print-page {
            padding: 8mm 8mm;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #999;
            padding: 4px 6px;
            vertical-align: top;
            white-space: normal;
            word-break: break-word;
          }

          .print-table {
            table-layout: fixed;
          }

          .print-signatures {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #999;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 8px;
          }

          .print-sign-box {
            min-height: 70px;
            border: 1px dashed #999;
            padding: 8px;
          }

          .print-aviso {
            margin-top: 8px;
            padding: 6px;
            border: 1px solid #d4a72c;
            background: #fefce8;
            font-size: 10px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-aviso ol {
            margin: 0;
            padding-left: 16px;
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
              <h1 className="text-3xl font-bold text-primary">Formulario de Saida</h1>
              <p className="text-sm opacity-70">{`Pedido ${pedidoTitulo}`}</p>
            </div>
          </div>
          <div className="flex itemscenter gap-3">
            <img src="/EPAL-logo.jpeg" alt="EPAL" className="h-8 w-auto rounded-sm" />
          </div>
        </div>

        <div className="flex itemscenter justify-end gap-2">
            <button className="btn btn-outline" onClick={() => router.back()}>
              Voltar
            </button>
            <button className="btn btn-outline" onClick={() => window.print()}>
              Imprimir
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !!saveValidationMessage || isFormularioFullyLocked}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        {(isDatasOnlyMode || isFormularioFullyLocked) && (
          <div className={`alert ${isFormularioFullyLocked ? 'alert-success' : 'alert-info'}`}>
            <span>
              {isFormularioFullyLocked
                ? 'Formulario fechado: nenhuma modificacao adicional e permitida.'
                : 'Workflow finalizado: apenas a coluna "Data necessaria" pode ser preenchida.'}
            </span>
          </div>
        )}
        {saveValidationMessage && (
          <div className="alert alert-warning">
            <span>{saveValidationMessage}</span>
          </div>
        )}
        <div className="card bg-base-100 shadow">
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase opacity-60">Referencia</div>
              <div className="font-semibold">{pedido.reference || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Data</div>
              <div className="font-semibold">{new Date(pedido.date_demande).toLocaleString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Número Formulario</div>
              <div className="font-semibold">{formulario.numero_formulario_saida || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Status</div>
              <div className="font-semibold">{statusLabel}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Solicitante</div>
              <div className="font-semibold">
                {pedido.demandeur
                  ? ` ${pedido.demandeur_reel?.entreprise || ''}`.trim() || pedido.demandeur.username
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Projeto</div>
              <div className="font-semibold">{projetoComPilar}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-60">Tipo de Material</div>
              <div className="font-semibold">{tipoMaterialPedido}</div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label"><span className="label-text">Tipo de fluxo</span></label>
              <select
                className="select select-bordered w-full"
                value={formulario.tipo_fluxo}
                disabled={isDatasOnlyMode || isFormularioFullyLocked}
                onChange={(e) => setFormulario((prev) => (prev ? { ...prev, tipo_fluxo: e.target.value as Formulario['tipo_fluxo'] } : prev))}
              >
                <option value="INSTALACAO">Instalacao</option>
                <option value="EMPRESTIMO">Empréstimo</option>
                <option value="COMPRAS">Compras</option>
                <option value="ENTRADA">Entrada</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="DEVOLUCAO">Devolução</option>
              </select>
            </div>
            <div>
              <label className="label"><span className="label-text">Prioridade</span></label>
              <select
                className="select select-bordered w-full"
                value={formulario.prioridade}
                disabled={isDatasOnlyMode || isFormularioFullyLocked}
                onChange={(e) => setFormulario((prev) => (prev ? { ...prev, prioridade: e.target.value as Formulario['prioridade'] } : prev))}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            {formulario.tipo_fluxo === 'EMPRESTIMO' && (
              <div>
                <label className="label"><span className="label-text">Data/hora prevista de retorno</span></label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  disabled={isDatasOnlyMode || isFormularioFullyLocked}
                  value={toDateTimeLocalValue(formulario.data_retorno_prevista)}
                  onChange={(e) =>
                    setFormulario((prev) =>
                      prev
                        ? {
                            ...prev,
                            data_retorno_prevista: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          }
                        : prev
                    )
                  }
                />
              </div>
            )}
            {(formulario.tipo_fluxo === 'TRANSFERENCIA' || formulario.tipo_fluxo === 'COMPRAS' || formulario.tipo_fluxo === 'ENTRADA' || formulario.tipo_fluxo === 'DEVOLUCAO') && (
              <div>
                <label className="label"><span className="label-text">Depósito de destino</span></label>
                <select
                  className="select select-bordered w-full"
                  disabled={isDatasOnlyMode || isFormularioFullyLocked}
                  value={(formulario.entrepot_destino_id ?? formulario.entrepot_destino ?? '') as any}
                  onChange={(e) => setFormulario((prev) => (
                    prev ? { ...prev, entrepot_destino_id: e.target.value ? Number(e.target.value) : null } : prev
                  ))}
                >
                  <option value="">Selecione</option>
                  {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
            )}
            {formulario.tipo_fluxo === 'TRANSFERENCIA' && (
              <div>
                <label className="label"><span className="label-text">Depósito de origem</span></label>
                <select
                  className="select select-bordered w-full"
                  disabled={isDatasOnlyMode || isFormularioFullyLocked}
                  value={(formulario.entrepot_origem_id ?? formulario.entrepot_origem ?? '') as any}
                  onChange={(e) => setFormulario((prev) => (
                    prev ? { ...prev, entrepot_origem_id: e.target.value ? Number(e.target.value) : null } : prev
                  ))}
                >
                  <option value="">Selecione</option>
                  {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="label"><span className="label-text">Motivo</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                disabled={isDatasOnlyMode || isFormularioFullyLocked}
                value={formulario.motivo || ''}
                onChange={(e) => setFormulario((prev) => (prev ? { ...prev, motivo: e.target.value } : prev))}
              />
            </div>
            <div>
              <label className="label"><span className="label-text">Destino de uso</span></label>
              <input
                className="input input-bordered w-full"
                disabled={isDatasOnlyMode || isFormularioFullyLocked}
                value={formulario.destino_uso || ''}
                onChange={(e) => setFormulario((prev) => (prev ? { ...prev, destino_uso: e.target.value } : prev))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label"><span className="label-text">Observacoes</span></label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                disabled={isDatasOnlyMode || isFormularioFullyLocked}
                value={formulario.observacoes || ''}
                onChange={(e) => setFormulario((prev) => (prev ? { ...prev, observacoes: e.target.value } : prev))}
              />
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="font-semibold mb-2">Materiais solicitados</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>REF ITEM</th>
                    <th>DESIGNACAO</th>
                    <th>QTDE SOLIC.</th>
                    <th>DATA NECESARIA</th>
                    <th>COMENTARIO</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.materiel_code}</td>
                      <td>{item.materiel_description}</td>
                      <td>{item.quantite_demandee}</td>
                      <td>
                        <input
                          type="date"
                          className="input input-bordered input-sm w-full min-w-[145px]"
                          value={itemDates[item.id] || ''}
                          disabled={isFormularioFullyLocked}
                          onChange={(e) => handleItemDateChange(item.id, e.target.value)}
                        />
                      </td>
                      <td>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body text-sm space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><strong>Solicitado por:</strong> {solicitadoPorDisplay} ({formatDate(formulario.solicitado_em)})</div>
              <div><strong>{fechamentoLabel.actorLabel}:</strong> {fechamentoLabel.actorName} ({formatDate(fechamentoLabel.actorDate)})</div>
            </div>
          </div>
        </div>

        <div className="card border border-amber-300 bg-amber-50 shadow">
          <div className="card-body text-sm">
            <h3 className="mb-2 font-bold text-amber-900">Aviso</h3>
            <ol className="list-decimal space-y-1 pl-5 text-amber-800">
              <li>Comunique imediatamente qualquer avaria ao setor responsável (Logístico/Gestão de Materiais).</li>
              <li>Não descarte ou repare o item sem autorização prévia.</li>
              <li>Documente o dano com fotos e relatório detalhado (causa, data, condições de recebimento).</li>
              <li>Siga os procedimentos internos para não conformidades.</li>
            </ol>
            <p className="mt-2 font-semibold text-amber-900">
              O não cumprimento poderá resultar em responsabilização por reparo ou substituições.
            </p>
          </div>
        </div>

        <div className="flex itemscenter justify-end gap-2 border-t border-base-300 pt-4">
          <button className="btn btn-outline" onClick={() => router.back()}>
            Voltar
          </button>
          <button className="btn btn-outline" onClick={() => window.print()}>
            Imprimir
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !!saveValidationMessage || isFormularioFullyLocked}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
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
                  <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#0284c7' }}>Formulario de Saida</h1>
                  <div style={{ fontSize: '12px', marginBottom: '6px' }}>Pedido {pedidoTitulo}</div>
                </div>
              </div>
              <img src="/EPAL-logo.jpeg" alt="EPAL" style={{ height: '24px', width: 'auto' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '12px' }}>
              <div><strong>Referencia:</strong> {pedido.reference || '-'}</div>
              <div><strong>Data:</strong> {new Date(pedido.date_demande).toLocaleString('pt-BR')}</div>
              <div><strong>Número Formulario:</strong> {formulario.numero_formulario_saida || '-'}</div>
              <div><strong>Status:</strong> {statusLabel}</div>
              <div>
                <strong>Solicitante:</strong>{' '}
                {pedido.demandeur
                  ? `${pedido.demandeur_reel?.entreprise || ''}`.trim() || pedido.demandeur.username
                  : '-'}
              </div>
              <div><strong>Projeto:</strong> {projetoComPilar}</div>
              <div><strong>Tipo de Material:</strong> {tipoMaterialPedido}</div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>REF ITEM</th>
                  <th style={{ width: '42%' }}>DESIGNACAO</th>
                  <th style={{ width: '12%' }}>QTDE SOLIC.</th>
                  <th style={{ width: '15%' }}>DATA NECESARIA</th>
                  <th style={{ width: '15%' }}>COMENTARIO</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.materiel_code}</td>
                    <td>{item.materiel_description}</td>
                    <td>{item.quantite_demandee}</td>
                    <td>{itemDates[item.id] ? new Date(itemDates[item.id]).toLocaleDateString('pt-BR') : '________________'}</td>
                    <td>________________</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="print-signatures" style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '12px' }}><strong>Pagina:</strong> {pageIndex + 1} / {itemPages.length}</div>
              <div className="print-signatures-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="print-sign-box">
                  <div><strong>Solicitado por:</strong> {solicitadoPorDisplay}</div>
                  <div><strong>Data:</strong> {formatDate(formulario.solicitado_em)}</div>
                  <div style={{ marginTop: '24px' }}>Assinatura: ____________________</div>
                </div>
                <div className="print-sign-box">
                  <div><strong>{fechamentoLabel.actorLabel}:</strong> {fechamentoLabel.actorName}</div>
                  <div><strong>Data:</strong> {formatDate(fechamentoLabel.actorDate)}</div>
                  <div style={{ marginTop: '24px' }}>Assinatura: ____________________</div>
                </div>
              </div>
            <div className="print-aviso">
              <div style={{ fontWeight: 700, marginBottom: '4px', color: '#92400e' }}>Aviso</div>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#78350f' }}>
                <li>Comunique imediatamente qualquer avaria ao setor responsável (Logístico/Gestão de Materiais).</li>
                <li>Não descarte ou repare o item sem autorização prévia.</li>
                <li>Documente o dano com fotos e relatório detalhado (causa, data, condições de recebimento).</li>
                <li>Siga os procedimentos internos para não conformidades.</li>
              </ol>
              <div style={{ marginTop: '6px', fontWeight: 700, color: '#92400e' }}>
                O não cumprimento poderá resultar em responsabilização por reparo ou substituições.
              </div>
            </div>

            </div>
          </section>
        ))}
      </div>
    </>
  );
}
