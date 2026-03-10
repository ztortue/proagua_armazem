'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';

interface Pedido {
  id: number;
  reference?: string;
  statut: string;
  date_demande: string;
  demandeur: { first_name: string; last_name: string; username?: string };
  demandeur_reel?: { id: number; nom: string; prenom: string; entreprise: string; fonction: string } | null;
  projet?: { nom: string; pilier?: string } | string | null;
  items: Array<{ 
    id: number; 
    materiel_code: string;
    materiel_description: string;
    entrepot_pilier?: string | null;
    quantite_demandee: number;
    quantite_approuvee: number;
    quantite_entregue?: number;
    data_necessaria?: string | null;
  }>;
  raison_refus: string;
  description?: string;
  updated_at?: string;
  created_by_nome?: string;
  updated_by_nome?: string;
  formulario?: {
    id: number;
    tipo_fluxo: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
    prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
    motivo: string;
    destino_uso: string;
    observacoes: string;
  } | null;
}

type StockLocation = {
  id: number;
  entrepot: string;
  entrepot_id_value?: number;
  quantite: number;
  emplacement?: { adresse_complete?: string } | null;
};

type Materiel = {
  id: number;
  code: string;
  description: string;
  stock_locations: StockLocation[];
};

type Entrepot = {
  id: number;
  nom: string;
};

type CreatePedidoItem = {
  materiel_id: number;
  entrepot_id: number;
  quantite_demandee: number;
  materiel_code: string;
  materiel_description: string;
  entrepot_nome: string;
};

function PedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pilierParam = searchParams.get('pilier');
  const refParam = searchParams.get('ref');
  const extractApiError = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.items) && data.items.length > 0) return String(data.items[0]);
    if (typeof data.items === 'string') return data.items;
    if (Array.isArray(data.entrepot) && data.entrepot.length > 0) return String(data.entrepot[0]);
    if (typeof data.entrepot === 'string') return data.entrepot;
    const firstKey = Object.keys(data)[0];
    const firstValue = firstKey ? data[firstKey] : null;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
    return JSON.stringify(data);
  };

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [configReady, setConfigReady] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'single' | 'range'>('single');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportPedidoId, setExportPedidoId] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [materiais, setMateriais] = useState<Materiel[]>([]);
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<any[]>([]);
  const [selectedMaterielId, setSelectedMaterielId] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedEntrepotId, setSelectedEntrepotId] = useState('');
  const [selectedTransferDestinoId, setSelectedTransferDestinoId] = useState('');
  const [createItems, setCreateItems] = useState<CreatePedidoItem[]>([]);
  const [selectedDemandeurReelId, setSelectedDemandeurReelId] = useState('');
  const [selectedTipoFluxo, setSelectedTipoFluxo] = useState<'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO'>('INSTALACAO');
  const [dataRetornoPrevista, setDataRetornoPrevista] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryPedido, setDeliveryPedido] = useState<Pedido | null>(null);
  const [deliveryEntrepotDestinoId, setDeliveryEntrepotDestinoId] = useState('');
  const [deliveryCreateStock, setDeliveryCreateStock] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [meRole, setMeRole] = useState<string>('');
  const [refLookupMessage, setRefLookupMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refLookupDone, setRefLookupDone] = useState(false);
  const RECEBIMENTO_PENDENTE_FILTER = '__RECEBIMENTO_PENDENTE__';

  const resetCreateForm = () => {
    setSelectedMaterielId('');
    setMaterialSearch('');
    setQuantidade('');
    setDescricao('');
    setSelectedEntrepotId('');
    setSelectedTransferDestinoId('');
    setSelectedDemandeurReelId('');
    setSelectedTipoFluxo('INSTALACAO');
    setDataRetornoPrevista('');
    setCreateItems([]);
    setCreateError(null);
  };

  useEffect(() => {
    loadMe();
    loadConfig();
    loadMateriais();
    loadEntrepots();
    loadUtilisateursFinal();
  }, []);

  useEffect(() => {
    if (searchParams.get('focus') === 'recebimento-pendente') {
      setFilterStatut(RECEBIMENTO_PENDENTE_FILTER);
    }
  }, [searchParams]);

  useEffect(() => {
    setRefLookupDone(false);
    setRefLookupMessage(null);
  }, [refParam]);

  useEffect(() => {
    if (!configReady || !refParam || refLookupDone) return;
    const run = async () => {
      const targetRef = String(refParam).trim().toUpperCase();
      if (!targetRef) {
        setRefLookupDone(true);
        return;
      }

      // Try current page first.
      const foundLocal = pedidos.find((p) => String(p.reference || '').toUpperCase() === targetRef);
      if (foundLocal) {
        setSelectedPedido(foundLocal);
        setDetailModalOpen(true);
        setRefLookupMessage(null);
        setRefLookupDone(true);
        return;
      }

      try {
        let pageNum = 1;
        let found: Pedido | null = null;
        let foundPage = 1;
        let hasNext = true;

        while (hasNext) {
          const res = await api.get(`/pedidos/?page=${pageNum}`);
          const data = res.data;
          const list = data.results || data;
          found = (Array.isArray(list) ? list : []).find(
            (p: Pedido) => String(p.reference || '').toUpperCase() === targetRef
          ) || null;
          if (found) {
            foundPage = pageNum;
            break;
          }
          hasNext = !!data.next;
          pageNum += 1;
        }

        if (found) {
          setPage(foundPage);
          setSelectedPedido(found);
          setDetailModalOpen(true);
          setRefLookupMessage(null);
        } else {
          setRefLookupMessage(`Referencia ${targetRef} não encontrada em Operações.`);
        }
      } catch (err) {
        console.error('Erro ao localizar referencia na lista de operações:', err);
        setRefLookupMessage('Não foi possível localizar a referencia solicitada.');
      } finally {
        setRefLookupDone(true);
      }
    };
    run();
  }, [configReady, refParam, refLookupDone, pedidos]);

  useEffect(() => {
    if (!configReady) return;
    loadPedidos(page);
  }, [page, configReady]);

  const loadConfig = async () => {
    try {
      const res = await api.get('/config/');
      const configuredPageSize = Number(res.data?.page_size);
      if (Number.isFinite(configuredPageSize) && configuredPageSize > 0) {
        setPageSize(configuredPageSize);
      }
    } catch (err) {
      console.error('Erro ao carregar configuracoes:', err);
    } finally {
      setConfigReady(true);
    }
  };

  const loadPedidos = async (pageNum: number) => {
    try {
      setLoadError(null);
      const res = await api.get(`/pedidos/?page=${pageNum}`);
      const data = res.data;
      const list = data.results || data;
      setPedidos(list);
      if (data.count !== undefined) {
        setTotalCount(data.count);
        setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)));
      } else {
        setTotalCount(Array.isArray(list) ? list.length : 0);
        setTotalPages(1);
      }
    } catch (err: any) {
      const detail = extractApiError(err?.response?.data) || 'Erro ao carregar operacoes.';
      setLoadError(detail);
      setPedidos([]);
      setTotalCount(0);
      setTotalPages(1);
      console.error('Erro ao carregar pedidos:', detail, err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const loadMateriais = async () => {
    try {
      const all: Materiel[] = [];
      let nextPath: string | null = '/materiais/?page=1';
      while (nextPath) {
        const res: { data: any } = await api.get(nextPath);
        const data: any = res.data;
        const rows: Materiel[] = Array.isArray(data) ? data : (data.results || []);
        all.push(...rows);
        const nextRaw: string | null = Array.isArray(data) ? null : (data.next ?? null);
        nextPath = nextRaw;
      }
      setMateriais(all);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
    }
  };

  const loadEntrepots = async () => {
    try {
      const res = await api.get('/entrepots/');
      setEntrepots(res.data.results || res.data);
    } catch (err) {
      console.error('Erro ao carregar depositos:', err);
    }
  };

  const loadUtilisateursFinal = async () => {
    try {
      const res = await api.get('/utilisateurs-final/');
      setUtilisateursFinal(res.data.results || res.data);
    } catch (err) {
      console.error('Erro ao carregar demandantes:', err);
    }
  };



  const handleValider = async (id: number) => {
    if (!confirm('Tem certeza que deseje validar este operaçãoe Ele passara para "Pendente".')) return;

    try {
      await api.post(`/pedidos/${id}/valider/`);
      alert('Operação validada com sucesso!');
      loadPedidos(page);
    } catch (err: any) {
      console.error('Erro completo:', err);
      alert('Erro: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erro desconhecido'));
    }
  };

  const handleApprouver = async (id: number) => {
    if (!confirm('Aprovar este operaçãoe O STOCK SERA MODIFICADO imediatamente!')) return;

    try {
      const res = await api.post(`/pedidos/${id}/approuver/`);
      alert(res.data.detail || 'Operação aprovada! Stock atualizado.');
      loadPedidos(page);
    } catch (err: any) {
      console.error('Erro completo:', err);
      const errorMsg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erro desconhecido';
      alert('Erro ao aprovar: ' + errorMsg);
    }
  };

  const handleRefuser = async (id: number) => {
    const raison = prompt('Motivo da recusa:');
    if (!raison) return;

    try {
      await api.post(`/pedidos/${id}/refuser/`, { raison_refus: raison });
      alert('Pedido recusado.');
      loadPedidos(page);
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const handleLivrer = async (
    id: number,
    payload?: { entrepot_destino_id?: number; allow_create_stock?: boolean },
    skipConfirm = false
  ): Promise<boolean> => {
    if (!skipConfirm && !confirm('Confirmar que os materiais foram entreguesó')) {
      return false;
    }

    try {
      const res = await api.post(`/pedidos/${id}/livrer/`, payload || {});
      alert(res.data.detail || 'Materiais marcados como entregues.');
      loadPedidos(page);
      return true;
    } catch (err: any) {
      alert('Erro: ' + (extractApiError(err.response?.data) || 'Erro desconhecido'));
      return false;
    }
  };

  const openComprasDeliveryModal = (pedido: Pedido) => {
    setDeliveryPedido(pedido);
    setDeliveryEntrepotDestinoId('');
    setDeliveryCreateStock(false);
    setDeliveryError(null);
    setDeliveryModalOpen(true);
  };

  const handleConfirmComprasDelivery = async () => {
    if (!deliveryPedido) return;
    if (!deliveryEntrepotDestinoId) {
      setDeliveryError('Selecione o deposito de recebimento.');
      return;
    }

    setDeliveryLoading(true);
    setDeliveryError(null);
    const ok = await handleLivrer(
      deliveryPedido.id,
      {
        entrepot_destino_id: Number(deliveryEntrepotDestinoId),
        allow_create_stock: deliveryCreateStock,
      },
      true
    );
    setDeliveryLoading(false);
    if (ok) {
      setDeliveryModalOpen(false);
      setDeliveryPedido(null);
      setDeliveryEntrepotDestinoId('');
      setDeliveryCreateStock(false);
    } else {
      setDeliveryError('Não foi possível concluir o recebimento. Verifique os dados e tente novamente.');
    }
  };

  const handleCreatePedido = async () => {
    setCreateError(null);

    if (!selectedDemandeurReelId) {
      setCreateError('Selecione o demandante real.');
      return;
    }

    if (createItems.length === 0) {
      setCreateError('Adicione pelo menos um material ao pedido.');
      return;
    }

    if (selectedTipoFluxo === 'EMPRESTIMO' && !dataRetornoPrevista) {
      setCreateError('Informe a data/hora prevista de retorno para empréstimo.');
      return;
    }
    if (selectedTipoFluxo === 'TRANSFERENCIA') {
      if (!selectedTransferDestinoId) {
        setCreateError('Selecione o deposito de destino para transferência.');
        return;
      }
      if (createItems.length > 0) {
        const origemId = createItems[0].entrepot_id;
        if (origemId === Number(selectedTransferDestinoId)) {
          setCreateError('Origem e destino não podem ser iguais na transferência.');
          return;
        }
      }
    }

    setCreateLoading(true);
    try {
      await api.post('/pedidos/', {
        description: descricao,
        demandeur_reel_id: Number(selectedDemandeurReelId),
        tipo_fluxo: selectedTipoFluxo,
        data_retorno_prevista:
          selectedTipoFluxo === 'EMPRESTIMO' && dataRetornoPrevista
            ? new Date(dataRetornoPrevista).toISOString()
            : null,
        entrepot_destino_id:
          selectedTipoFluxo === 'TRANSFERENCIA' && selectedTransferDestinoId
            ? Number(selectedTransferDestinoId)
            : null,
        items: createItems.map((item) => ({
          materiel_id: item.materiel_id,
          entrepot_id: item.entrepot_id,
          quantite_demandee: item.quantite_demandee,
        })),
      });
      setCreateModalOpen(false);
      resetCreateForm();
      loadPedidos(page);
    } catch (err: any) {
      const data = err.response?.data;
      const message = extractApiError(data) || 'Erro ao criar pedido.';
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddPedidoItem = () => {
    setCreateError(null);
    if (!selectedMaterielId || !selectedEntrepotId || !quantidade) {
      setCreateError('Selecione material, deposito e quantidade antes de adicionar.');
      return;
    }

    const material = materiais.find((m) => m.id === Number(selectedMaterielId));
    if (!material) {
      setCreateError('Material invalido.');
      return;
    }

    const qty = Number(quantidade);
    if (!Number.isFinite(qty) || qty <= 0) {
      setCreateError('Quantidade invelida.');
      return;
    }

    if (createItems.some((i) => i.materiel_id === material.id)) {
      setCreateError('Este material je foi adicionado. Não é permitido duplicar o mesmo material no pedido.');
      return;
    }
    if (selectedTipoFluxo === 'TRANSFERENCIA') {
      if (selectedTransferDestinoId && Number(selectedTransferDestinoId) === Number(selectedEntrepotId)) {
        setCreateError('Origem e destino não podem ser iguais na transferência.');
        return;
      }
      if (createItems.length > 0 && createItems[0].entrepot_id !== Number(selectedEntrepotId)) {
        setCreateError('Na transferência, todos os itens devem sair do mesmo deposito de origem.');
        return;
      }
    }

    const location = (material.stock_locations || []).find(
      (loc) => String(loc.entrepot_id_value || loc.id) === selectedEntrepotId
    );
    if (!location) {
      setCreateError('Deposito invalido para o material selecionado.');
      return;
    }

    setCreateItems((prev) => [
      ...prev,
      {
        materiel_id: material.id,
        entrepot_id: Number(selectedEntrepotId),
        quantite_demandee: qty,
        materiel_code: material.code,
        materiel_description: material.description,
        entrepot_nome: location.entrepot,
      },
    ]);

    setSelectedMaterielId('');
    setSelectedEntrepotId('');
    setQuantidade('');
  };

  const openDetails = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setDetailModalOpen(true);
  };

  const formatProjeto = (projet: Pedido['projet'], items: Pedido['items']) => {
    if (items && items.length > 0) {
      const pilier = items.find((item) => item.entrepot_pilier)?.entrepot_pilier;
      if (pilier) return pilier;
    }
    if (!projet) return '-';
    if (typeof projet === 'string') return projet;
    return projet.pilier ? `${projet.nom} (${projet.pilier})` : projet.nom || '-';
  };

  const formatDemandeurReel = (demandeur: Pedido['demandeur_reel']) => {
    if (!demandeur) return '-';
    return demandeur.entreprise || '-';
  };

  const formatSolicitanteNomeCompleto = (demandeur: Pedido['demandeur']) =>
    `${demandeur?.first_name || ''} ${demandeur?.last_name || ''}`.trim() || demandeur?.username?.trim() || '-';

  const formatSolicitanteUsername = (demandeur: Pedido['demandeur']) =>
    demandeur?.username?.trim() || formatSolicitanteNomeCompleto(demandeur);

  const formatJustificativa = (description?: string | null) => {
    const raw = String(description || '').trim();
    if (!raw) return '-';
    // Hide technical origin tokens from UI/print.
    const cleaned = raw.replace(/\[(ORIGEM_[^\]]+)\]/g, '').replace(/\s{2,}/g, ' ').trim();
    return cleaned || '-';
  };

  const getOrigemTipoFromDescription = (description?: string | null): string => {
    const raw = String(description || '');
    const match = raw.match(/\[ORIGEM_TIPO:([^\]]+)\]/i);
    return (match?.[1] || '').trim().toUpperCase();
  };

  const isFormularioSaidaFlow = (pedido: Pedido): boolean => {
    const tipo = (pedido.formulario?.tipo_fluxo || '').toUpperCase();
    if (['INSTALACAO', 'TRANSFERENCIA', 'EMPRESTIMO'].includes(tipo)) return true;
    if (tipo === 'DEVOLUCAO') {
      const origemTipo = getOrigemTipoFromDescription(pedido.description);
      return ['COMPRAS', 'ENTRADA'].includes(origemTipo);
    }
    return false;
  };

  const isFormularioRecebimentoFlow = (pedido: Pedido): boolean => {
    const tipo = (pedido.formulario?.tipo_fluxo || '').toUpperCase();
    if (['COMPRAS', 'ENTRADA'].includes(tipo)) return true;
    if (tipo === 'DEVOLUCAO') {
      const origemTipo = getOrigemTipoFromDescription(pedido.description);
      return ['SAIDA', 'TRANSFERENCIA', 'EMPRESTIMO'].includes(origemTipo);
    }
    return false;
  };

  const getFormularioHref = (pedido: Pedido): string => {
    if (isFormularioRecebimentoFlow(pedido)) {
      return `/dashboard/pedidos/${pedido.id}/recebimento`;
    }
    return `/dashboard/pedidos/${pedido.id}/formulario`;
  };

  const isRecebimentoFechado = (pedido: Pedido): boolean => {
    const fluxo = (pedido.formulario?.tipo_fluxo || '').toUpperCase();
    return ['COMPRAS', 'ENTRADA'].includes(fluxo) && pedido.statut === 'RECEBIDA';
  };

  const isFormularioSaidaFechado = (pedido: Pedido): boolean => {
    if (!isFormularioSaidaFlow(pedido)) return false;
    if (!['ENTREGUE', 'RECEBIDA'].includes(pedido.statut)) return false;
    const items = pedido.items || [];
    if (items.length === 0) return false;
    return items.every((it) => Boolean(it.data_necessaria));
  };

  const loadMe = async () => {
    try {
      const res = await api.get('/me/');
      setMeRole(String(res.data?.role || '').toUpperCase());
    } catch (err) {
      console.error('Erro ao carregar usuario atual:', err);
      setMeRole('');
    }
  };

  const getFluxoPrefix = (
    tipoFluxo: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO'
  ) => {
    if (tipoFluxo === 'COMPRAS') return 'COM';
    if (tipoFluxo === 'ENTRADA') return 'ENT';
    if (tipoFluxo === 'TRANSFERENCIA') return 'TRA';
    if (tipoFluxo === 'EMPRESTIMO') return 'EMP';
    if (tipoFluxo === 'DEVOLUCAO') return 'DEV';
    return 'SAI';
  };

  const isRecebimentoPendente = (pedido: Pedido) =>
    pedido.formulario?.tipo_fluxo === 'COMPRAS' &&
    pedido.statut === 'ENTREGUE' &&
    (pedido.items || []).some((item) => {
      const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
      const qtdEntregue = item.quantite_entregue || 0;
      return qtdEntregue < qtdBase;
    });

  const getPedidoStatusLabel = (pedido: Pick<Pedido, 'statut' | 'formulario'>) => {
    const fluxo = pedido.formulario?.tipo_fluxo;
    if (pedido.statut === 'BROUILLON') return 'Rascunho';
    if (pedido.statut === 'EN_ATTENTE') return 'Pendente';
    if (pedido.statut === 'APPROUVEE') return 'Aprovado';
    if (pedido.statut === 'ENTREGUE') return fluxo === 'ENTRADA' ? 'Recebida' : 'Entregue';
    if (pedido.statut === 'RECEBIDA') return 'Recebida';
    return 'Recusado';
  };

  const filteredPedidos = useMemo(() => {
    if (!filterStatut) return pedidos;
    if (filterStatut === RECEBIMENTO_PENDENTE_FILTER) {
      return pedidos.filter(isRecebimentoPendente);
    }
    return pedidos.filter((p) => p.statut === filterStatut);
  }, [pedidos, filterStatut]);

  const pendingPedidosCount = useMemo(
    () => pedidos.filter((p) => p.statut === 'EN_ATTENTE').length,
    [pedidos]
  );
  const pendingRecebimentoCount = useMemo(
    () => pedidos.filter((p) => isRecebimentoPendente(p)).length,
    [pedidos]
  );

  const filteredMateriais = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    const list = term
      ? materiais.filter((m) => `${m.code} ${m.description}`.toLowerCase().includes(term))
      : materiais;
    return list.slice(0, 120);
  }, [materiais, materialSearch]);

  const buildPedidoRows = (list: Pedido[]) => {
    const rows = [
      [
        'Referencia',
        'Pedido ID',
        'Data',
        'Status',
        'Solicitante',
        'Material',
        'Descricao',
        'Qtd Pedida',
        'Qtd Aprovada',
      ],
    ];

    list.forEach((pedido) => {
      const solicitante = formatSolicitanteNomeCompleto(pedido.demandeur);
      pedido.items.forEach((item) => {
        rows.push([
          pedido.reference || '',
          `#${pedido.id}`,
          new Date(pedido.date_demande).toLocaleDateString('pt-BR'),
          pedido.statut,
          solicitante,
          item.materiel_code,
          item.materiel_description,
          String(item.quantite_demandee),
          String(item.quantite_approuvee || item.quantite_demandee || 0),
        ]);
      });
    });

    return rows;
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printPdf = (title: string, rows: string[][]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const head = rows[0];
    const body = rows.slice(1);
    const tableHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${body
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>
    `;

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>body{font-family:Arial, sans-serif; padding:16px;} h1{font-size:18px;}</style>
        </head>
        <body>
          <h1>${title}</h1>
          ${tableHtml}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleExport = () => {
    let list: Pedido[] = [];

    if (exportMode === 'single') {
      const pedido = pedidos.find((p) => String(p.id) === exportPedidoId);
      if (!pedido) {
        alert('Selecione uma operação.');
        return;
      }
      list = [pedido];
    } else {
      if (!exportStartDate || !exportEndDate) {
        alert('Informe a operação.');
        return;
      }
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      end.setHours(23, 59, 59, 999);
      list = pedidos.filter((p) => {
        const d = new Date(p.date_demande);
        return d >= start && d <= end;
      });
    }

    const rows = buildPedidoRows(list);
    const suffix = exportMode === 'single' ? 'pedido' : 'pedidos';
    const filename = `anexo3_${suffix}.csv`;
    const title = exportMode === 'single' ? 'Anexo 3 - Pedido' : 'Anexo 3 - Pedidos';

    if (exportFormat === 'csv') {
      downloadCsv(filename, rows);
    } else {
      printPdf(title, rows);
    }

    setExportModalOpen(false);
  };

  const handlePrintPedidoDetails = () => {
    if (!selectedPedido) return;

    const win = window.open('', '_blank');
    if (!win) return;

    const statusLabel = getPedidoStatusLabel(selectedPedido);

    const itemRows = selectedPedido.items
      .map((item) => `
        <tr>
          <td>${item.materiel_code}</td>
          <td>${item.materiel_description}</td>
          <td>${item.quantite_demandee}</td>
          <td>${item.quantite_approuvee || item.quantite_demandee || '-'}</td>
        </tr>
      `)
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>Detalhes da Operação</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            h1 { margin: 0 0 12px; font-size: 20px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 16px; }
            .meta div { font-size: 14px; }
            table { border-collapse: collapse; width: 100%; margin-top: 8px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Detalhes da Operação ${selectedPedido.reference || `#${selectedPedido.id}`}</h1>
          <div class="meta">
            <div><strong>ID:</strong> #${selectedPedido.id}</div>
            <div><strong>Referencia:</strong> ${selectedPedido.reference || '-'}</div>
            <div><strong>Data:</strong> ${new Date(selectedPedido.date_demande).toLocaleString('pt-BR')}</div>
            <div><strong>Solicitante:</strong> ${formatSolicitanteNomeCompleto(selectedPedido.demandeur)}</div>
            <div><strong>Projeto:</strong> ${formatProjeto(selectedPedido.projet, selectedPedido.items)}</div>
            <div><strong>Status:</strong> ${statusLabel}</div>
            <div style="grid-column: 1 / -1;"><strong>Motivo recusa:</strong> ${selectedPedido.statut === 'REFUSEE' ? (selectedPedido.raison_refus || '-') : '-'}</div>
            <div style="grid-column: 1 / -1;"><strong>Justificativa:</strong> ${formatJustificativa(selectedPedido.description)}</div>
          </div>
          <h2 style="font-size:16px;margin:10px 0 6px;">Materiais da Operação</h2>
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Descricao</th>
                <th>Qtd Pedida</th>
                <th>Qtd Aprovada</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Operações de Materiais</h1>
          <div className="flex items-center gap-3">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">
              {`Pagina ${page} / ${totalPages} - Total ${totalCount}`}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próxima
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExportModalOpen(true)}
            className="btn btn-outline btn-primary"
          >
            Exportar
          </button>
          <Link
            href={pilierParam ? `/dashboard/materiais?pilier=${pilierParam}` : '/dashboard/materiais'}
            className="rounded-xl border border-orange-300 bg-orange-100 px-5 py-3 text-sm font-semibold text-orange-800 transition hover:bg-orange-200"
          >
            Materiais
          </Link>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Total de Operações</div>
              <div className="stat-value text-primary">{totalCount}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Operações Pendentes (PP-RR)</div>
              <div className="stat-value text-warning">
                {`${pendingPedidosCount}-${pendingRecebimentoCount}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-lg">
        {loadError && (
          <div className="alert alert-error m-4">
            <span>{loadError}</span>
          </div>
        )}
        {refLookupMessage && (
          <div className="alert alert-warning m-4">
            <span>{refLookupMessage}</span>
          </div>
        )}
        <div className="p-4 border-b border-base-300 flex items-center gap-3">
          <label className="text-sm font-medium">Filtrar por status:</label>
          <select
            className="select select-bordered select-sm w-56"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="BROUILLON">Rascunho</option>
            <option value="EN_ATTENTE">Pendente</option>
            <option value="APPROUVEE">Aprovado</option>
            <option value="ENTREGUE">Entregue/Recebida</option>
            <option value="RECEBIDA">Recebida</option>
            <option value="REFUSEE">Recusado</option>
            <option value={RECEBIMENTO_PENDENTE_FILTER}>Recebimento pendente</option>
          </select>
        </div>
        <table className="table table-zebra">
          <thead className="bg-base-200">
            <tr>
              <th>Referência</th>
              <th>Data</th>
              <th>Solicitante</th>
              <th>Projeto</th>
              <th>Status</th>
              <th>Motivo Recusa</th>
              <th>Itens</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredPedidos.map(p => (
              <tr key={p.id} className="hover">
                <td>
                  <button
                    onClick={() => openDetails(p)}
                    className="link link-primary font-semibold"
                    title="Ver detalhes da operação"
                  >
                    {p.reference || `#${p.id}`}
                  </button>
                </td>
                <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                <td>{formatSolicitanteUsername(p.demandeur)}</td>
                <td>{formatProjeto(p.projet, p.items)}</td>
                <td>
                  <div className="flex flex-col gap-1">
                    <span className={`badge badge-lg ${
                      p.statut === 'BROUILLON' ? 'badge-ghost' :
                      p.statut === 'EN_ATTENTE' ? 'badge-warning' :
                      p.statut === 'APPROUVEE' ? 'badge-info' :
                      p.statut === 'ENTREGUE' ? 'badge-success' :
                      p.statut === 'RECEBIDA' ? 'badge-primary' :
                      'badge-error'
                    }`}>
                      {getPedidoStatusLabel(p)}
                    </span>
                    {isRecebimentoPendente(p) && (
                      <span className="inline-flex w-fit items-center rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-content">
                        Receb. pendente
                      </span>
                    )}
                  </div>
                </td>
                <td>{p.statut === 'REFUSEE' ? (p.raison_refus || '-') : '-'}</td>
                <td>
                  <button 
                    onClick={() => openDetails(p)}
                    className="btn btn-primary btn-sm normal-case whitespace-nowrap min-w-[96px] leading-none"
                  >
                    {p.items.length} item(s)
                  </button>
                </td>
                <td>
                  <div className="flex gap-2">
                    {/* BROUILLON -> Validar */}
                    {p.statut === 'BROUILLON' && (
                      <button 
                        onClick={() => handleValider(p.id)} 
                        className="btn btn-success btn-sm"
                        title="Validar pedido"
                      >
                        Validar
                      </button>
                    )}

                    {/* EN_ATTENTE -> Aprovar / Recusar (sauf INSTALACAO et ENTRADA — D1) */}
                    {p.statut === 'EN_ATTENTE' &&
                      !['INSTALACAO', 'ENTRADA', 'TRANSFERENCIA'].includes(p.formulario?.tipo_fluxo || '') &&
                      (p.formulario?.tipo_fluxo !== 'COMPRAS' || ['MANAGER', 'ADMIN'].includes(meRole)) && (
                      <>
                        <button
                          onClick={() => handleApprouver(p.id)}
                          className="btn btn-success btn-sm"
                          title="Aprovar é diminuir stock"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleRefuser(p.id)}
                          className="btn btn-error btn-sm"
                          title="Recusar pedido"
                        >
                          Recusar
                        </button>
                      </>
                    )}

                    {/* EN_ATTENTE + INSTALACAO/ENTRADA -> Entregar diretamente (D1) */}
                    {p.statut === 'EN_ATTENTE' && ['INSTALACAO', 'ENTRADA', 'TRANSFERENCIA'].includes(p.formulario?.tipo_fluxo || '') && (
                      <button
                        onClick={() => handleLivrer(p.id)}
                        className="btn btn-info btn-sm"
                        title="Entregar diretamente (sem aprovação)"
                      >
                        {p.formulario?.tipo_fluxo === 'ENTRADA' ? 'Receber' : 'Entregar'}
                      </button>
                    )}

                    {/* APPROUVEE -> Entregar */}
                    {p.statut === 'APPROUVEE' && (
                      <button 
                        onClick={() =>
                          p.formulario?.tipo_fluxo === 'COMPRAS'
                            ? openComprasDeliveryModal(p)
                            : handleLivrer(p.id)
                        }
                        className="btn btn-info btn-sm"
                        title={(p.formulario?.tipo_fluxo === 'COMPRAS' || p.formulario?.tipo_fluxo === 'ENTRADA') ? 'Confirmar recebimento' : 'Marcar como entregue'}
                      >
                        {(p.formulario?.tipo_fluxo === 'COMPRAS' || p.formulario?.tipo_fluxo === 'ENTRADA') ? 'Receber' : 'Entregar'}
                      </button>
                    )}

                    {/* ENTREGUE / RECEBIDA / REFUSEE -> Apenas visualizar */}
                    {(p.statut === 'ENTREGUE' || p.statut === 'RECEBIDA' || p.statut === 'REFUSEE') && (
                      <>
                        <button
                          onClick={() => openDetails(p)}
                          className="btn btn-outline btn-sm"
                        >
                          Ver
                        </button>
                        {(p.statut === 'ENTREGUE') &&
                          isFormularioRecebimentoFlow(p) &&
                          !isFormularioSaidaFlow(p) && (
                          <Link href={`/dashboard/pedidos/${p.id}/recebimento`} className="btn btn-accent btn-sm">
                            Recebimento
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPedidos.length === 0 && (
        <div className="text-center text-xl text-gray-500 mt-10">
          Nenhuma operação encontrada
        </div>
      )}

      {/* MODAL NOVO PEDIDO (desativado: criacao centralizada em /dashboard/materiais) */}
      {false && createModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-2xl mb-4">Nova Requisição</h3>

            <div className="space-y-4">
              <select
                className="select select-bordered w-full"
                value={selectedTipoFluxo}
                onChange={(e) => {
                  const next = e.target.value as any;
                  setSelectedTipoFluxo(next);
                  if (next !== 'TRANSFERENCIA') {
                    setSelectedTransferDestinoId('');
                  }
                }}
              >
                <option value="INSTALACAO">Saida (Instalação)</option>
                <option value="EMPRESTIMO">Empréstimo</option>
                <option value="COMPRAS">Compras</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
              <div className="text-xs text-gray-500">
                Prefixo da referencia: <span className="font-semibold">{getFluxoPrefix(selectedTipoFluxo)}</span>
              </div>

              {selectedTipoFluxo === 'EMPRESTIMO' && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Data/hora prevista de retorno</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="input input-bordered w-full"
                    value={dataRetornoPrevista}
                    onChange={(e) => setDataRetornoPrevista(e.target.value)}
                  />
                </div>
              )}

              {selectedTipoFluxo === 'TRANSFERENCIA' && (
                <select
                  className="select select-bordered w-full"
                  value={selectedTransferDestinoId}
                  onChange={(e) => setSelectedTransferDestinoId(e.target.value)}
                >
                  <option value="">Selecione o deposito de destino</option>
                  {entrepots
                    .filter((e) => !selectedEntrepotId || String(e.id) !== selectedEntrepotId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nom}
                      </option>
                    ))}
                </select>
              )}

              <select
                className="select select-bordered w-full"
                value={selectedDemandeurReelId}
                onChange={(e) => setSelectedDemandeurReelId(e.target.value)}
              >
                <option value="">Demandante real</option>
                {utilisateursFinal.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.entreprise}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Pesquisar material por codigo ou descricao..."
                className="input input-bordered w-full"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
              />
              <select
                className="select select-bordered w-full"
                value={selectedMaterielId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMaterielId(value);
                  const material = materiais.find((m) => m.id === Number(value));
                  const locations = material?.stock_locations || [];
                  if (locations.length === 1 && locations[0].entrepot_id_value) {
                    setSelectedEntrepotId(String(locations[0].entrepot_id_value));
                  } else {
                    setSelectedEntrepotId('');
                  }
                }}
              >
                <option value="">Selecione o material</option>
                {filteredMateriais.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} - {m.description}
                  </option>
                ))}
              </select>

              <select
                className="select select-bordered w-full"
                value={selectedEntrepotId}
                onChange={(e) => setSelectedEntrepotId(e.target.value)}
                disabled={!selectedMaterielId}
              >
                <option value="">Selecione o deposito</option>
                {(materiais.find((m) => m.id === Number(selectedMaterielId))?.stock_locations || []).map((loc) => (
                  <option key={loc.id} value={loc.entrepot_id_value || loc.id}>
                    {loc.entrepot} (Qtd: {loc.quantite})
                  </option>
                ))}
              </select>
              {!selectedMaterielId && (
                <div className="text-sm text-gray-500">
                  Selecione o material primeiro para listar os depositos.
                </div>
              )}
              {selectedMaterielId &&
                (materiais.find((m) => m.id === Number(selectedMaterielId))?.stock_locations || []).length === 0 && (
                  <div className="text-sm text-warning">
                    Nenhum estoque encontrado para este material. Selecione outro material ou crie estoque.
                  </div>
                )}

              <input
                type="number"
                min="1"
                placeholder="Quantidade"
                className="input input-bordered w-full"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />

              <div className="flex justify-end">
                <button type="button" className="btn btn-outline btn-sm" onClick={handleAddPedidoItem}>
                  + Adicionar material
                </button>
              </div>

              {createItems.length > 0 && (
                <div className="bg-base-200 rounded-box p-4">
                  <div className="font-semibold mb-2">Materiais adicionados ({createItems.length})</div>
                  <div className="overflow-x-auto">
                    <table className="table table-zebra table-sm">
                      <thead>
                        <tr>
                          <th>Material</th>
                          <th>Deposito</th>
                          <th>Qtd</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {createItems.map((item) => (
                          <tr key={item.materiel_id}>
                            <td>{item.materiel_code} - {item.materiel_description}</td>
                            <td>{item.entrepot_nome}</td>
                            <td>{item.quantite_demandee}</td>
                            <td className="text-right">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => setCreateItems((prev) => prev.filter((i) => i.materiel_id !== item.materiel_id))}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <textarea
                placeholder="Descricao (opcional)"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />

              {selectedMaterielId && (
                <div className="bg-base-200 rounded-box p-4">
                  <div className="font-semibold mb-2">Deposito de origem do material</div>
                  <div className="space-y-1 text-sm">
                    {(materiais.find((m) => m.id === Number(selectedMaterielId))?.stock_locations || []).map((loc) => (
                      <div key={loc.id}>
                        {loc.entrepot} - Qtd: {loc.quantite}
                        {loc.emplacement?.adresse_complete ? ` (${loc.emplacement.adresse_complete})` : ''}
                      </div>
                    ))}
                    {(materiais.find((m) => m.id === Number(selectedMaterielId))?.stock_locations || []).length === 0 && (
                      <div>Nenhum estoque encontrado.</div>
                    )}
                  </div>
                </div>
              )}

              {createError && (
                <div className="alert alert-error">
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreatePedido}
                disabled={createLoading}
              >
                {createLoading ? 'Salvando...' : 'Criar Requisição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECEBIMENTO - COMPRAS */}
      {deliveryModalOpen && deliveryPedido && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h3 className="font-bold text-xl mb-4">
              Recebimento de Compras - Pedido {deliveryPedido.reference || `#${deliveryPedido.id}`}
            </h3>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Escolha o deposito que vai receber os materiais desta compra.
              </div>

              <select
                className="select select-bordered w-full"
                value={deliveryEntrepotDestinoId}
                onChange={(e) => setDeliveryEntrepotDestinoId(e.target.value)}
              >
                <option value="">Selecione o deposito de recebimento</option>
                {entrepots.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>

              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={deliveryCreateStock}
                  onChange={(e) => setDeliveryCreateStock(e.target.checked)}
                />
                <span className="label-text">
                  Se o material não existir neste deposito, criar estoque automaticamente
                </span>
              </label>

              {deliveryError && (
                <div className="alert alert-error">
                  <span>{deliveryError}</span>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDeliveryModalOpen(false);
                  setDeliveryPedido(null);
                  setDeliveryError(null);
                }}
                disabled={deliveryLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmComprasDelivery}
                disabled={deliveryLoading}
              >
                {deliveryLoading ? 'Processando...' : 'Confirmar recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXPORT */}
      {exportModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-2xl mb-4">Exportar</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Modo</span></label>
                <select
                  className="select select-bordered w-full"
                  value={exportMode}
                  onChange={(e) => setExportMode(e.target.value as 'single' | 'range')}
                >
                  <option value="single">Pedido unico</option>
                  <option value="range">Por periodo</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Formato</span></label>
                <select
                  className="select select-bordered w-full"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                >
                  <option value="csv">Excel (CSV)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              {exportMode === 'single' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Pedido</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={exportPedidoId}
                    onChange={(e) => setExportPedidoId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {pedidos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.reference || `#${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {exportMode === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label"><span className="label-text">Data inicio</span></label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Data fim</span></label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setExportModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleExport}>
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {detailModalOpen && selectedPedido && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-2xl mb-4">
              {`Detalhes da operação ${selectedPedido.reference || `#${selectedPedido.id}`}`}
            </h3>

            {/* Informações gerais */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <strong>ID:</strong> #{selectedPedido.id}
              </div>
              <div>
                <strong>Solicitante:</strong> {selectedPedido.demandeur.first_name} {selectedPedido.demandeur.last_name}
              </div>
              <div>
                <strong>Demandante real:</strong> {formatDemandeurReel(selectedPedido.demandeur_reel)}
              </div>
              <div>
                <strong>Referência:</strong> {selectedPedido.reference || '-'}
              </div>
              <div>
                <strong>Data:</strong> {new Date(selectedPedido.date_demande).toLocaleString('pt-BR')}
              </div>
              <div>
                <strong>Projeto:</strong> {formatProjeto(selectedPedido.projet, selectedPedido.items)}
              </div>
              <div>
                <strong>Status:</strong> 
                <span className={`badge ml-2 ${
                  selectedPedido.statut === 'BROUILLON' ? 'badge-ghost' :
                  selectedPedido.statut === 'EN_ATTENTE' ? 'badge-warning' :
                  selectedPedido.statut === 'APPROUVEE' ? 'badge-info' :
                  selectedPedido.statut === 'ENTREGUE' ? 'badge-success' :
                  selectedPedido.statut === 'RECEBIDA' ? 'badge-primary' :
                  'badge-error'
                }`}>
                  {getPedidoStatusLabel(selectedPedido)}
                </span>
              </div>
              <div className="col-span-2">
                <strong>Motivo Recusa:</strong> {selectedPedido.statut === 'REFUSEE' ? (selectedPedido.raison_refus || '-') : '-'}
              </div>
              <div className="col-span-2 text-sm opacity-70">
                <strong>Modificado por:</strong> {selectedPedido.updated_by_nome || '-'}{' '}
                <strong>em:</strong> {selectedPedido.updated_at ? new Date(selectedPedido.updated_at).toLocaleString('pt-BR') : '-'}
              </div>
            </div>

            {/* Description */}
            {selectedPedido.description && (
              <div className="mb-6">
                <strong>Justificativa:</strong>
                <p className="text-sm opacity-80 mt-1">{formatJustificativa(selectedPedido.description)}</p>
              </div>
            )}

            {/* Raison de refus */}
            {selectedPedido.raison_refus && (
              <div className="alert alert-error mb-6">
                <strong>Motivo da recusa:</strong>
                <p>{selectedPedido.raison_refus}</p>
              </div>
            )}

            {/* Items */}
            <div className="divider">Materiais Solicitados</div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Descricao</th>
                    <th>Qtd Pedida</th>
                    <th>Qtd Aprovada</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPedido.items.map(item => (
                    <tr key={item.id}>
                      <td className="font-bold">{item.materiel_code}</td>
                      <td>{item.materiel_description}</td>
                      <td>{item.quantite_demandee}</td>
                      <td>
                        <span className="badge badge-success">
                          {item.quantite_approuvee || item.quantite_demandee || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-action mt-6">
              <button
                className="btn btn-outline"
                onClick={() => router.push(getFormularioHref(selectedPedido))}
              >
                Imprimir
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => setDetailModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <PedidosContent />
    </Suspense>
  );
}


