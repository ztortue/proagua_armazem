'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const PAGE_SIZE = 20;

type Me = {
  role?: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
};

type Categorie = {
  id: number;
  nom: string;
  famille?: {
    id: number;
    nom: string;
  } | null;
};

type SousFamille = {
  id: number;
  nom: string;
  description?: string | null;
  categorie?: number | null;
  categorie_nom?: string | null;
};

export default function SousFamillesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [allSousFamilles, setAllSousFamilles] = useState<SousFamille[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SousFamille | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', categorie_id: '' });

  const canUsePage = me?.role === 'ADMIN' || me?.role === 'MANAGER' || me?.role === 'USER';

  const loadSousFamilles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/souscategories/');
      const data = res.data;
      const rows: SousFamille[] = Array.isArray(data) ? data : data.results || [];
      setAllSousFamilles(rows);
    } catch (error) {
      console.error('Erro ao carregar sous-familles:', error);
      setAllSousFamilles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories/');
      const data = res.data;
      const rows: Categorie[] = Array.isArray(data) ? data : data.results || [];
      setCategories(rows);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const meRes = await api.get('/me/');
        setMe(meRes.data || null);
      } catch {
        setMe(null);
      } finally {
        setMeLoading(false);
      }
      await Promise.all([loadSousFamilles(), loadCategories()]);
    };
    init();
  }, []);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allSousFamilles;
    return allSousFamilles.filter((row) => {
      const catLabel = row.categorie_nom || categoriesById.get(row.categorie || 0)?.nom || '';
      return (
        String(row.nom || '').toLowerCase().includes(term) ||
        String(row.description || '').toLowerCase().includes(term) ||
        String(catLabel).toLowerCase().includes(term)
      );
    });
  }, [allSousFamilles, search, categoriesById]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered]
  );
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', description: '', categorie_id: '' });
    setModalOpen(true);
  };

  const openEdit = (row: SousFamille) => {
    setEditing(row);
    setForm({
      nom: row.nom,
      description: row.description || '',
      categorie_id: row.categorie ? String(row.categorie) : '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm({ nom: '', description: '', categorie_id: '' });
  };

  const handleSubmit = async () => {
    const nom = form.nom.trim();
    if (!nom) {
      alert('O nome da subcategoria e obrigatorio.');
      return;
    }
    if (!form.categorie_id) {
      alert('Selecione a categoria.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nom,
        description: form.description.trim() || '',
        categorie_id: Number(form.categorie_id),
      };
      if (editing) {
        await api.patch(`/souscategories/${editing.id}/`, payload);
        alert('Subcategoria atualizada com sucesso.');
      } else {
        await api.post('/souscategories/', payload);
        alert('Subcategoria criada com sucesso.');
      }
      closeModal();
      await loadSousFamilles();
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.nom?.[0] ||
        error?.response?.data?.categorie_id?.[0] ||
        'Erro ao guardar a subcategoria.';
      alert(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SousFamille) => {
    if (!confirm(`Apagar a subcategoria "${row.nom}"?`)) return;
    try {
      await api.delete(`/souscategories/${row.id}/`);
      alert('Subcategoria apagada com sucesso.');
      await loadSousFamilles();
    } catch (error: any) {
      alert('Erro ao apagar: ' + (error?.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  if (meLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!canUsePage) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          Acesso negado: apenas Admin, Manager e Usuario podem usar subcategorias.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary">Subcategorias</h1>
            <p className="text-lg opacity-70 mt-2">
              {filtered.length} subcategoria{filtered.length !== 1 ? 's' : ''} · página {page} de {totalPages}
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + Nova subcategoria
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Pesquisar subcategoria..."
            className="input input-bordered w-full max-w-lg"
            defaultValue=""
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto shadow-2xl rounded-xl border min-h-[200px] relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-base-100/60 z-10 rounded-xl">
              <span className="loading loading-spinner loading-md" />
            </div>
          )}
          <table className="table table-zebra">
            <thead className="bg-base-300">
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((row) => {
                const category = categoriesById.get(row.categorie || 0);
                const familyName = category?.famille?.nom || '-';
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-semibold">{row.nom}</td>
                    <td>
                      <div>{row.categorie_nom || category?.nom || '-'}</div>
                      <div className="text-xs opacity-70">{familyName}</div>
                    </td>
                    <td>{row.description || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-warning btn-sm" onClick={() => openEdit(row)}>
                          Editar
                        </button>
                        <button className="btn btn-error btn-sm" onClick={() => handleDelete(row)}>
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center text-xl text-gray-500 mt-8">Nenhuma subcategoria encontrada</div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <span className="text-sm text-base-content/60">
              {filtered.length} subcategoria{filtered.length !== 1 ? 's' : ''} · página {page} de {totalPages}
            </span>
            <div className="join">
              <button
                className="join-item btn btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(1)}
              >«</button>
              <button
                className="join-item btn btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >‹ Anterior</button>
              <button className="join-item btn btn-sm btn-active pointer-events-none">{page}</button>
              <button
                className="join-item btn btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >Próxima ›</button>
              <button
                className="join-item btn btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(totalPages)}
              >»</button>
            </div>
          </div>
        )}

        {modalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg">
              <h3 className="font-bold text-lg mb-4">
                {editing ? 'Editar' : 'Nova'} subcategoria
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Nome da subcategoria"
                  value={form.nom}
                  onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
                />
                <select
                  className="select select-bordered w-full"
                  value={form.categorie_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, categorie_id: e.target.value }))}
                >
                  <option value="">Selecione a categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.famille?.nom ? `${cat.famille.nom} → ` : ''}{cat.nom}
                    </option>
                  ))}
                </select>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Descrição (opcional)"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="modal-action">
                <button className="btn btn-ghost" onClick={closeModal}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
