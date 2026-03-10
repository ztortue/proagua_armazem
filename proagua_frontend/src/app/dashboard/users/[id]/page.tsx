'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../lib/api';

type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
type PilierAffectation = 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';

type UserDetail = {
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

function roleLabel(role?: Role) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'MANAGER') return 'Manager';
  if (role === 'CONSULTATION') return 'Consulta';
  return 'Usuário';
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [meRole, setMeRole] = useState<Role | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const userId = useMemo(() => Number(params.id || 0), [params.id]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const meRes = await api.get('/me/');
        const role = meRes.data?.role as Role | undefined;
        if (!role || (role !== 'ADMIN' && role !== 'MANAGER')) {
          router.replace('/dashboard/profile');
          return;
        }
        setMeRole(role);

        const userRes = await api.get(`/users/${userId}/`);
        setUser(userRes.data as UserDetail);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Não foi possível carregar os detalhes do utilizador.');
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isFinite(userId) || userId <= 0) {
      setError('ID de utilizador invalido.');
      setLoading(false);
      return;
    }
    loadData();
  }, [router, userId]);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="alert alert-error">{error}</div>
        <div className="mt-4">
          <Link href="/dashboard/users" className="btn btn-outline btn-sm">Voltar</Link>
        </div>
      </div>
    );
  }

  if (!user || !meRole) {
    return <div className="p-6">Sem dados.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex itemscenter justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary">Detalhes do Utilizador</h1>
          <div className="flex itemscenter gap-2">
            <Link href={`/dashboard/users?edit=${user.id}`} className="btn btn-sm btn-primary">Editar</Link>
            <Link href="/dashboard/users" className="btn btn-sm btn-outline">Voltar</Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="font-semibold text-blue-700">Username:</span> <span className="font-medium text-orange-600">{user.username}</span></div>
          <div><span className="font-semibold text-blue-700">Perfil:</span> <span className="font-medium text-orange-600">{roleLabel(user.role)}</span></div>
          <div><span className="font-semibold text-blue-700">Nome completo:</span> <span className="font-medium text-orange-600">{user.first_name} {user.last_name}</span></div>
          <div><span className="font-semibold text-blue-700">Email:</span> <span className="font-medium text-orange-600">{user.email || '-'}</span></div>
          <div><span className="font-semibold text-blue-700">Telefone:</span> <span className="font-medium text-orange-600">{user.telephone || '-'}</span></div>
          <div><span className="font-semibold text-blue-700">Cargo:</span> <span className="font-medium text-orange-600">{user.poste || '-'}</span></div>
          <div><span className="font-semibold text-blue-700">Departamento:</span> <span className="font-medium text-orange-600">{user.service || '-'}</span></div>
          <div><span className="font-semibold text-blue-700">Pilar:</span> <span className="font-medium text-orange-600">{user.pilier_affectation || 'TODOS'}</span></div>
          <div><span className="font-semibold text-blue-700">Estado:</span> <span className="font-medium text-orange-600">{user.is_active === false ? 'Inativo' : 'Ativo'}</span></div>
        </div>
      </div>
    </div>
  );
}
