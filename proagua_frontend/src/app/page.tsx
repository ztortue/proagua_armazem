// src/app/page.tsx
'use client';

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
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        window.location.href = '/pilier';
      } else {
        setError('Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background pi klè */}
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
          
          {/* Bò goch */}
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

          {/* Bò dwat - Fòm plis transparan */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 max-w-md mx-auto border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Bem-vindo de volta</h2>
              <p className="text-gray-600 mt-2">Entre com suas credenciais</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="label">
                  <span className="label-text font-semibold">Usuário</span>
                </label>
                <input
                  type="text"
                  placeholder="Digite seu usuário"
                  className="input input-bordered w-full bg-white/70"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-semibold">Senha</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered w-full bg-white/70"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="alert alert-error shadow-lg text-sm">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`btn w-full h-12 text-lg font-semibold
                  ${loading 
                    ? 'btn-disabled loading' 
                    : 'btn-primary hover:btn-accent shadow-lg hover:shadow-xl transition-all'
                  }`}
              >
                {loading ? 'Conectando...' : 'Entrar no Sistema'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
