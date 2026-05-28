'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

type Me = {
  role?: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
};

type Famille = {
  id: number;
  code?: string | null;
  nom: string;
  description?: string | null;
};

const PAGE_SIZE = 10;

export default function FamillesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '' });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildFamilleCode = (value: string) => {
    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    return normalized.slice(0, 3).padEnd(3, 'X');
  };

  useEffect(() => {
    api.get('/me/').then((res) => setMe(res.data || null)).finally(() => setMeLoading(false));
  }, []);

  useEffect(() => {
    setTableLoading(true);
    api
      .get('/familles/', { params: { page, search: search.trim() || undefined } })
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setFamilles(data);
          setTotalCount(data.length);
        } else {
          setFamilles(data.results || []);
          setTotalCount(data.count || 0);
        }
      })
      .catch(() => { setFamilles([]); setTotalCount(0); })
      .finally(() => setTableLoading(false));
  }, [page, search]);

  const handleSearchChange = (value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 400);
  };

  const canView = me?.role === 'ADMIN' || me?.role === 'MANAGER';

  const handleCreateFamille = async () => {
    const nom = form.nom.trim();
    if (!nom) {
      alert('O nome da família é obrigatório.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: buildFamilleCode(nom),
        nom,
        description: form.description.trim() || '',
      };
      await api.post('/familles/', payload);
      setForm({ nom: '', description: '' });
      setModalOpen(false);
      setPage(1);
      setSearch('');
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.nom?.[0] ||
        'Erro ao criar a família.';
      alert(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (meLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-8">
        <div className="alert alert-error">Acesso negado: apenas Manager e Admin podem ver famílias.</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-primary">Família</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Nova família
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Pesquisar família..."
          className="input input-bordered w-full max-w-lg"
          defaultValue=""
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto shadow-2xl rounded-xl border min-h-[200px] relative">
        {tableLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-100/60 z-10 rounded-xl">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        )}
        <table className="table table-zebra">
          <thead className="bg-base-300">
            <tr>
              <th>Codigo</th>
              <th>Nome</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {familles.map((fam) => (
              <tr key={fam.id} className="hover">
                <td className="font-mono font-semibold">{fam.code || '-'}</td>
                <td>{fam.nom}</td>
                <td>{fam.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!tableLoading && familles.length === 0 && (
        <div className="text-center text-xl text-gray-500 mt-8">Nenhuma família encontrada</div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-base-content/60">
            {totalCount} família{totalCount !== 1 ? 's' : ''} · página {page} de {totalPages}
          </span>
          <div className="join">
            <button
              className="join-item btn btn-sm"
              disabled={page <= 1 || tableLoading}
              onClick={() => setPage(1)}
            >
              «
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={page <= 1 || tableLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Anterior
            </button>
            <button className="join-item btn btn-sm btn-active pointer-events-none">
              {page}
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={page >= totalPages || tableLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima ›
            </button>
            <button
              className="join-item btn btn-sm"
              disabled={page >= totalPages || tableLoading}
              onClick={() => setPage(totalPages)}
            >
              »
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Nova Família</h3>
            <div className="space-y-3">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Nome da família"
                value={form.nom}
                onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
              />
              <input
                type="text"
                className="input input-bordered w-full bg-base-200"
                placeholder="Codigo automatico"
                value={buildFamilleCode(form.nom)}
                readOnly
              />
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Descricao (opcional)"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => { if (!saving) setModalOpen(false); }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleCreateFamille} disabled={saving}>
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
