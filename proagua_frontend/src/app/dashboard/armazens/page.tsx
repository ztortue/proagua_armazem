// ============================================================================
// FICHIER: src/app/dashboard/armazens/page.tsx - KORIJE + AXIOS
// ============================================================================

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';

type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

const dedupeById = <T extends { id?: number | string }>(rows: T[]): T[] => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const rowId = row?.id;
    if (rowId === null || rowId === undefined) return true;
    const key = String(rowId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function ArmazensContent() {
  const searchParams = useSearchParams();
  const pilierParam = searchParams.get('pilier');
  const [armazens, setArmazens] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // null = tout depo
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    localisation: '',
    projet_id: '',
    responsable_id: '',
  });
  const [projets, setProjets] = useState<any[]>([]);
  const [responsables, setResponsables] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);

  // Done filtre pa depo
  const [estoques, setEstoques] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [estoquePage, setEstoquePage] = useState(1);
  const [estoqueSearch, setEstoqueSearch] = useState('');
  const [entradaModalOpen, setEntradaModalOpen] = useState(false);
  const [entradaTarget, setEntradaTarget] = useState<any | null>(null);
  const [entradaQuantidade, setEntradaQuantidade] = useState('1');
  const [entradaMotivo, setEntradaMotivo] = useState('');
  const [entradaFournisseurId, setEntradaFournisseurId] = useState('');
  const estoquePageSize = 10;
    const fetchAllPages = async (url: string) => {
    const collected: any[] = [];
    let nextUrl: string | null = url;
    while (nextUrl) {
      const res: { data: PaginatedResponse<any> | any[] } = await api.get(nextUrl);
      const data: PaginatedResponse<any> | any[] = res.data;
      if (Array.isArray(data)) return data;
      const pageItems = Array.isArray(data?.results) ? data.results : [];
      collected.push(...pageItems);
      // ✅ FIX : URL absoli → ekstrè path sèlman (menm lojik ki materiais/page.tsx)
      const nextRaw: string | null = data?.next ?? null;
      if (!nextRaw) {
        nextUrl = null;
      } else if (nextRaw.startsWith('http')) {
        try {
          const parsed = new URL(nextRaw);
          nextUrl = parsed.pathname.replace(/^\/api/, '') + parsed.search;
        } catch {
          nextUrl = null;
        }
      } else {
        nextUrl = nextRaw;
      }
    }
    return collected;
  };
  const normalizeText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  const normalizeSearchText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  useEffect(() => {
    async function load() {
      try {
        const entrepotUrl =
          pilierParam && ['PILAR1', 'PILAR2', 'PILAR3'].includes(pilierParam)
            ? `/entrepots/?pilier=${pilierParam}`
            : '/entrepots/';
        const [resArmazens, resProjets, resUsers, resFournisseurs] = await Promise.all([
          api.get(entrepotUrl),
          api.get('/projets/'),
          api.get('/users/'),
          api.get('/fournisseurs/'),
        ]);
        const armazensRows = Array.isArray(resArmazens.data) ? resArmazens.data : resArmazens.data.results || [];
        setArmazens(dedupeById(armazensRows));
        setProjets(Array.isArray(resProjets.data) ? resProjets.data : resProjets.data.results || []);
        setResponsables(Array.isArray(resUsers.data) ? resUsers.data : resUsers.data.results || []);
        const fournisseursList = Array.isArray(resFournisseurs.data) ? resFournisseurs.data : resFournisseurs.data.results || [];
        setFournisseurs(fournisseursList);
      } catch (err) {
        console.error('Erro ao carregar armazéns:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pilierParam]);

  const loadSelectedData = async (entrepotId: number) => {
    const [allEstoques, allMovimentos] = await Promise.all([
      fetchAllPages(`/estoques/?entrepot=${entrepotId}`),
      fetchAllPages(`/movimentos/?entrepot=${entrepotId}`),
    ]);
    setEstoques(dedupeById(allEstoques));
    setMovimentos(allMovimentos);
    setEstoquePage(1);
  };

  // Chaje done filtre lè selected chanje
  useEffect(() => {
    const selectedId = selected;
    if (selectedId === null) return; // Pa chaje si "tout depo"
    const entrepotId: number = selectedId;

    async function loadFiltered() {
      try {
        await loadSelectedData(entrepotId);
      } catch (err) {
        console.error('Erro ao carregar dados filtrados:', err);
      }
    }
    loadFiltered();
  }, [selected]);

  useEffect(() => {
    setEstoquePage(1);
  }, [estoqueSearch]);

  const handleCreate = async () => {
    try {
      const payload = {
        nom: form.nom,
        localisation: form.localisation,
        projet_id: form.projet_id ? Number(form.projet_id) : null,
        responsable_id: form.responsable_id ? Number(form.responsable_id) : null,
      };
      const res = await api.post('/entrepots/', payload);
      if (res.status === 201) {
        alert('Armazém criado com sucesso!');
        setModalOpen(false);
        setForm({ nom: '', localisation: '', projet_id: '', responsable_id: '' });
        const resArm = await api.get('/entrepots/');
        const rows = Array.isArray(resArm.data) ? resArm.data : resArm.data.results || [];
        setArmazens(dedupeById(rows));
      }
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.detail || 'Erro ao criar armazém'));
    }
  };

  const openEntradaModal = (item: any) => {
    setEntradaTarget(item);
    setEntradaQuantidade('1');
    setEntradaMotivo('');
    setEntradaFournisseurId('');
    setEntradaModalOpen(true);
  };

  const handleConfirmEntrada = async () => {
    if (!selectedArmazem || !entradaTarget?.materiel_id_value) {
      alert('Material ou armazém inválido.');
      return;
    }
    const quantidade = Number(entradaQuantidade);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }
    if (!entradaFournisseurId) {
      alert('Selecione o fornecedor da entrada de estoque.');
      return;
    }
    try {
      await api.post('/movimentos/', {
        type_mvt: 'ENTREE',
        materiel_id: entradaTarget.materiel_id_value,
        entrepot_id: selectedArmazem.id,
        quantite: quantidade,
        fournisseur_id: Number(entradaFournisseurId),
        raison: entradaMotivo || `Entrada manual no armazem ${selectedArmazem.nom}`,
      });
      alert('Entrada registrada com sucesso.');
      setEntradaModalOpen(false);
      await loadSelectedData(selectedArmazem.id);
    } catch (err: any) {
      alert('Erro: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Erro ao registrar entrada.'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const selectedArmazem = selected ? armazens.find(a => a.id === selected) : null;
  const estoquesFiltered = estoques.filter((item) => {
    const query = normalizeSearchText(estoqueSearch);
    if (!query) return true;
    const code = normalizeSearchText(String(item?.materiel_code || ''));
    const description = normalizeSearchText(String(item?.materiel_description || ''));
    const materielLabel = normalizeSearchText(String(item?.materiel || ''));
    const haystack = `${code} ${description} ${materielLabel}`.trim();
    const tokens = query.split(' ').filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  });
  const totalEstoquePages = Math.max(1, Math.ceil(estoquesFiltered.length / estoquePageSize));
  const estoquesPageItems = estoquesFiltered.slice(
    (estoquePage - 1) * estoquePageSize,
    estoquePage * estoquePageSize
  );

  return (
    <div className="p-8 min-h-screen bg-base-200">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between itemscenter mb-10">
          <h1 className="text-5xl font-bold text-primary">Gestão de Armazéns</h1>
          <div className="flex itemscenter gap-3">
            <button onClick={() => setModalOpen(true)} className="btn btn-success btn-lg shadow-lg hover:shadow-xl transition-shadow">
              + Novo Armazém
            </button>
          </div>
        </div>

        {pilierParam && ['PILAR1', 'PILAR2', 'PILAR3'].includes(pilierParam) && (
          <div className="mb-6">
            <div className="badge badge-primary badge-lg">{`Filtro ativo: ${pilierParam}`}</div>
          </div>
        )}

        {/* Sélection */}
        <div className="card bg-base-100 shadow-xl mb-10">
          <div className="card-body">
            <h2 className="card-title text-2xl">Armazém selecionado</h2>
            <div className="flex flex-wrap gap-4 mt-4">
              <button
                onClick={() => setSelected(null)}
                className={`btn ${selected === null ? 'btn-primary' : 'btn-outline'}`}
              >
                Todos os Armazéns
              </button>
              {armazens.map(arm => (
                <button
                  key={arm.id}
                  onClick={() => setSelected(arm.id)}
                  className={`btn ${selected === arm.id ? 'btn-primary' : 'btn-outline'}`}
                >
                  {arm.nom}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info si yon depo chwazi */}
        {selectedArmazem && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">{selectedArmazem.nom}</h2>
                <p className="opacity-70">{selectedArmazem.localisation}</p>
                <div className="mt-4 space-y-2">
                  <p><strong>Projeto:</strong> {selectedArmazem.projet?.nom || selectedArmazem.projet || 'Nenhum'}</p>
                  <p><strong>Responsável:</strong> {selectedArmazem.responsable?.username || selectedArmazem.responsable || 'Nenhum'}</p>
                </div>
                <div className="mt-5">
                  <Link
                    href={`/dashboard/materiais?entrepot=${selectedArmazem.id}${pilierParam ? `&pilier=${pilierParam}` : ''}`}
                    className="btn btn-primary btn-sm"
                  >
                    Ver materiais deste armazém
                  </Link>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl">Materiais Disponíveis</h2>
                <div className="mt-4">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Pesquisar material por código ou descrição..."
                    value={estoqueSearch}
                    onChange={(e) => setEstoqueSearch(e.target.value)}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {loading && <div>Carregando...</div>}
                  {!loading && estoquesFiltered.length === 0 && (
                    <div className="text-sm text-gray-500">Nenhum material encontrado.</div>
                  )}
                  {!loading && estoquesPageItems.map((item, index) => (
                    <div
                      key={`${item?.id ?? 'stock'}-${item?.materiel_id_value ?? item?.materiel_code ?? index}`}
                      className="flex itemscenter justify-between gap-3"
                    >
                      <span>{item.materiel_description || item.materiel_code || 'Material'}</span>
                      <div className="flex itemscenter gap-3">
                        <span className="text-gray-600">({item.quantite ?? 0})</span>
                        <button className="btn btn-success btn-xs" onClick={() => openEntradaModal(item)}>
                          + Entrada
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {!loading && estoquesFiltered.length > estoquePageSize && (
                  <div className="mt-4 flex itemscenter justify-between">
                    <div className="flex itemscenter gap-2">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEstoquePage(1)}
                        disabled={estoquePage <= 1}
                      >
                        Primeira
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEstoquePage((p) => Math.max(1, p - 1))}
                        disabled={estoquePage <= 1}
                      >
                        Anterior
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">{`Página ${estoquePage} / ${totalEstoquePages}`}</span>
                    <div className="flex itemscenter gap-2">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEstoquePage((p) => Math.min(totalEstoquePages, p + 1))}
                        disabled={estoquePage >= totalEstoquePages}
                      >
                        Próxima
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setEstoquePage(totalEstoquePages)}
                        disabled={estoquePage >= totalEstoquePages}
                      >
                        Última
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lis depo yo si pa gen seleksyon */}
        {!selected && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {armazens.map(arm => (
              <div key={arm.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                <div className="card-body">
                  <h2 className="card-title text-xl font-bold">{arm.nom}</h2>
                  <p className="text-sm opacity-70">{arm.localisation}</p>
                  <div className="mt-4 text-sm">
                    <p><strong>Projeto:</strong> {arm.projet?.nom || arm.projet || '—'}</p>
                    <p><strong>Responsável:</strong> {arm.responsable?.username || arm.responsable || '—'}</p>
                  </div>
                  <div className="card-actions justify-end mt-6">
                    <button onClick={() => setSelected(arm.id)} className="btn btn-primary btn-sm">
                      Ver detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Novo Armazém */}
        {modalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg">
              <h3 className="font-bold text-xl mb-6">Novo Armazém</h3>
              <div className="space-y-4">
                <input
                  placeholder="Nome do armazém"
                  className="input input-bordered w-full"
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                />
                <textarea
                  placeholder="Localização"
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={form.localisation}
                  onChange={e => setForm({ ...form, localisation: e.target.value })}
                />
                <select
                  className="select select-bordered w-full"
                  value={form.projet_id}
                  onChange={(e) => setForm({ ...form, projet_id: e.target.value })}
                >
                  <option value="">Selecione o projeto</option>
                  {projets.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.nom}
                    </option>
                  ))}
                </select>
                <select
                  className="select select-bordered w-full"
                  value={form.responsable_id}
                  onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
                >
                  <option value="">Selecione o responsável</option>
                  {responsables.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-action mt-8">
                <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button onClick={handleCreate} className="btn btn-success">
                  Criar Armazém
                </button>
              </div>
            </div>
          </div>
        )}

        {entradaModalOpen && selectedArmazem && entradaTarget && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg">
              <h3 className="font-bold text-2xl text-primary text-center mb-6">Entrada de Estoque</h3>
              <div className="space-y-4">
                <div>
                  <label className="label"><span className="label-text font-bold">Material</span></label>
                  <input
                    className="input input-bordered w-full"
                    value={entradaTarget.materiel_description || entradaTarget.materiel_code || 'Material'}
                    readOnly
                  />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">Armazem</span></label>
                  <input className="input input-bordered w-full" value={selectedArmazem.nom} readOnly />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">Quantidade *</span></label>
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered w-full"
                    value={entradaQuantidade}
                    onChange={(e) => setEntradaQuantidade(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">Motivo (opcional)</span></label>
                  <textarea
                    rows={2}
                    className="textarea textarea-bordered w-full"
                    value={entradaMotivo}
                    onChange={(e) => setEntradaMotivo(e.target.value)}
                    placeholder="Ex: Reposicao de estoque"
                  />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">Fornecedor *</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={entradaFournisseurId}
                    onChange={(e) => setEntradaFournisseurId(e.target.value)}
                  >
                    <option value="">Selecione o fornecedor</option>
                    {fournisseurs.map((fourn) => (
                      <option key={fourn.id} value={fourn.id}>{fourn.nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setEntradaModalOpen(false)}>Cancelar</button>
                <button className="btn btn-success" onClick={handleConfirmEntrada} disabled={!entradaFournisseurId}>Confirmar Entrada</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArmazensPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <ArmazensContent />
    </Suspense>
  );
}
