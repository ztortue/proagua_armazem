'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

type Pedido = {
  id: number;
  reference?: string;
  statut: string;
  date_demande: string;
  description?: string;
  items: Array<{
    quantite_demandee: number;
    quantite_approuvee?: number;
    quantite_entregue?: number;
  }>;
  formulario?: {
    tipo_fluxo?: 'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA' | 'DEVOLUCAO';
  } | null;
};

type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

const cards = [
  {
    key: 'compras',
    title: 'Compras',
    description: 'Formulários para operações de compras.',
  },
  {
    key: 'saidas',
    title: 'Saídas',
    description: 'Formulários para operações de saída.',
  },
  {
    key: 'transferencias',
    title: 'Transferências',
    description: 'Formulários para operações de transferência.',
  },
  {
    key: 'entradas',
    title: 'Entradas',
    description: 'Formulários para operações de entrada.',
  },
  {
    key: 'empresto',
    title: 'Empréstimo',
    description: 'Formulários para operações de empréstimo.',
  },
  {
    key: 'devolucoes',
    title: 'Devoluções',
    description: 'Formulários para operações de devolução.',
  },
];

export default function FormulairesPage() {
  const [comprasModalOpen, setComprasModalOpen] = useState(false);
  const [comprasPedidos, setComprasPedidos] = useState<Pedido[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [comprasPage, setComprasPage] = useState(1);
  const [saidasModalOpen, setSaidasModalOpen] = useState(false);
  const [saidasPedidos, setSaidasPedidos] = useState<Pedido[]>([]);
  const [loadingSaidas, setLoadingSaidas] = useState(false);
  const [saidasPage, setSaidasPage] = useState(1);
  const [transferenciasModalOpen, setTransferenciasModalOpen] = useState(false);
  const [transferenciasPedidos, setTransferenciasPedidos] = useState<Pedido[]>([]);
  const [loadingTransferencias, setLoadingTransferencias] = useState(false);
  const [transferenciasPage, setTransferenciasPage] = useState(1);
  const [entradasModalOpen, setEntradasModalOpen] = useState(false);
  const [entradasPedidos, setEntradasPedidos] = useState<Pedido[]>([]);
  const [loadingEntradas, setLoadingEntradas] = useState(false);
  const [entradasPage, setEntradasPage] = useState(1);
  const [emprestoModalOpen, setEmprestoModalOpen] = useState(false);
  const [emprestoPedidos, setEmprestoPedidos] = useState<Pedido[]>([]);
  const [loadingEmpresto, setLoadingEmpresto] = useState(false);
  const [emprestoPage, setEmprestoPage] = useState(1);
  const [devolucoesModalOpen, setDevolucoesModalOpen] = useState(false);
  const [devolucoesPedidos, setDevolucoesPedidos] = useState<Pedido[]>([]);
  const [loadingDevolucoes, setLoadingDevolucoes] = useState(false);
  const [devolucoesPage, setDevolucoesPage] = useState(1);
  const saidasPageSize = 10;

  // Recebimento action is only needed while operation is still in ENTREGUE (open for receiving).
  const canOpenRecebimento = (p: Pedido) => p.statut === 'ENTREGUE';

  const getOrigemTipoFromDescription = (description?: string | null): string => {
    const raw = String(description || '');
    const match = raw.match(/\[ORIGEM_TIPO:([^\]]+)\]/i);
    return (match?.[1] || '').trim().toUpperCase();
  };

  const isFormularioRecebimentoFlow = (p: Pedido): boolean => {
    const tipo = (p.formulario?.tipo_fluxo || '').toUpperCase();
    if (['COMPRAS', 'ENTRADA'].includes(tipo)) return true;
    if (tipo === 'DEVOLUCAO') {
      const origemTipo = getOrigemTipoFromDescription(p.description);
      return ['SAIDA', 'TRANSFERENCIA', 'EMPRESTIMO'].includes(origemTipo);
    }
    return false;
  };

  const getFormularioHref = (p: Pedido): string =>
    isFormularioRecebimentoFlow(p)
      ? `/dashboard/pedidos/${p.id}/recebimento`
      : `/dashboard/pedidos/${p.id}/formulario`;

  const pendingRecebimentoCount = (p: Pedido) =>
    (p.items || []).reduce((acc, item) => {
      const qtdBase = item.quantite_approuvee || item.quantite_demandee || 0;
      const qtdRecebida = item.quantite_entregue || 0;
      return acc + Math.max(0, qtdBase - qtdRecebida);
    }, 0);

  const isRecebimentoPendente = (p: Pedido) =>
    p.formulario?.tipo_fluxo === 'COMPRAS' &&
    p.statut === 'ENTREGUE' &&
    pendingRecebimentoCount(p) > 0;

  const isRecebimentoPendenteEntrada = (p: Pedido) =>
    p.formulario?.tipo_fluxo === 'ENTRADA' &&
    p.statut === 'ENTREGUE' &&
    pendingRecebimentoCount(p) > 0;

  const sortByDateDesc = (list: Pedido[]) =>
    [...list].sort((a, b) => new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime());

  const statusLabel = (p: Pedido) => {
    const s = p.statut;
    const fluxo = p.formulario?.tipo_fluxo;
    if (s === 'BROUILLON') return 'Rascunho';
    if (s === 'EN_ATTENTE') return 'Pendente';
    if (s === 'APPROUVEE') return 'Aprovada';
    if (s === 'ENTREGUE') return fluxo === 'ENTRADA' ? 'Recebida' : 'Entregue';
    if (s === 'RECEBIDA') return 'Recebida';
    if (s === 'REFUSEE') return 'Recusada';
    return s;
  };

  const fetchAllPedidos = async (): Promise<Pedido[]> => {
    const collected: Pedido[] = [];
    let nextPath: string | null = '/pedidos/?page=1';
    while (nextPath) {
      const res: { data: Pedido[] | PaginatedResponse<Pedido> } = await api.get(nextPath);
      const data: Pedido[] | PaginatedResponse<Pedido> = res.data;
      const rows: Pedido[] = Array.isArray(data) ? data : data.results || [];
      collected.push(...rows);
      nextPath = Array.isArray(data) ? null : data.next || null;
    }
    return collected;
  };

  const openComprasFormularios = async () => {
    setComprasModalOpen(true);
    setLoadingCompras(true);
    setComprasPage(1);
    try {
      const collected = await fetchAllPedidos();
      const compras = collected
        .filter((p) => p.formulario?.tipo_fluxo === 'COMPRAS')
        .sort((a, b) => {
          const pa = isRecebimentoPendente(a) ? 1 : 0;
          const pb = isRecebimentoPendente(b) ? 1 : 0;
          if (pa !== pb) return pb - pa;
          return new Date(b.date_demande).getTime() - new Date(a.date_demande).getTime();
        });
      setComprasPedidos(compras);
    } catch (error) {
      console.error('Erro ao carregar formulários de compras:', error);
      setComprasPedidos([]);
    } finally {
      setLoadingCompras(false);
    }
  };

  const openSaidasFormularios = async () => {
    setSaidasModalOpen(true);
    setLoadingSaidas(true);
    setSaidasPage(1);
    try {
      const collected = await fetchAllPedidos();
      const saidas = sortByDateDesc(collected.filter((p) => p.formulario?.tipo_fluxo === 'INSTALACAO'));
      setSaidasPedidos(saidas);
    } catch (error) {
      console.error('Erro ao carregar formulários de saida:', error);
      setSaidasPedidos([]);
    } finally {
      setLoadingSaidas(false);
    }
  };

  const openTransferenciasFormularios = async () => {
    setTransferenciasModalOpen(true);
    setLoadingTransferencias(true);
    setTransferenciasPage(1);
    try {
      const collected = await fetchAllPedidos();
      const transferencias = sortByDateDesc(collected.filter((p) => p.formulario?.tipo_fluxo === 'TRANSFERENCIA'));
      setTransferenciasPedidos(transferencias);
    } catch (error) {
      console.error('Erro ao carregar formulários de transferencia:', error);
      setTransferenciasPedidos([]);
    } finally {
      setLoadingTransferencias(false);
    }
  };

  const openEntradasFormularios = async () => {
    setEntradasModalOpen(true);
    setLoadingEntradas(true);
    setEntradasPage(1);
    try {
      const collected = await fetchAllPedidos();
      const entradas = sortByDateDesc(collected.filter((p) => p.formulario?.tipo_fluxo === 'ENTRADA'));
      setEntradasPedidos(entradas);
    } catch (error) {
      console.error('Erro ao carregar formulários de entrada:', error);
      setEntradasPedidos([]);
    } finally {
      setLoadingEntradas(false);
    }
  };

  const openEmprestoFormularios = async () => {
    setEmprestoModalOpen(true);
    setLoadingEmpresto(true);
    setEmprestoPage(1);
    try {
      const collected = await fetchAllPedidos();
      const emprestos = sortByDateDesc(collected.filter((p) => p.formulario?.tipo_fluxo === 'EMPRESTIMO'));
      setEmprestoPedidos(emprestos);
    } catch (error) {
      console.error('Erro ao carregar formulários de emprestimo:', error);
      setEmprestoPedidos([]);
    } finally {
      setLoadingEmpresto(false);
    }
  };

  const openDevolucoesFormularios = async () => {
    setDevolucoesModalOpen(true);
    setLoadingDevolucoes(true);
    setDevolucoesPage(1);
    try {
      const collected = await fetchAllPedidos();
      const devolucoes = sortByDateDesc(collected.filter((p) => p.formulario?.tipo_fluxo === 'DEVOLUCAO'));
      setDevolucoesPedidos(devolucoes);
    } catch (error) {
      console.error('Erro ao carregar formulários de devolução:', error);
      setDevolucoesPedidos([]);
    } finally {
      setLoadingDevolucoes(false);
    }
  };

  const saidasTotalPages = useMemo(
    () => Math.max(1, Math.ceil(saidasPedidos.length / saidasPageSize)),
    [saidasPedidos]
  );

  const comprasTotalPages = useMemo(
    () => Math.max(1, Math.ceil(comprasPedidos.length / saidasPageSize)),
    [comprasPedidos]
  );

  const comprasRows = useMemo(() => {
    const start = (comprasPage - 1) * saidasPageSize;
    return comprasPedidos.slice(start, start + saidasPageSize);
  }, [comprasPedidos, comprasPage]);

  const saidasRows = useMemo(() => {
    const start = (saidasPage - 1) * saidasPageSize;
    return saidasPedidos.slice(start, start + saidasPageSize);
  }, [saidasPedidos, saidasPage]);

  const transferenciasTotalPages = useMemo(
    () => Math.max(1, Math.ceil(transferenciasPedidos.length / saidasPageSize)),
    [transferenciasPedidos]
  );

  const transferenciasRows = useMemo(() => {
    const start = (transferenciasPage - 1) * saidasPageSize;
    return transferenciasPedidos.slice(start, start + saidasPageSize);
  }, [transferenciasPedidos, transferenciasPage]);

  const entradasTotalPages = useMemo(
    () => Math.max(1, Math.ceil(entradasPedidos.length / saidasPageSize)),
    [entradasPedidos]
  );

  const entradasRows = useMemo(() => {
    const start = (entradasPage - 1) * saidasPageSize;
    return entradasPedidos.slice(start, start + saidasPageSize);
  }, [entradasPedidos, entradasPage]);

  const emprestoTotalPages = useMemo(
    () => Math.max(1, Math.ceil(emprestoPedidos.length / saidasPageSize)),
    [emprestoPedidos]
  );

  const emprestoRows = useMemo(() => {
    const start = (emprestoPage - 1) * saidasPageSize;
    return emprestoPedidos.slice(start, start + saidasPageSize);
  }, [emprestoPedidos, emprestoPage]);

  const devolucoesTotalPages = useMemo(
    () => Math.max(1, Math.ceil(devolucoesPedidos.length / saidasPageSize)),
    [devolucoesPedidos]
  );

  const devolucoesRows = useMemo(() => {
    const start = (devolucoesPage - 1) * saidasPageSize;
    return devolucoesPedidos.slice(start, start + saidasPageSize);
  }, [devolucoesPedidos, devolucoesPage]);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-primary mb-6">Formulários</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card) => (
          <div key={card.key} className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-2xl text-[#00A88E]">{card.title}</h2>
              <p className="text-sm font-semibold text-[#FF7A00]">{card.description}</p>
              <div className="card-actions justify-end">
                {card.key === 'compras' ? (
                  <button onClick={openComprasFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : card.key === 'saidas' ? (
                  <button onClick={openSaidasFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : card.key === 'transferencias' ? (
                  <button onClick={openTransferenciasFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : card.key === 'entradas' ? (
                  <button onClick={openEntradasFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : card.key === 'empresto' ? (
                  <button onClick={openEmprestoFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : card.key === 'devolucoes' ? (
                  <button onClick={openDevolucoesFormularios} className="btn btn-warning btn-sm">
                    Ver Formulários
                  </button>
                ) : (
                  <button className="btn btn-warning btn-sm" disabled>
                    Em breve
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {comprasModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários de Recebimento - Compras</h3>

            {loadingCompras ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : comprasPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de compras encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-3 flex itemscenter justify-between text-sm">
                  <span className="text-gray-600">{`Total: ${comprasPedidos.length}`}</span>
                  <span className="font-semibold text-warning">
                    {`Pendentes: ${comprasPedidos.filter((p) => isRecebimentoPendente(p)).length}`}
                  </span>
                </div>
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Recebimento</th>
                      <th className="w-52">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprasRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          {!canOpenRecebimento(p) ? (
                            <span className="badge badge-ghost">Aguardando entrega</span>
                          ) : isRecebimentoPendente(p) ? (
                            <span className="badge badge-warning">{`Pendente (${pendingRecebimentoCount(p)})`}</span>
                          ) : (
                            <span className="badge badge-success">Fechado</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                              Ver
                            </Link>
                            {canOpenRecebimento(p) && (
                              <Link href={`/dashboard/pedidos/${p.id}/recebimento`} className="btn btn-accent btn-sm">
                                Recebimento
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setComprasPage((p) => Math.max(1, p - 1))}
                    disabled={comprasPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`P?gina ${comprasPage} / ${comprasTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setComprasPage((p) => Math.min(comprasTotalPages, p + 1))}
                    disabled={comprasPage >= comprasTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setComprasModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {saidasModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários - Saídas</h3>

            {loadingSaidas ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : saidasPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de saída encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th className="w-36">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saidasRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSaidasPage((p) => Math.max(1, p - 1))}
                    disabled={saidasPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`Página ${saidasPage} / ${saidasTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSaidasPage((p) => Math.min(saidasTotalPages, p + 1))}
                    disabled={saidasPage >= saidasTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setSaidasModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {transferenciasModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários - Transferências</h3>

            {loadingTransferencias ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : transferenciasPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de transferência encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th className="w-36">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferenciasRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setTransferenciasPage((p) => Math.max(1, p - 1))}
                    disabled={transferenciasPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`P?gina ${transferenciasPage} / ${transferenciasTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setTransferenciasPage((p) => Math.min(transferenciasTotalPages, p + 1))}
                    disabled={transferenciasPage >= transferenciasTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setTransferenciasModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {entradasModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários - Entradas</h3>

            {loadingEntradas ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : entradasPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de entrada encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Recebimento</th>
                      <th className="w-52">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradasRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          {!canOpenRecebimento(p) ? (
                            <span className="badge badge-ghost">Aguardando entrega</span>
                          ) : isRecebimentoPendenteEntrada(p) ? (
                            <span className="badge badge-warning">{`Pendente (${pendingRecebimentoCount(p)})`}</span>
                          ) : (
                            <span className="badge badge-success">Fechado</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                              Ver
                            </Link>
                            {canOpenRecebimento(p) && (
                              <Link href={`/dashboard/pedidos/${p.id}/recebimento`} className="btn btn-accent btn-sm">
                                Recebimento
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEntradasPage((v) => Math.max(1, v - 1))}
                    disabled={entradasPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`P?gina ${entradasPage} / ${entradasTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEntradasPage((v) => Math.min(entradasTotalPages, v + 1))}
                    disabled={entradasPage >= entradasTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEntradasModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {emprestoModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários - Empréstimo</h3>

            {loadingEmpresto ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : emprestoPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de empréstimo encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th className="w-36">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emprestoRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEmprestoPage((p) => Math.max(1, p - 1))}
                    disabled={emprestoPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`P?gina ${emprestoPage} / ${emprestoTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEmprestoPage((p) => Math.min(emprestoTotalPages, p + 1))}
                    disabled={emprestoPage >= emprestoTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEmprestoModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {devolucoesModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-4">Formulários - Devoluções</h3>

            {loadingDevolucoes ? (
              <div className="flex itemscenter gap-3">
                <span className="loading loading-spinner loading-md" />
                <span>Carregando operações...</span>
              </div>
            ) : devolucoesPedidos.length === 0 ? (
              <div className="text-gray-500">Nenhuma operação de devolução encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Referência</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th className="w-36">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devolucoesRows.map((p) => (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.reference || `#${p.id}`}</td>
                        <td>{new Date(p.date_demande).toLocaleDateString('pt-BR')}</td>
                        <td>{statusLabel(p)}</td>
                        <td>
                          <Link href={getFormularioHref(p)} className="btn btn-outline btn-sm">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex itemscenter justify-end gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setDevolucoesPage((p) => Math.max(1, p - 1))}
                    disabled={devolucoesPage <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {`P?gina ${devolucoesPage} / ${devolucoesTotalPages}`}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setDevolucoesPage((p) => Math.min(devolucoesTotalPages, p + 1))}
                    disabled={devolucoesPage >= devolucoesTotalPages}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setDevolucoesModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
