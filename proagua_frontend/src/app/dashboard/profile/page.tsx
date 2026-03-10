'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';

type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
type PilierAffectation = 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';

type Me = {
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

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const roleLabel = useMemo(() => {
    switch (me?.role) {
      case 'ADMIN':
        return 'Admin';
      case 'MANAGER':
        return 'Manager';
      case 'CONSULTATION':
        return 'Consulta';
      default:
        return 'Usuário';
    }
  }, [me?.role]);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await api.get('/me/');
        setMe(res.data);
      } catch (err: any) {
        setError('Erro ao carregar perfil: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, []);

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordError('Preencha a senha atual e a nova senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmacao não confere.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/users/me/password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMessage('Senha atualizada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Erro ao atualizar senha.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error max-w-md mx-auto mt-20 shadow-xl rounded-xl">
        <span>{error}</span>
      </div>
    );
  }

  if (!me) {
    return <div className="alert alert-warning max-w-md mx-auto mt-20">Nenhum dado encontrado.</div>;
  }

  const canManageUsers = me.role === 'ADMIN' || me.role === 'MANAGER';

  return (
    <div className="p-8 min-h-screen">
      <div className="card max-w-2xl mx-auto bg-base-100 shadow-2xl rounded-xl overflow-hidden">
        <div className="card-header bg-primary text-primary-content p-6">
          <h1 className="card-title text-3xl font-bold">Meu Perfil</h1>
          <p className="text-sm opacity-80">{me.username}</p>
        </div>

        <div className="card-body p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold text-blue-700">Nome completo:</span> <span className="font-medium text-orange-600">{me.first_name} {me.last_name}</span></div>
            <div><span className="font-semibold text-blue-700">Perfil:</span> <span className="font-medium text-orange-600">{roleLabel}</span></div>
            <div><span className="font-semibold text-blue-700">Email:</span> <span className="font-medium text-orange-600">{me.email || '-'}</span></div>
            <div><span className="font-semibold text-blue-700">Telefone:</span> <span className="font-medium text-orange-600">{me.telephone || '-'}</span></div>
            <div><span className="font-semibold text-blue-700">Cargo:</span> <span className="font-medium text-orange-600">{me.poste || 'Não definido'}</span></div>
            <div><span className="font-semibold text-blue-700">Service:</span> <span className="font-medium text-orange-600">{me.service || 'Não definido'}</span></div>
            <div><span className="font-semibold text-blue-700">Pilar:</span> <span className="font-medium text-orange-600">{me.pilier_affectation || 'TODOS'}</span></div>
            <div><span className="font-semibold text-blue-700">Estado:</span> <span className="font-medium text-orange-600">{me.is_active === false ? 'Inativo' : 'Ativo'}</span></div>
          </div>

          {canManageUsers && (
            <div className="mt-6">
              <Link
                href="/dashboard/users"
                className="btn btn-success btn-block shadow-md hover:shadow-lg transition-shadow"
              >
                Ir para Gestão de Usuários
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="card max-w-2xl mx-auto bg-base-100 shadow-2xl rounded-xl overflow-hidden mt-8">
        <div className="card-header bg-base-200 p-6">
          <h2 className="text-2xl font-bold text-primary">Alterar Senha</h2>
          <p className="text-sm opacity-80">Somente voce pode trocar sua senha.</p>
        </div>
        <div className="card-body p-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <input
              type="password"
              placeholder="Senha atual"
              className="input input-bordered w-full"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Nova senha"
              className="input input-bordered w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              className="input input-bordered w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {passwordError && (
              <div className="alert alert-error">
                <span>{passwordError}</span>
              </div>
            )}
            {passwordMessage && (
              <div className="alert alert-success">
                <span>{passwordMessage}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={passwordLoading}>
              {passwordLoading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
