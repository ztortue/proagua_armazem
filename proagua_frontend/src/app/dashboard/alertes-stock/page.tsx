'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';

type StockLocation = {
  id: number;
  entrepot?: string;
  entrepot_id_value?: number;
  quantite?: number;
};

type AlertaItem = {
  id: number;
  code: string;
  description: string;
  unite?: string;
  stock_min?: number;
  stock_actuel?: number;
  stock_locations: StockLocation[];
};

type EntrepotItem = {
  id: number;
  nom: string;
};

function AlertesStockContent() {
  const searchParams = useSearchParams();
  const pilier = searchParams.get('pilier');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [alertes, setAlertes] = useState<AlertaItem[]>([]);
  const [entrepots, setEntrepots] = useState<EntrepotItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEntrepot, setSelectedEntrepot] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const [alertRes, entrepotRes] = await Promise.all([
          api.get('/alertes-stock/'),
          api.get(pilier ? `/entrepots/?pilier=${pilier}` : '/entrepots/'),
        ]);

        const alertRows = Array.isArray(alertRes.data) ? alertRes.data : alertRes.data.results || [];
        const entrepotRows = Array.isArray(entrepotRes.data) ? entrepotRes.data : entrepotRes.data.results || [];
        setAlertes(alertRows);
        setEntrepots(entrepotRows);
      } catch (error) {
        console.error('Erro ao carregar alertas de stock:', error);
        const err: any = error;
        const apiDetail =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          (typeof err?.response?.data === 'string' ? err.response.data : '');
        setErrorMsg(apiDetail || 'Não foi possível carregar alertas de stock.');
        setAlertes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pilier]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return alertes.filter((item) => {
      const code = String(item.code || '').toLowerCase();
      const desc = String(item.description || '').toLowerCase();
      const byText = !term || code.includes(term) || desc.includes(term);
      if (!byText) return false;

      if (selectedEntrepot === 'all') return true;
      return (item.stock_locations || []).some(
        (loc) => String(loc.entrepot_id_value || '') === selectedEntrepot
      );
    });
  }, [alertes, search, selectedEntrepot]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length]
  );

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedEntrepot]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-primary mb-6">Alertas de Stock Baixas</h1>

      {errorMsg && (
        <div className="alert alert-error mb-4">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Pesquisar por codigo ou descricao"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-bordered w-full"
          value={selectedEntrepot}
          onChange={(e) => setSelectedEntrepot(e.target.value)}
        >
          <option value="all">Todos depositos</option>
          {entrepots.map((ent) => (
            <option key={ent.id} value={String(ent.id)}>
              {ent.nom}
            </option>
          ))}
        </select>
        <div className="flex itemscenter justify-end text-sm text-gray-600">
          {`P?gina ${page} / ${totalPages} - Total ${filtered.length}`}
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-lg">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Estoque Atual</th>
              <th>Estoque Minimo</th>
              <th>Deficit</th>
              <th>Depositos</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const stockAtual = Number(item.stock_actuel || 0);
              const stockMin = Number(item.stock_min || 0);
              const deficit = Math.max(0, stockMin - stockAtual);
              const statusClass =
                stockAtual <= 0 ? 'badge-error' : stockAtual < Math.max(1, stockMin / 2) ? 'badge-warning' : 'badge-secondary';
              const statusLabel =
                stockAtual <= 0 ? 'Esgotado' : stockAtual < Math.max(1, stockMin / 2) ? 'Critico' : 'Baixo';
              const depoNames = (item.stock_locations || [])
                .map((loc) => `${loc.entrepot || '-'} (${loc.quantite || 0})`)
                .join(', ');

              return (
                <tr key={item.id}>
                  <td className="font-semibold">{item.code}</td>
                  <td>{item.description}</td>
                  <td>{stockAtual}</td>
                  <td>{stockMin}</td>
                  <td className="font-semibold text-error">{deficit}</td>
                  <td>{depoNames || '-'}</td>
                  <td>
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-lg text-gray-500 mt-8">Nenhuma alerta encontrada.</div>
      )}

      <div className="mt-4 flex itemscenter justify-end gap-2">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

export default function AlertesStockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <AlertesStockContent />
    </Suspense>
  );
}
