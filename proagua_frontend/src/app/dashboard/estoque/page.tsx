// ============================================================================
// FICHIER 4: src/app/dashboard/estoque/page.tsx - KORIJE ENDPOINT + AXIOS
// ============================================================================

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';

interface MeInfo {
  pilier_affectation?: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
}

interface MaterielStock {
  id: number;
  code: string;
  description: string;
  unite: string;
  stock_total: number;
}

function StockContent() {
  const searchParams = useSearchParams();
  const pilierParam = searchParams.get('pilier');
  const viewParam = (searchParams.get('view') || 'all').toLowerCase();
  const [materiais, setMateriais] = useState<MaterielStock[]>([]);
  const [filtered, setFiltered] = useState<MaterielStock[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [entrepots, setEntrepots] = useState<any[]>([]);
  const [selectedEntrepot, setSelectedEntrepot] = useState('all');
  const [effectivePilier, setEffectivePilier] = useState<'PILAR1' | 'PILAR2' | 'PILAR3' | null>(null);
  const [pilierResolved, setPilierResolved] = useState(false);
  const isValidPilier = (value: string | null | undefined): value is 'PILAR1' | 'PILAR2' | 'PILAR3' =>
    value === 'PILAR1' || value === 'PILAR2' || value === 'PILAR3';
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadStock = async (entrepotId: string) => {
    try {
      let url = '/materiais-stock/';
      if (entrepotId && entrepotId !== 'all') {
        url += `?entrepot=${entrepotId}`;
      }

      const res = await api.get(url);
      const lista = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMateriais(lista);
      setFiltered(lista);
      setPage(1);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      alert('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const resolvePilier = async () => {
      if (isValidPilier(pilierParam)) {
        setEffectivePilier(pilierParam);
        setPilierResolved(true);
        return;
      }

      try {
        const meRes = await api.get('/me/');
        const meData: MeInfo = meRes.data || {};
        const userPilier = meData.pilier_affectation;
        if (isValidPilier(userPilier)) {
          setEffectivePilier(userPilier);
          setPilierResolved(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar utilizador (/me):', error);
      }

      setEffectivePilier(null);
      setPilierResolved(true);
    };

    resolvePilier();
  }, [pilierParam]);

  useEffect(() => {
    if (!pilierResolved) return;

    const loadEntrepots = async () => {
      try {
        const url = effectivePilier ? `/entrepots/?pilier=${effectivePilier}` : '/entrepots/';
        const res = await api.get(url);
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setEntrepots(data);
        setSelectedEntrepot('all');
      } catch (error) {
        console.error('Erro ao carregar entrepots:', error);
        setEntrepots([]);
      }
    };

    loadEntrepots();
  }, [effectivePilier, pilierResolved]);

  useEffect(() => {
    const entrepotId = selectedEntrepot === 'all' ? 'all' : selectedEntrepot;
    loadStock(entrepotId);
  }, [selectedEntrepot, entrepots]);

  useEffect(() => {
    const lower = search.toLowerCase();
    const onlyLowStock = viewParam === 'baixo';
    setFiltered(
      materiais.filter((m) => {
        const matchesSearch =
          m.code.toLowerCase().includes(lower) ||
          m.description.toLowerCase().includes(lower);
        if (!matchesSearch) return false;
        if (!onlyLowStock) return true;
        return Number(m.stock_total || 0) < 10;
      })
    );
    setPage(1);
  }, [search, materiais, viewParam]);

  const totalTipos = materiais.length;
  const totalUnidades = materiais.reduce((sum, m) => sum + m.stock_total, 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return (
    <div className="flex justify-center itemscenter min-h-screen">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8 text-primary">Controle de Estoque</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="stat shadow-lg bg-base-100 border border-base-300 rounded-xl">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-12 h-12 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div className="stat-title text-lg">Tipos de Materiais</div>
          <div className="stat-value text-primary">{totalTipos}</div>
          <div className="stat-desc">Materiais cadastrados</div>
        </div>

        <div className="stat shadow-lg bg-base-100 border border-base-300 rounded-xl">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-12 h-12 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m8-10L12 3 4 7m8 4v10"></path>
            </svg>
          </div>
          <div className="stat-title text-lg">Total em Estoque</div>
          <div className="stat-value text-secondary">{totalUnidades.toLocaleString('pt-BR')}</div>
          <div className="stat-desc">Unidades fisicas</div>
        </div>

        <div className="stat shadow-lg bg-base-100 border border-base-300 rounded-xl">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-12 h-12 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div className="stat-title text-lg">Status Geral</div>
          <div className="stat-value text-accent">
            {totalUnidades === 0 ? 'Vazio' : totalUnidades < 100 ? 'Baixo' : 'Saudavel'}
          </div>
          <div className="stat-desc">Nível do estoque</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <input
          type="text"
          placeholder="Pesquisar por codigo ou descricao..."
          className="input input-bordered w-full max-w-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-bordered w-full max-w-xs"
          value={selectedEntrepot}
          onChange={(e) => setSelectedEntrepot(e.target.value)}
        >
          <option value="all">Todos</option>
          {entrepots.map((ent) => (
            <option key={ent.id} value={String(ent.id)}>
              {ent.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto shadow-2xl rounded-xl border">
        <table className="table table-zebra">
          <thead className="bg-base-300">
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Unidade</th>
              <th className="text-right">Estoque Atual</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((m) => (
              <tr key={m.id} className="hover">
                <td className="font-bold">{m.code}</td>
                <td>{m.description}</td>
                <td>{m.unite}</td>
                <td className="text-right font-bold text-lg">
                  {m.stock_total.toLocaleString('pt-BR')}
                </td>
                <td className="text-center">
                  <span className={`badge ${m.stock_total === 0 ? 'badge-error' : m.stock_total < 10 ? 'badge-warning' : 'badge-success'} badge-lg`}>
                    {m.stock_total === 0 ? 'Esgotado' : m.stock_total < 10 ? 'Baixo' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-2xl text-gray-500 mt-10">
          Nenhum material encontrado
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex itemscenter justify-between mt-6">
          <div className="text-sm text-gray-500">
            P?gina {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              Primeira
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Proximo
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              Ultimo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <StockContent />
    </Suspense>
  );
}
