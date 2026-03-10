'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardContent from '../dashboard/DashboardContent';
import { getUserFromToken } from '../dashboard/lib/api';
import { LogoutButton } from '../dashboard/LogoutButton';

type UserInfo = {
  first_name?: string;
  last_name?: string;
  username?: string;
};

export default function PilierLandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setUser(getUserFromToken());
  }, [router]);

  const fullName = useMemo(() => {
    if (!user) return 'Utilizador';
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username || 'Utilizador';
  }, [user]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-10"
        style={{ backgroundImage: "url('/proagualogo.png')" }}
      />
      <header className="navbar bg-base-100 shadow-sm px-6 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <img src="/suezlogo.png" alt="Suez" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-primary">Selecao de Pilar</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img src="/EPAL-logo.jpeg" alt="EPAL" className="h-8 w-auto rounded-sm" />
          <span className="text-sm opacity-75">Conectado: {fullName}</span>
          <Link href="/dashboard/profile" className="btn btn-ghost btn-sm">
            Perfil
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm opacity-70 mb-8">
            Escolha um pilar para abrir o fluxo de navegacao.
          </p>
          <DashboardContent />
        </div>
      </main>

      <footer className="border-t border-base-300 bg-base-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm opacity-70">
          Todos os direitos reservados - Pro Agua
        </div>
      </footer>
    </div>
  );
}
