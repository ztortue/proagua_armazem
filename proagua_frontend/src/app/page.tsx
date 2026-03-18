'use client';
// ============================================================
// CORRECTION — proagua_frontend/src/app/page.tsx  (root login)
//
// BUG CORRIGÉ : refresh_token pa t ap sove
// Ce fichier et auth/login/page.tsx font la même chose.
// Idéalement garder seulement UNE page login (page.tsx ici
// car elle a le meilleur design avec image de fond).
// ============================================================

import { useState } from 'react';

export default function LoginPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ FIX CRITIQUE : les deux tokens doivent être sauvegardés
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh); // ← te manke !
        window.location.href = '/pilier';
      } else {
        const msg = data?.detail || data?.non_field_errors?.[0] || 'Usuário ou senha incorretos';
        setError(msg);
      }
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/img2Login.jpg"
          alt="ProAgua - Suez International"
          className="w-full h-full object-cover brightness-110"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">

          {/* Côté gauche */}
          <div className="text-white">
            <h1 className="text-6xl md:text-7xl font-bold mb-4 drop-shadow-2xl">
              Pro<span className="text-primary">Agua</span>
            </h1>
            <p className="text-xl md:text-2xl font-light tracking-wide drop-shadow-lg">
              Faça o login para acessar a Gestão de Estoque
            </p>
            <div className="mt-8 opacity-90">
              <p className="text-lg">Suez International • Angola</p>
              <p className="text-sm mt-2">© 2025 Todos os direitos reservados</p>
            </div>
          </div>

          {/* Côté droit — Formulaire */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 max-w-md mx-auto border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Bem-vindo de volta</h2>
              <p className="text-gray-600 mt-2">Entre com suas credenciais</p>
            </div>

            {/* ✅ Erreur inline au lieu de alert() */}
            {error && (
              <div className="alert alert-error mb-4 text-sm">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  placeholder="Nome de usuário"
                  className="input input-bordered w-full bg-white/70"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered w-full bg-white/70"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
