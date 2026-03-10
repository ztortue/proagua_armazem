'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

type Categorie = {
  id: number;
  nom: string;
  description?: string;
  parent?: number | null;
  parent_nom?: string | null;
};

type PageResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Categorie[];
};

type Materiel = {
  id: number;
  code: string;
  description: string;
  stock_actuel?: number;
  stock_locations: Array<{
    id: number;
    entrepot: string;
    entrepot_id?: number;
    quantite: number;
  }>;
};

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allCategories, setAllCategories] = useState<Categorie[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [form, setForm] = useState({ nom: '', description: '', parent: '' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Categorie | null>(null);
  const [materiais, setMateriais] = useState<Materiel[]>([]);
  const [materiaisLoading, setMateriaisLoading] = useState(false);
  const [entrepots, setEntrepots] = useState<any[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<any[]>([]);
  const [selectedDemandeurReelId, setSelectedDemandeurReelId] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [movementTypes, setMovementTypes] = useState<Record<number, string>>({});
  const [movementReason, setMovementReason] = useState('');
  const [selectedEntrepotIds, setSelectedEntrepotIds] = useState<Record<number, string>>({});
  const [movementLoading, setMovementLoading] = useState(false);

  const load = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await api.get<PageResponse>(`/categories/?page=${pageNum}`);
      const data = res.data;
      setCategories(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / 20)));
      setPage(pageNum);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCategories = async () => {
    const all: Categorie[] = [];
    let pageNum = 1;
    let next: string | null = null;

    try {
      do {
        const res = await api.get<PageResponse>(`/categories/?page=${pageNum}`);
        const data = res.data;
        all.push(...(data.results || []));
        next = data.next;
        pageNum += 1;
      } while (next);

      setAllCategories(all);
    } catch (error) {
      console.error('Erro ao carregar todas as categorias:', error);
    }
  };

  useEffect(() => {
    load(1);
    loadAllCategories();
  }, []);

  const loadEntrepots = async () => {
    try {
      const res = await api.get('/entrepots/');
      setEntrepots(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error('Erro ao carregar entrepots:', error);
      setEntrepots([]);
    }
  };

  const loadUtilisateursFinal = async () => {
    try {
      const res = await api.get('/utilisateurs-final/');
      setUtilisateursFinal(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (error) {
      console.error('Erro ao carregar demandantes:', error);
      setUtilisateursFinal([]);
    }
  };

  const openDetails = async (cat: Categorie) => {
    setSelectedCategory(cat);
    setDetailOpen(true);
    setMateriaisLoading(true);
    setSelectedItems({});
    setQuantities({});
    setMovementTypes({});
    setMovementReason('');
    setSelectedEntrepotIds({});
    setSelectedDemandeurReelId('');
    try {
      const [resMateriais] = await Promise.all([
        api.get(`/materiais/?categorie=${cat.id}`),
        loadEntrepots(),
        loadUtilisateursFinal(),
      ]);
      const list = Array.isArray(resMateriais.data)
        ? resMateriais.data
        : resMateriais.data.results || [];
      setMateriais(list);
      const defaults: Record<number, string> = {};
      list.forEach((m: Materiel) => {
        if (m.stock_locations && m.stock_locations?.length === 1) {
          const loc = m.stock_locations[0];
          defaults[m.id] = loc.entrepot_id ? String(loc.entrepot_id) : '';
        }
      });
      setSelectedEntrepotIds(defaults);
    } catch (error) {
      console.error('Erro ao carregar materiais da categoria:', error);
      setMateriais([]);
    } finally {
      setMateriaisLoading(false);
    }
  };

  const toggleItem = (id: number) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    setQuantities((prev) => ({ ...prev, [id]: prev[id] || 1 }));
    setMovementTypes((prev) => ({ ...prev, [id]: prev[id] || 'ENTREE' }));
  };

  const getEntrepotOptions = (material: Materiel, type: string) => {
    if (type === 'SORTIE') {
      return (material.stock_locations || []).map((loc) => ({
        id: loc.entrepot_id ?? loc.id,
        name: loc.entrepot,
        quantite: loc.quantite,
      }));
    }
    return entrepots.map((ent) => ({
      id: ent.id,
      name: ent.nom,
      quantite: null,
    }));
  };

  const getAvailableStock = (material: Materiel, entrepotId: string) => {
    if (!entrepotId) return 0;
    const loc = (material.stock_locations || []).find(
      (l) => String(l.entrepot_id ?? l.id) === String(entrepotId)
    );
    return loc ? loc.quantite : 0;
  };

  const handleBulkMovement = async () => {
    const ids = Object.keys(selectedItems).filter((id) => selectedItems[Number(id)]);
    if (ids.length === 0) {
      alert('Selecione pelo menos um material.');
      return;
    }
    const errors: string[] = [];
    const movementRequests = [];
    const pedidoItems: Array<{ materiel_id: number; quantite_demandee: number; entrepot_id?: number }> = [];
    for (const idStr of ids) {
      const id = Number(idStr);
      const material = materiais.find((m) => m.id === id);
      const qty = Number(quantities[id] || 0);
      const type = movementTypes[id] || 'ENTREE';
      const entrepotId = selectedEntrepotIds[id] || '';

      if (!material) {
        errors.push(`Material ${id} n\u00e3o encontrado.`);
        continue;
      }
      if (!qty || qty <= 0) {
        errors.push(`Quantidade inv\u00e1lida para ${material.code}.`);
        continue;
      }
      if (!entrepotId) {
        errors.push(`Selecione um dep\u00f3sito para ${material.code}.`);
        continue;
      }
      if (type === 'SORTIE') {
        const available = getAvailableStock(material, entrepotId);
        if (available <= 0) {
          errors.push(`Sem stock dispon\u00edvel para ${material.code} neste dep\u00f3sito.`);
          continue;
        }
        if (qty > available) {
          errors.push(`Stock insuficiente para ${material.code}: dispon\u00edvel ${available}.`);
          continue;
        }
        pedidoItems.push({
          materiel_id: id,
          quantite_demandee: qty,
          entrepot_id: Number(entrepotId),
        });
        continue;
      }
      movementRequests.push(
        api.post('/movimentos/', {
          materiel_id: id,
          quantite: qty,
          type_mvt: type,
          raison: movementReason || '',
          entrepot_id: Number(entrepotId),
        })
      );
    }
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    if (pedidoItems.length > 0 && !selectedDemandeurReelId) {
      alert('Selecione a empresa demandante.');
      return;
    }
    setMovementLoading(true);
    try {
      if (pedidoItems.length > 0) {
        await api.post('/pedidos/', {
          description: movementReason || '',
          demandeur_reel_id: Number(selectedDemandeurReelId),
          items: pedidoItems,
        });
      }
      if (movementRequests.length > 0) {
        await Promise.all(movementRequests);
      }
      if (pedidoItems.length > 0 && movementRequests.length > 0) {
        alert('Pedido criado e movimentos de entrada registrados com sucesso!');
      } else if (pedidoItems.length > 0) {
        alert('Pedido criado com sucesso!');
      } else {
        alert('Movimentos criados com sucesso!');
      }
      setDetailOpen(false);
      if (pedidoItems.length > 0) {
        const goPedidos = confirm('Pedido criado. Quer abrir Pedidos para acompanhar?');
        if (goPedidos) {
          router.push('/dashboard/pedidos');
        }
      }
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.detail || error.message || 'Erro desconhecido'));
    } finally {
      setMovementLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nom: '', description: '', parent: '' });
    setModalOpen(true);
  };

  const openEdit = (cat: Categorie) => {
    setEditing(cat);
    setForm({
      nom: cat.nom,
      description: cat.description || '',
      parent: cat.parent ? String(cat.parent) : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || '',
      ...(form.parent && { parent: Number(form.parent) }),
    };

    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}/`, payload);
        alert('Categoria atualizada com sucesso!');
      } else {
        await api.post('/categories/', payload);
        alert('Categoria criada com sucesso!');
      }
      setModalOpen(false);
      load(page);
      loadAllCategories();
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* HEADER + PAGINATION TOP */}
        <div className="flex justify-between itemscenter mb-8">
          <div>
            <h1 className="text-5xl font-bold text-primary">Gestão de Categorias</h1>
            <p className="text-lg opacity-70 mt-2">
              Total: <span className="font-bold">{totalCount}</span> - Página <span className="font-bold">{page}</span> / <span className="font-bold">{totalPages}</span>
            </p>
          </div>
          <button onClick={openCreate} className="btn btn-success btn-lg shadow-lg hover:shadow-xl transition-shadow">
            + Nova Categoria
          </button>
        </div>

        {/* PAGINATION TOP */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => load(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="btn btn-outline btn-primary"
          >
            {'<'} Anterior
          </button>
          <span className="flex itemscenter font-bold">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => load(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="btn btn-outline btn-primary"
          >
            Próxima {'>'}
          </button>
        </div>

        {/* GRID DE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => openDetails(cat)}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:scale-105 rounded-2xl overflow-hidden cursor-pointer"
            >
              <div className="card-body p-6">
                <h2 className="card-title text-2xl font-extrabold text-primary">
                  {cat.nom}
                </h2>
                <p className="text-sm opacity-80 mt-2">
                  {cat.description || 'Sem descricao'}
                </p>
                {cat.parent_nom && (
                  <div className="mt-3">
                    <span className="text-xs opacity-70">Subcategoria de:</span>
                    <span className="ml-2 badge badge-outline badge-primary">{cat.parent_nom}</span>
                  </div>
                )}
                <div className="card-actions justify-end mt-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(cat);
                    }}
                    className="btn btn-warning btn-sm shadow hover:shadow-md transition-shadow"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINATION BOTTOM */}
        <div className="flex justify-center gap-4 mt-12">
          <button
            onClick={() => load(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="btn btn-outline btn-primary"
          >
            {'<'} Anterior
          </button>
          <span className="flex itemscenter font-bold">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => load(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="btn btn-outline btn-primary"
          >
            Próxima {'>'}
          </button>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg">
              <h3 className="font-bold text-2xl mb-6 text-primary">
                {editing ? 'Editar' : 'Nova'} Categoria
              </h3>

              <div className="space-y-4">
                <input
                  placeholder="Nome da categoria"
                  className="input input-bordered w-full"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />

                <textarea
                  placeholder="Descricao (opcional)"
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <select
                  className="select select-bordered w-full"
                  value={form.parent}
                  onChange={(e) => setForm({ ...form, parent: e.target.value })}
                >
                  <option value="">Nenhuma (Categoria Pai)</option>
                  {allCategories
                    .filter((c) => c.id !== editing?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} {c.parent_nom ? `(sub de ${c.parent_nom})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-action mt-8">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setEditing(null);
                  }}
                  className="btn btn-ghost"
                >
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="btn btn-success btn-lg">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {detailOpen && selectedCategory && (
          <div className="modal modal-open">
            <div className="modal-box max-w-5xl">
              <h3 className="font-bold text-2xl mb-2 text-primary">
                {selectedCategory.nom}
              </h3>
              <p className="text-sm opacity-80 mb-6">
                {selectedCategory.description || 'Sem descricao'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="form-control">
                  <label className="label"><span className="label-text">Motivo</span></label>
                  <input
                    className="input input-bordered"
                    placeholder="Motivo (opcional)"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                  />
                </div>
                {(Object.keys(selectedItems).some((id) => selectedItems[Number(id)] && (movementTypes[Number(id)] || 'ENTREE') === 'SORTIE')) && (
                  <div className="form-control md:justify-self-end">
                    <label className="label">
                      <span className="label-text font-semibold">Empresa demandante</span>
                    </label>
                    <select
                      className="select select-bordered"
                      value={selectedDemandeurReelId}
                      onChange={(e) => setSelectedDemandeurReelId(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {utilisateursFinal.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.entreprise}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="table table-zebra">
                  <thead className="bg-base-200">
                    <tr>
                      <th></th>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Stock Atual</th>
                      <th>Movimento</th>
                      <th>Depósito</th>
                      <th>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiaisLoading && (
                      <tr>
                        <td colSpan={7} className="text-center py-6">Carregando...</td>
                      </tr>
                    )}
                    {!materiaisLoading && materiais.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500">Nenhum material nesta categoria</td>
                      </tr>
                    )}
                    {!materiaisLoading && materiais.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={!!selectedItems[m.id]}
                            onChange={() => toggleItem(m.id)}
                          />
                        </td>
                        <td className="font-semibold">{m.code}</td>
                        <td>{m.description}</td>
                        <td>{m.stock_actuel ?? 0}</td>
                        <td>
                          <select
                            className="select select-bordered select-sm"
                            value={movementTypes[m.id] || 'ENTREE'}
                            onChange={(e) =>
                              setMovementTypes((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            disabled={!selectedItems[m.id]}
                          >
                            <option value="ENTREE">Entrada</option>
                            <option value="SORTIE">Saida</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="select select-bordered select-sm"
                            value={selectedEntrepotIds[m.id] || ''}
                            onChange={(e) =>
                              setSelectedEntrepotIds((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            disabled={!selectedItems[m.id]}
                          >
                            <option value="">Selecione</option>
                            {getEntrepotOptions(m, movementTypes[m.id] || 'ENTREE').map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}{opt.quantite !== null ? ` (${opt.quantite})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="input input-bordered input-sm w-24"
                            value={quantities[m.id] || 1}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [m.id]: Math.max(1, Number(e.target.value) || 1),
                              }))
                            }
                            disabled={!selectedItems[m.id]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-action mt-6">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="btn btn-ghost"
                >
                  Fechar
                </button>
                <button
                  onClick={handleBulkMovement}
                  className="btn btn-success"
                  disabled={movementLoading}
                >
                  {movementLoading ? 'Salvando...' : 'Criar Movimentos'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
