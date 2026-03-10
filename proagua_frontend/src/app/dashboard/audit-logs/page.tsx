'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type AuditRow = {
  id: number;
  timestamp: string;
  user: number | null;
  user_username: string;
  user_full_name: string;
  action: string;
  module: string;
  model_name: string;
  object_id: number;
  reference: string;
  changes: string;
};

type UserOption = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export default function AuditLogsPage() {
  const [meRole, setMeRole] = useState('');
  const [loadedRole, setLoadedRole] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [action, setAction] = useState('');
  const [moduleValue, setModuleValue] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');

  const totalPages = Math.max(1, Math.ceil(count / 10));

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page };
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (action) p.action = action;
    if (moduleValue) p.module = moduleValue;
    if (userId) p.user = userId;
    if (search) p.search = search;
    return p;
  }, [page, dateFrom, dateTo, action, moduleValue, userId, search]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Paginated<AuditRow> | AuditRow[]>('/audit-logs/', { params });
      if (Array.isArray(res.data)) {
        setRows(res.data);
        setCount(res.data.length);
      } else {
        setRows(Array.isArray(res.data.results) ? res.data.results : []);
        setCount(Number(res.data.count || 0));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      setError('');
      const res = await api.get('/audit-logs/export-csv/', {
        params: { ...params, page: undefined },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_log.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao exportar CSV de auditoria.');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await api.get('/me/');
        setMeRole(String(meRes.data?.role || '').toUpperCase());
      } catch {
        setMeRole('');
      } finally {
        setLoadedRole(true);
      }

      try {
        const usersRes = await api.get('/users/');
        const data = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.results || [];
        setUsers(data);
      } catch {
        setUsers([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRole || meRole !== 'ADMIN') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedRole, meRole, page]);

  if (!loadedRole) {
    return (
      <div className="p-6">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (meRole !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>Journal de auditoria disponível apenas para ADMIN.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h1 className="text-3xl font-bold text-primary">Journal de Auditoria</h1>
        <p className="text-sm opacity-75">Rastreio de ações criticas (create/update/delete/válidação/entrega/recebimento).</p>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="date" className="input input-bordered w-full" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input input-bordered w-full" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select className="select select-bordered w-full" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Todas as ações</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="VALIDACAO">VALIDACAO</option>
            <option value="APROVACAO">APROVACAO</option>
            <option value="RECUSA">RECUSA</option>
            <option value="ENTREGA">ENTREGA</option>
            <option value="RECEBIMENTO">RECEBIMENTO</option>
          </select>
          <select className="select select-bordered w-full" value={moduleValue} onChange={(e) => setModuleValue(e.target.value)}>
            <option value="">Todos modulos</option>
            <option value="OPERACOES">OPERACOES</option>
            <option value="MATERIAIS">MATERIAIS</option>
            <option value="MOVIMENTOS">MOVIMENTOS</option>
            <option value="ESTOQUE">ESTOQUE</option>
            <option value="USUARIOS">USUARIOS</option>
          </select>
          <select className="select select-bordered w-full" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Todos utilizadores</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username}
              </option>
            ))}
          </select>
          <input
            className="input input-bordered w-full"
            placeholder="Pesquisar referencia / detalhe"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setPage(1);
              load();
            }}
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Aplicar filtros'}
          </button>
          <button className="btn btn-outline" type="button" onClick={exportCsv}>
            Exportar CSV
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm overflow-auto">
        <table className="table table-zebra min-w-full">
          <thead>
            <tr>
              <th>Data</th>
              <th>Utilizador</th>
              <th>Ação</th>
              <th>Módulo</th>
              <th>Objeto</th>
              <th>Referência</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.timestamp).toLocaleString()}</td>
                <td>{r.user_full_name || r.user_username || '-'}</td>
                <td>{r.action}</td>
                <td>{r.module || '-'}</td>
                <td>{`${r.model_name} #${r.object_id}`}</td>
                <td>{r.reference || '-'}</td>
                <td className="max-w-[360px] whitespace-normal break-words">{r.changes || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-base-content/60">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex itemscenter gap-2">
        <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Anterior
        </button>
        <span className="text-sm">Página {page} / {totalPages} - Total {count}</span>
        <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Próxima
        </button>
      </div>
    </div>
  );
}
