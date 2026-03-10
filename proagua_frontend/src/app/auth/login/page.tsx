'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('access_token', data.access);
        alert('Login bem-sucedido!');
        router.push('/pilier');
      } else {
        alert('Usuário ou senha incorretos');
      }
    } catch (err) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card bg-base-100 shadow-2xl w-96">
        <div className="card-body">
          <h2 className="text-3xl font-bold text-center mb-8 text-primary">ProAgua ERP</h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="text"
              placeholder="Usuário"
              className="input input-bordered w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            
            <input
              type="password"
              placeholder="Senha"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? <span className="loading loading-spinner"></span> : 'Entrar'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-600">
            Suez International © 2025
          </div>
        </div>
      </div>
    </div>
  );
}
