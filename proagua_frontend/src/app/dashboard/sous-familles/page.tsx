'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

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

type PageResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function SousFamillesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [sousFamilles, setSousFamilles] = useState<SousFamille[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SousFamille | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', categorie_id: '' });

  const canUsePage = me?.role === 'ADMIN' || me?.role === 'MANAGER' || me?.role === 'USER';

  const loadPage = async (pageNum = 1, term = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      if (term.trim()) params.set('search', term.trim());
      const res = await api.get<PageResponse<SousFamille>>(`/souscategories/?${params.toString()}`);
      const data = res.data;
      setSousFamilles(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / 20)));
      setPage(pageNum);
    } catch (error) {
      console.error('Erro ao carregar sous-familles:', error);
      setSousFamilles([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const collected: Categorie[] = [];
      let pageNum = 1;
      let next: string | null = null;

      do {
        const res = await api.get<PageResponse<Categorie>>(`/categories/?page=${pageNum}`);
        const data = res.data;
        collected.push(...(data.results || []));
        next = data.next;
        pageNum += 1;
      } while (next);

      setCategories(collected);
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
      } catch (error) {
        console.error('Erro ao carregar utilizador atual:', error);
        setMe(null);
      }
      await Promise.all([loadPage(1), loadCategories()]);
    };

    init();
  }, []);

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
      alert('O nome da sous-famille e obrigatorio.');
      return;
    }
    if (!form.categorie_id) {
      alert('Selecione a categoria da sous-famille.');
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
        alert('Sous-famille atualizada com sucesso.');
      } else {
        await api.post('/souscategories/', payload);
        alert('Sous-famille criada com sucesso.');
      }

      closeModal();
      await loadPage(page, search);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.nom?.[0] ||
        error?.response?.data?.categorie_id?.[0] ||
        'Erro ao guardar a sous-famille.';
      alert(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: SousFamille) => {
    const confirmed = confirm(`Supprimer la sous-famille "${row.nom}" ?`);
    if (!confirmed) return;

    try {
      await api.delete(`/souscategories/${row.id}/`);
      alert('Sous-famille supprimida com sucesso.');
      const targetPage = sousFamilles.length === 1 && page > 1 ? page - 1 : page;
      await loadPage(targetPage, search);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        'Erro ao remover a sous-famille.';
      alert(String(msg));
    }
  };

  const categoriesById = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item]));
  }, [categories]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sousFamilles;
    return sousFamilles.filter((row) => {
      const categoryLabel = row.categorie_nom || categoriesById.get(row.categorie || 0)?.nom || '';
      return (
        String(row.nom || '').toLowerCase().includes(term) ||
        String(row.description || '').toLowerCase().includes(term) ||
        String(categoryLabel || '').toLowerCase().includes(term)
      );
    });
  }, [categoriesById, search, sousFamilles]);

  if (loading && !me) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!canUsePage) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          Acesso negado: apenas Admin, Manager e Usuario podem usar sous-familles.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between itemscenter mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary">Subcategorias</h1>
            <p className="text-lg opacity-70 mt-2">
              Total: <span className="font-bold">{totalCount}</span> - Pagina <span className="font-bold">{page}</span> / <span className="font-bold">{totalPages}</span>
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + Nova subcategoria
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Pesquisar subcategoria..."
            className="input input-bordered w-full max-w-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline" onClick={() => loadPage(1, search)}>
            Rechercher
          </button>
        </div>

        <div className="overflow-x-auto shadow-2xl rounded-xl border">
          <table className="table table-zebra">
            <thead className="bg-base-300">
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Descricao</th>
                <th className="text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
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

        {visibleRows.length === 0 && !loading && (
          <div className="text-center text-xl text-gray-500 mt-8">Nenhuma subcategoria encontrada</div>
        )}

        <div className="flex justify-center gap-4 mt-8">
          <button
            className="btn btn-outline btn-primary"
            onClick={() => loadPage(Math.max(1, page - 1), search)}
            disabled={page <= 1 || loading}
          >
            {'<'} Anterior
          </button>
          <span className="flex itemscenter font-bold">
            Pagina {page} de {totalPages}
          </span>
          <button
            className="btn btn-outline btn-primary"
            onClick={() => loadPage(Math.min(totalPages, page + 1), search)}
            disabled={page >= totalPages || loading}
          >
            Proxima {'>'}
          </button>
        </div>

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
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.famille?.nom ? `${category.famille.nom} -> ` : ''}{category.nom}
                    </option>
                  ))}
                </select>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Descricao (opcional)"
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
