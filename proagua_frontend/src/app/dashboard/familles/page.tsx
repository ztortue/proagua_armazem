'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Me = {
  role?: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
};

type Famille = {
  id: number;
  nom: string;
  description?: string | null;
};

type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  results: T[];
};

export default function FamillesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', description: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, famRes] = await Promise.all([
          api.get('/me/'),
          api.get('/familles/'),
        ]);
        setMe(meRes.data || null);

        const data: PaginatedResponse<Famille> | Famille[] = famRes.data;
        const rows = Array.isArray(data) ? data : data.results || [];
        setFamilles(rows);
      } catch (error) {
        console.error('Erro ao carregar famílias:', error);
        setFamilles([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
        nom,
        description: form.description.trim() || '',
      };
      const res = await api.post('/familles/', payload);
      const created: Famille = res.data;
      setFamilles((prev) => [created, ...prev]);
      setForm({ nom: '', description: '' });
      setModalOpen(false);
      alert('Família criada com sucesso.');
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return familles;
    return familles.filter((f) =>
      String(f.nom || '').toLowerCase().includes(term) ||
      String(f.description || '').toLowerCase().includes(term)
    );
  }, [familles, search]);

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
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
      <div className="flex itemscenter justify-between mb-8">
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto shadow-2xl rounded-xl border">
        <table className="table table-zebra">
          <thead className="bg-base-300">
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((fam) => (
              <tr key={fam.id} className="hover">
                <td>{fam.nom}</td>
                <td>{fam.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-xl text-gray-500 mt-8">Nenhuma família encontrada</div>
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
                onClick={() => {
                  if (saving) return;
                  setModalOpen(false);
                }}
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
