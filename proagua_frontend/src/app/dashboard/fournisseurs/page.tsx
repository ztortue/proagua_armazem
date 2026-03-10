'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Fournisseur = {
  id: number;
  nom: string;
  contact?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  actif: boolean;
};

type FormState = {
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  adresse: string;
  actif: boolean;
};

const emptyForm: FormState = {
  nom: '',
  contact: '',
  telephone: '',
  email: '',
  adresse: '',
  actif: true,
};

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const res = await api.get('/fournisseurs/');
      const data = res.data;
      setFournisseurs(Array.isArray(data) ? data : (data?.results || []));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim()) {
      setError('Nome do fornecedor é obrigatório.');
      return;
    }

    setError('');
    try {
      if (editing) {
        await api.patch(`/fournisseurs/${editing.id}/`, form);
      } else {
        await api.post('/fournisseurs/', form);
      }
      closeModal();
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao salvar fornecedor.');
    }
  };

  const toggleActif = async (id: number, actif: boolean) => {
    setError('');
    try {
      await api.patch(`/fournisseurs/${id}/`, { actif: !actif });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao alterar status do fornecedor.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between itemscenter">
        <h1 className="text-4xl font-bold text-primary">Gestão de Fornecedores</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}
          className="btn btn-success btn-lg"
          type="button"
        >
          + Novo Fornecedor
        </button>
      </div>

      {error && (
        <div className="alert alert-error shadow-sm">
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => (
              <tr key={f.id}>
                <td className="font-semibold">{f.nom}</td>
                <td>{f.contact || '-'}</td>
                <td>{f.telephone || '-'}</td>
                <td>{f.email || '-'}</td>
                <td>
                  <span className={`badge ${f.actif ? 'badge-success' : 'badge-error'}`}>
                    {f.actif ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(f);
                      setForm({
                        nom: f.nom || '',
                        contact: f.contact || '',
                        telephone: f.telephone || '',
                        email: f.email || '',
                        adresse: f.adresse || '',
                        actif: f.actif,
                      });
                      setModalOpen(true);
                    }}
                    className="btn btn-sm btn-outline"
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActif(f.id, f.actif)}
                    className={`btn btn-sm ${f.actif ? 'btn-error' : 'btn-success'}`}
                    type="button"
                  >
                    {f.actif ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
            {fournisseurs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-base-content/60">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-2xl font-bold mb-4">
              {editing ? 'Editar' : 'Novo'} Fornecedor
            </h3>

            <div className="space-y-3">
              <input
                placeholder="Nome"
                className="input input-bordered w-full"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
              <input
                placeholder="Contato"
                className="input input-bordered w-full"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
              <input
                placeholder="Telefone"
                className="input input-bordered w-full"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="input input-bordered w-full"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <textarea
                placeholder="Endereço"
                className="textarea textarea-bordered w-full"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>

            <div className="modal-action">
              <button onClick={closeModal} className="btn" type="button">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="btn btn-success" type="button">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
