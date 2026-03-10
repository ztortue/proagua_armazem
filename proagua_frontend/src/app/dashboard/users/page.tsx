'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../lib/api';

type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
type PilierAffectation = 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';

type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  telephone?: string;
  poste?: string;
  service?: string;
  role: Role;
  pilier_affectation?: PilierAffectation;
  is_active?: boolean;
};

type Me = User;

type UserForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string;
  poste: string;
  service: string;
  role: Role;
  pilier_affectation: PilierAffectation;
  is_active: boolean;
  password: string;
};

const emptyForm: UserForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  telephone: '',
  poste: '',
  service: '',
  role: 'USER',
  pilier_affectation: 'TODOS',
  is_active: true,
  password: '',
};

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'TODOS' | Role>('TODOS');
  const [pilierFilter, setPilierFilter] = useState<'TODOS' | PilierAffectation>('TODOS');
  const [activeFilter, setActiveFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [autoEditDone, setAutoEditDone] = useState(false);

  const canManageUsers = useMemo(() => {
    return me?.role === 'ADMIN' || me?.role === 'MANAGER';
  }, [me]);

  const canEditUser = (target: User) => {
    if (!me) return false;
    if (me.role === 'ADMIN') return true;
    // Manager ne peut pas modifier les comptes privilegies ni comptes globaux.
    if (me.role === 'MANAGER') {
      return (
        target.role === 'USER' ||
        target.role === 'CONSULTATION'
      ) && (target.pilier_affectation || 'TODOS') !== 'TODOS';
    }
    return false;
  };

  async function loadMe() {
    setLoadingMe(true);
    setError('');
    try {
      const { data } = await api.get<Me>('/me/');
      setMe(data);
    } catch {
      setError('Não foi possível verificar o utilizador autenticado. Inicie sessão novamente.');
    } finally {
      setLoadingMe(false);
    }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setError('');
    try {
      const { data } = await api.get<User[] | { results: User[] }>('/users/');
      const rows = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
      setUsers(rows);
    } catch {
      setError('Não foi possível carregar a lista de utilizadores. Verifique as permissoes.');
    } finally {
      setLoadingUsers(false);
    }
  }

  function resetForm() {
    if (me?.role === 'MANAGER') {
      const managerHasGlobalPilier = me.pilier_affectation === 'TODOS';
      setForm({
        ...emptyForm,
        role: 'USER',
        pilier_affectation: (managerHasGlobalPilier
          ? 'PILAR1'
          : (me.pilier_affectation || 'PILAR1')) as PilierAffectation,
      });
      setEditingUser(null);
      return;
    }
    setForm(emptyForm);
    setEditingUser(null);
  }

  function startEdit(u: User) {
    setSuccess('');
    setError('');
    if (!canEditUser(u)) {
      setError('Não tem permissao para editar este utilizador.');
      return;
    }
    setEditingUser(u);
    setForm({
      username: u.username ?? '',
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      email: u.email ?? '',
      telephone: u.telephone ?? '',
      poste: u.poste ?? '',
      service: u.service ?? '',
      role: u.role ?? 'USER',
      pilier_affectation: u.pilier_affectation ?? 'TODOS',
      is_active: u.is_active !== false,
      password: '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username.trim()) return setError('Username obrigatório.');
    if (!form.email.trim()) return setError('Email obrigatório.');
    if (!editingUser && !form.password.trim())
      return setError('Password obrigatória para criar utilizador.');

    const payload: Record<string, unknown> = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      poste: form.poste.trim(),
      service: form.service.trim(),
      role: me?.role === 'MANAGER' ? 'USER' : form.role,
      pilier_affectation:
        me?.role === 'MANAGER'
          ? me.pilier_affectation === 'TODOS'
            ? form.pilier_affectation
            : me.pilier_affectation || 'PILAR1'
          : form.pilier_affectation,
      is_active: form.is_active,
    };

    if (form.password.trim()) payload.password = form.password;

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}/`, payload);
        setSuccess('Utilizador atualizado com sucesso.');
      } else {
        await api.post('/users/', payload);
        setSuccess('Utilizador criado com sucesso.');
      }
      resetForm();
      await loadUsers();
    } catch {
      setError('Falha na operação. Verifique os dados e as permissoes.');
    }
  }

  async function deleteUser(id: number) {
    setError('');
    setSuccess('');
    const ok = window.confirm('Deseja apagar este utilizador?');
    if (!ok) return;
    try {
      await api.delete(`/users/${id}/`);
      setSuccess('Utilizador removido com sucesso.');
      await loadUsers();
    } catch {
      setError('Não foi possível apagar o utilizador. Verifique as permissoes.');
    }
  }

  useEffect(() => { loadMe(); }, []);

  useEffect(() => {
    if (!loadingMe && me) {
      if (!canManageUsers) {
        router.replace('/dashboard/profile');
        return;
      }
      loadUsers();
    }
  }, [loadingMe, me, canManageUsers, router]);

  useEffect(() => {
    if (me?.role === 'MANAGER') {
      const managerHasGlobalPilier = me.pilier_affectation === 'TODOS';
      setForm((prev) => ({
        ...prev,
        role: 'USER',
        pilier_affectation: (managerHasGlobalPilier
          ? prev.pilier_affectation || 'PILAR1'
          : me.pilier_affectation || 'PILAR1') as PilierAffectation,
      }));
    }
  }, [me]);

  useEffect(() => {
    if (loadingUsers || autoEditDone) return;
    const editParam = searchParams.get('edit');
    if (!editParam) return;
    const targetId = Number(editParam);
    if (!Number.isFinite(targetId)) return;
    const target = users.find((u) => u.id === targetId);
    if (target && canEditUser(target)) {
      startEdit(target);
      router.replace('/dashboard/users');
      setAutoEditDone(true);
    }
  }, [loadingUsers, autoEditDone, searchParams, users, router]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'TODOS' && u.role !== roleFilter) return false;
      if (pilierFilter !== 'TODOS' && (u.pilier_affectation || 'TODOS') !== pilierFilter) return false;
      if (activeFilter === 'ATIVO' && u.is_active === false) return false;
      if (activeFilter === 'INATIVO' && u.is_active !== false) return false;
      if (!q) return true;
      const full = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        full.includes(q) ||
        (u.service || '').toLowerCase().includes(q) ||
        (u.poste || '').toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter, pilierFilter, activeFilter]);

  if (loadingMe) return <div className="p-6">Loading...</div>;
  if (!me) return <div className="p-6 text-red-600">{error || 'Sem autenticacao.'}</div>;
  if (!canManageUsers) return <div className="p-6">Redirecting...</div>;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h1 className="text-3xl font-bold text-primary">Gestão de Utilizadores</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Conectado como: <b>{me.username}</b> ({me.role})
        </p>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 shadow-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 rounded-xl border border-green-300 bg-green-50 text-green-700 shadow-sm">{success}</div>
          )}
        </div>
      )}

      <form onSubmit={submitForm} className="rounded-2xl border border-base-300 bg-base-100 p-5 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          {editingUser ? `Editar: ${editingUser.username}` : 'Criar Utilizador'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-sm font-medium">Username</div>
            <input className="input input-bordered w-full" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Email</div>
            <input className="input input-bordered w-full" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Telefone</div>
            <input className="input input-bordered w-full" value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Prenome</div>
            <input className="input input-bordered w-full" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Apelido</div>
            <input className="input input-bordered w-full" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Cargo</div>
            <input className="input input-bordered w-full" value={form.poste}
              onChange={(e) => setForm({ ...form, poste: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Departamento</div>
            <input className="input input-bordered w-full" value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })} />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Perfil</div>
            <select className="input input-bordered w-full" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              disabled={me?.role === 'MANAGER'}>
              <option value="USER">Usuário</option>
              <option value="CONSULTATION">Consulta</option>
              {me?.role === 'ADMIN' && <option value="MANAGER">Gestor</option>}
              {me?.role === 'ADMIN' && <option value="ADMIN">Administrador</option>}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Pilar de Afetacao</div>
            <select className="input input-bordered w-full" value={form.pilier_affectation}
              onChange={(e) => setForm({ ...form, pilier_affectation: e.target.value as PilierAffectation })}
              disabled={me?.role === 'MANAGER' && me?.pilier_affectation !== 'TODOS'}>
              {me?.role === 'MANAGER' && me?.pilier_affectation !== 'TODOS' ? (
                <option value={me.pilier_affectation || 'PILAR1'}>
                  {me.pilier_affectation || 'PILAR1'}
                </option>
              ) : (
                <>
                  <option value="PILAR1">Pilar 1 - ETA Kifangondo</option>
                  <option value="PILAR2">Pilar 2</option>
                  <option value="PILAR3">Pilar 3</option>
                  {me?.role !== 'MANAGER' && <option value="TODOS">Todos os Pilares</option>}
                </>
              )}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Estado</div>
            <select
              className="input input-bordered w-full"
              value={form.is_active ? 'ATIVO' : 'INATIVO'}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === 'ATIVO' })}
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Senha {editingUser ? '(opcional)' : '(obrigatoria)'}</div>
            <input className="input input-bordered w-full" type="password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary px-6" type="submit">
            {editingUser ? 'Guardar' : 'Criar'}
          </button>
          <button className="btn btn-outline" type="button" onClick={resetForm}>
            Cancelar
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex itemscenter justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">Utilizadores ({filteredUsers.length}/{users.length})</h2>
          <button className="btn btn-sm btn-outline" onClick={loadUsers} type="button">
            Atualizar
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input input-bordered w-full"
            placeholder="Pesquisar username, nome, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select select-bordered w-full" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
            <option value="TODOS">Todos perfis</option>
            <option value="ADMIN">Administrador</option>
            <option value="MANAGER">Gestor</option>
            <option value="USER">Usuário</option>
            <option value="CONSULTATION">Consulta</option>
          </select>
          <select className="select select-bordered w-full" value={pilierFilter} onChange={(e) => setPilierFilter(e.target.value as any)}>
            <option value="TODOS">Todos pilares</option>
            <option value="PILAR1">PILAR1</option>
            <option value="PILAR2">PILAR2</option>
            <option value="PILAR3">PILAR3</option>
          </select>
          <select className="select select-bordered w-full" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)}>
            <option value="TODOS">Ativos + Inativos</option>
            <option value="ATIVO">So ativos</option>
            <option value="INATIVO">So inativos</option>
          </select>
        </div>

        {loadingUsers ? (
          <div>Carregando...</div>
        ) : (
          <div className="overflow-auto rounded-xl border border-base-300">
            <table className="table table-zebra min-w-full">
              <thead>
                <tr className="text-left">
                  <th>Username</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Pilar</th>
                  <th>Departamento</th>
                  <th>Cargo</th>
                  <th>Estado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td>
                      <Link href={`/dashboard/users/${u.id}`} className="link link-primary font-medium">
                        {u.username}
                      </Link>
                    </td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.pilier_affectation || 'TODOS'}</td>
                    <td>{u.service || '-'}</td>
                    <td>{u.poste || '-'}</td>
                    <td>
                      <span className={`badge ${u.is_active === false ? 'badge-warning' : 'badge-success'}`}>
                        {u.is_active === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/users/${u.id}`} className="btn btn-xs btn-outline">
                          Detalhes
                        </Link>
                        {me?.role === 'ADMIN' && (
                          <button className="btn btn-xs btn-outline border-red-400 text-red-700 hover:bg-red-50"
                            onClick={() => deleteUser(u.id)} type="button">
                            Apagar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="p-2 text-gray-400" colSpan={9}>
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
