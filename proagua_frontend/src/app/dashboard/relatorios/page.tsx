'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Entrepot = { id: number; nom: string };

type StockRow = {
  stock_id: number;
  code: string;
  description: string;
  entrepot_nom: string;
  pilier: string | null;
  quantite: number;
  stock_min: number;
};

type MovimentoRow = {
  id: number;
  reference: string;
  date_mvt: string;
  type_mvt: string;
  quantite: number;
  materiel_code: string | null;
  entrepot_nom: string | null;
  demandeur: string | null;
};

type OperacaoRow = {
  id: number;
  reference: string;
  date_demande: string;
  statut: string;
  tipo_fluxo: string | null;
  demandeur: string | null;
  projeto: string | null;
  total_items: number;
  items_pendentes: number;
};

export default function RelatoriosPage() {
  const [meRole, setMeRole] = useState<string>('');
  const [meLoaded, setMeLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [entrepots, setEntrepots] = useState<Entrepot[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pilier, setPilier] = useState('');
  const [entrepot, setEntrepot] = useState('');
  const [search, setSearch] = useState('');

  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [movRows, setMovRows] = useState<MovimentoRow[]>([]);
  const [opRows, setOpRows] = useState<OperacaoRow[]>([]);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (pilier) p.pilier = pilier;
    if (entrepot) p.entrepot = entrepot;
    if (search) p.search = search;
    return p;
  }, [dateFrom, dateTo, pilier, entrepot, search]);

  const pendingOps = useMemo(
    () => opRows.filter((o) => o.items_pendentes > 0).length,
    [opRows]
  );

  const lowStock = useMemo(
    () => stockRows.filter((s) => Number(s.quantite || 0) < Number(s.stock_min || 0)).length,
    [stockRows]
  );

  const movimentoByTipo = useMemo(() => {
    const agg: Record<string, number> = {};
    movRows.forEach((m) => {
      agg[m.type_mvt] = (agg[m.type_mvt] || 0) + 1;
    });
    return Object.entries(agg)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [movRows]);

  const operacaoByStatus = useMemo(() => {
    const agg: Record<string, number> = {};
    opRows.forEach((o) => {
      agg[o.statut] = (agg[o.statut] || 0) + 1;
    });
    return Object.entries(agg)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [opRows]);

  const operacaoByFluxo = useMemo(() => {
    const agg: Record<string, number> = {};
    opRows.forEach((o) => {
      const fluxo = o.tipo_fluxo || 'SEM_FLUXO';
      agg[fluxo] = (agg[fluxo] || 0) + 1;
    });
    return Object.entries(agg)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [opRows]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, m, o] = await Promise.all([
        api.get('/relatorios/stock/', { params: queryParams }),
        api.get('/relatorios/movimentos/', { params: queryParams }),
        api.get('/relatorios/operacoes/', { params: queryParams }),
      ]);
      setStockRows(Array.isArray(s.data) ? s.data : []);
      setMovRows(Array.isArray(m.data) ? m.data : []);
      setOpRows(Array.isArray(o.data) ? o.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = (filename: string, headers: string[], rows: Array<Array<string | number | null>>) => {
    try {
      setError('');
      const escapeCell = (v: string | number | null) => {
        const s = String(v ?? '');
        if (s.includes('"') || s.includes(',') || s.includes('\n')) {
          return `"${s.replaceAll('"', '""')}"`;
        }
        return s;
      };
      const csv = [
        headers.map(escapeCell).join(','),
        ...rows.map((r) => r.map(escapeCell).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('CSV export failed:', err);
      setError(`Erro ao exportar CSV: ${err?.message || 'falha desconhecida'}`);
    }
  };

  const exportPdf = (title: string, headers: string[], rows: Array<Array<string | number | null>>) => {
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) {
      setError('Não foi possível abrir janela para exportar PDF.');
      return;
    }

    const now = new Date().toLocaleString();
    const tableHead = headers.map((h) => `<th>${h}</th>`).join('');
    const tableBody = rows
      .map(
        (r) =>
          `<tr>${r
            .map((c) => `<td>${String(c ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)
            .join('')}</tr>`
      )
      .join('');

    popup.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          h1 { margin: 0 0 8px 0; font-size: 24px; color: #0b82c8; }
          .meta { margin: 0 0 16px 0; font-size: 12px; color: #6b7280; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          @media print {
            @page { size: A4 landscape; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="meta">Gerado em: ${now}</p>
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  useEffect(() => {
    (async () => {
      try {
        const meRes = await api.get('/me/');
        setMeRole(String(meRes.data?.role || '').toUpperCase());
      } catch {
        setMeRole('');
      } finally {
        setMeLoaded(true);
      }
      try {
        const res = await api.get('/entrepots/');
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setEntrepots(list);
      } catch {
        setEntrepots([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!meLoaded || !['ADMIN', 'MANAGER'].includes(meRole)) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meRole, meLoaded]);

  if (!meLoaded) {
    return (
      <div className="p-6">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (meRole && !['ADMIN', 'MANAGER'].includes(meRole)) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>Relatórios disponíveis apenas para Manager/Admin.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <h1 className="text-3xl font-bold text-primary">Relatórios MVP</h1>
        <p className="text-sm opacity-75">Stock, Movimentos e Operações com exportação CSV.</p>
      </div>

      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input type="date" className="input input-bordered w-full" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input input-bordered w-full" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <select className="select select-bordered w-full" value={pilier} onChange={(e) => setPilier(e.target.value)}>
            <option value="">Todos os pilares</option>
            <option value="PILAR1">PILAR1</option>
            <option value="PILAR2">PILAR2</option>
            <option value="PILAR3">PILAR3</option>
          </select>
          <select className="select select-bordered w-full" value={entrepot} onChange={(e) => setEntrepot(e.target.value)}>
            <option value="">Todos os depósitos</option>
            {entrepots.map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </select>
          <input className="input input-bordered w-full md:col-span-2" placeholder="Pesquisar referência/código/descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={load} type="button" disabled={loading}>
            {loading ? 'Carregando...' : 'Aplicar filtros'}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setPilier('');
              setEntrepot('');
              setSearch('');
            }}
            type="button"
          >
            Limpar
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Linhas de stock</div>
          <div className="stat-value text-primary">{stockRows.length}</div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Stock baixo</div>
          <div className="stat-value text-warning">{lowStock}</div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Movimentos</div>
          <div className="stat-value text-secondary">{movRows.length}</div>
        </div>
        <div className="stat rounded-xl bg-base-100 border border-base-300">
          <div className="stat-title">Operações pendentes</div>
          <div className="stat-value text-info">{pendingOps}</div>
        </div>
      </div>

      <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-primary mb-4">Charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-base-300 p-3">
            <h3 className="font-semibold mb-2">Movimentos por tipo</h3>
            <BarList data={movimentoByTipo} color="bg-secondary" />
          </div>
          <div className="rounded-xl border border-base-300 p-3">
            <h3 className="font-semibold mb-2">Operações por estado</h3>
            <BarList data={operacaoByStatus} color="bg-primary" />
          </div>
          <div className="rounded-xl border border-base-300 p-3">
            <h3 className="font-semibold mb-2">Operações por fluxo</h3>
            <BarList data={operacaoByFluxo} color="bg-accent" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex itemscenter justify-between mb-3">
          <h2 className="text-xl font-semibold text-primary">Relatório de stock</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportCsv(
                  'relatorio_stock.csv',
                  ['Código', 'Descrição', 'Depósito', 'Pilar', 'Qtd', 'Mín'],
                  stockRows.map((r) => [r.code, r.description, r.entrepot_nom, r.pilier || '-', r.quantite, r.stock_min])
                )
              }
              type="button"
            >
              Exportar CSV
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportPdf(
                  'Relatório de stock',
                  ['Código', 'Descrição', 'Depósito', 'Pilar', 'Qtd', 'Mín'],
                  stockRows.map((r) => [r.code, r.description, r.entrepot_nom, r.pilier || '-', r.quantite, r.stock_min])
                )
              }
              type="button"
            >
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="table table-sm">
            <thead>
              <tr><th>Código</th><th>Descrição</th><th>Depósito</th><th>Pilar</th><th>Qtd</th><th>Mín</th></tr>
            </thead>
            <tbody>
              {stockRows.slice(0, 300).map((r) => (
                <tr key={r.stock_id}>
                  <td>{r.code}</td><td>{r.description}</td><td>{r.entrepot_nom}</td><td>{r.pilier || '-'}</td><td>{r.quantite}</td><td>{r.stock_min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex itemscenter justify-between mb-3">
          <h2 className="text-xl font-semibold text-primary">Relatório de movimentos</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportCsv(
                  'relatorio_movimentos.csv',
                  ['Referência', 'Data', 'Tipo', 'Código', 'Depósito', 'Qtd', 'Utilizador'],
                  movRows.map((r) => [
                    r.reference || '-',
                    new Date(r.date_mvt).toLocaleString(),
                    r.type_mvt,
                    r.materiel_code || '-',
                    r.entrepot_nom || '-',
                    r.quantite,
                    r.demandeur || '-',
                  ])
                )
              }
              type="button"
            >
              Exportar CSV
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportPdf(
                  'Relatório de movimentos',
                  ['Referência', 'Data', 'Tipo', 'Código', 'Depósito', 'Qtd', 'Utilizador'],
                  movRows.map((r) => [
                    r.reference || '-',
                    new Date(r.date_mvt).toLocaleString(),
                    r.type_mvt,
                    r.materiel_code || '-',
                    r.entrepot_nom || '-',
                    r.quantite,
                    r.demandeur || '-',
                  ])
                )
              }
              type="button"
            >
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="table table-sm">
            <thead>
              <tr><th>Referência</th><th>Data</th><th>Tipo</th><th>Código</th><th>Depósito</th><th>Qtd</th><th>Utilizador</th></tr>
            </thead>
            <tbody>
              {movRows.slice(0, 300).map((r) => (
                <tr key={r.id}>
                  <td>{r.reference || '-'}</td><td>{new Date(r.date_mvt).toLocaleString()}</td><td>{r.type_mvt}</td><td>{r.materiel_code || '-'}</td><td>{r.entrepot_nom || '-'}</td><td>{r.quantite}</td><td>{r.demandeur || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex itemscenter justify-between mb-3">
          <h2 className="text-xl font-semibold text-primary">Relatório de operações</h2>
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportCsv(
                  'relatorio_operacoes.csv',
                  ['Referência', 'Fluxo', 'Estado', 'Data', 'Solicitante', 'Projeto', 'Itens', 'Pendentes'],
                  opRows.map((r) => [
                    r.reference || '-',
                    r.tipo_fluxo || '-',
                    r.statut,
                    new Date(r.date_demande).toLocaleString(),
                    r.demandeur || '-',
                    r.projeto || '-',
                    r.total_items,
                    r.items_pendentes,
                  ])
                )
              }
              type="button"
            >
              Exportar CSV
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                exportPdf(
                  'Relatório de operações',
                  ['Referência', 'Fluxo', 'Estado', 'Data', 'Solicitante', 'Projeto', 'Itens', 'Pendentes'],
                  opRows.map((r) => [
                    r.reference || '-',
                    r.tipo_fluxo || '-',
                    r.statut,
                    new Date(r.date_demande).toLocaleString(),
                    r.demandeur || '-',
                    r.projeto || '-',
                    r.total_items,
                    r.items_pendentes,
                  ])
                )
              }
              type="button"
            >
              Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="table table-sm">
            <thead>
              <tr><th>Referência</th><th>Fluxo</th><th>Estado</th><th>Data</th><th>Solicitante</th><th>Projeto</th><th>Itens</th><th>Pendentes</th></tr>
            </thead>
            <tbody>
              {opRows.slice(0, 300).map((r) => (
                <tr key={r.id}>
                  <td>{r.reference || '-'}</td><td>{r.tipo_fluxo || '-'}</td><td>{r.statut}</td><td>{new Date(r.date_demande).toLocaleString()}</td><td>{r.demandeur || '-'}</td><td>{r.projeto || '-'}</td><td>{r.total_items}</td><td>{r.items_pendentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BarList({
  data,
  color,
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm opacity-70">Sem dados.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((d) => {
        const width = Math.max(4, Math.round((d.value / maxValue) * 100));
        return (
          <div key={d.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{d.label}</span>
              <span>{d.value}</span>
            </div>
            <div className="h-2 rounded bg-base-200">
              <div className={`h-2 rounded ${color}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
