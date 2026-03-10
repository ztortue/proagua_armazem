// ============================================================================
// FICHIER 4: src/app/dashboard/estoque/page.tsx - KORIJE ENDPOINT + AXIOS
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface MaterielStock {
  id: number;
  code: string;
  description: string;
  unite: string;
  stock_total: number;
}

export default function StockPage() {
  const [materiais, setMateriais] = useState<MaterielStock[]>([]);
  const [filtered, setFiltered] = useState<MaterielStock[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStock = async () => {
    try {
      const selectedId = localStorage.getItem('selected_armazem');
      let url = '/materiais-stock/';
      if (selectedId && selectedId !== 'null') {
        url += `?entrepot=${selectedId}`;
      }

      const res = await api.get(url);
      const lista = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMateriais(lista);
      setFiltered(lista);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      alert('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      materiais.filter(m =>
        m.code.toLowerCase().includes(lower) ||
        m.description.toLowerCase().includes(lower)
      )
    );
  }, [search, materiais]);

  const totalTipos = materiais.length;
  const totalUnidades = materiais.reduce((sum, m) => sum + m.stock_total, 0);

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
          <div className="stat-desc">Unidades físicas</div>
        </div>

        <div className="stat shadow-lg bg-base-100 border border-base-300 rounded-xl">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-12 h-12 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div className="stat-title text-lg">Status Geral</div>
          <div className="stat-value text-accent">
            {totalUnidades === 0 ? 'Vazio' : totalUnidades < 100 ? 'Baixo' : 'Saudável'}
          </div>
          <div className="stat-desc">Nível do estoque</div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Pesquisar por código ou descrição..."
        className="input input-bordered w-full max-w-lg mb-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

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
            {filtered.map((m) => (
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
    </div>
  );
}
