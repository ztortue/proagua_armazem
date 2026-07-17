'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

type Mouvement = {
  id: number;
  reference: string;
  date_mvt: string;
  quantite: number;
  materiel: string;
  entrepot: string;
  demandeur: string;
  raison: string;
  site_intervention: string;
  pilier_intervention: string;
};

type GroupedSite = {
  site: string;
  pilier: string;
  mouvements: Mouvement[];
};

const PILIER_LABELS: Record<string, string> = {
  PILAR1: 'Pilar 1 — ETA Kifangondo',
  PILAR2: 'Pilar 2 — CD Marçal',
  PILAR3: 'Pilar 3',
};

const PILIER_COLORS: Record<string, string> = {
  PILAR1: 'badge-primary',
  PILAR2: 'badge-secondary',
  PILAR3: 'badge-accent',
};

function groupBySite(mouvements: Mouvement[]): GroupedSite[] {
  const map = new Map<string, GroupedSite>();
  for (const m of mouvements) {
    const key = m.site_intervention || '(site não informado)';
    if (!map.has(key)) {
      map.set(key, { site: key, pilier: m.pilier_intervention, mouvements: [] });
    }
    map.get(key)!.mouvements.push(m);
  }
  return Array.from(map.values());
}

export default function PorSitePage() {
  const [query, setQuery] = useState('');
  const [pilierFilter, setPilierFilter] = useState('');
  const [results, setResults] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSelectedIds(new Set());

    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ site: q });
        if (pilierFilter) params.set('pilier', pilierFilter);
        const res = await api.get(`/movimentos/?${params.toString()}`);
        const data = res.data;
        const items: Mouvement[] = Array.isArray(data) ? data : (data?.results ?? []);
        setResults(items);
        setSearched(true);
      } catch {
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, pilierFilter]);

  const grouped = groupBySite(results);
  const selectedItems = results.filter((m) => selectedIds.has(m.id));
  const selectedGrouped = groupBySite(selectedItems);
  const allSelected = results.length > 0 && selectedIds.size === results.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < results.length;

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(group: GroupedSite) {
    const ids = group.mouvements.map((m) => m.id);
    const allGroupSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allGroupSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(results.map((m) => m.id)));
  }

  return (
    <>
      <style>{`
        @media screen { #print-area { display: none; } }
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 24px; font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          .pt-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
          .pt-header h1 { font-size: 17px; font-weight: bold; margin: 0 0 4px; }
          .pt-header p { font-size: 11px; color: #555; margin: 2px 0; }
          .pt-site { font-size: 13px; font-weight: bold; margin-top: 18px; border-bottom: 1px solid #aaa; padding-bottom: 3px; }
          .pt-count { font-size: 10px; font-weight: normal; margin-left: 8px; color: #555; }
          .pt-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .pt-table th { background: #e8e8e8; font-size: 10px; font-weight: 600; border: 1px solid #bbb; padding: 3px 6px; text-align: left; }
          .pt-table td { font-size: 10px; border: 1px solid #ccc; padding: 3px 6px; }
          .pt-table td.right { text-align: right; font-weight: bold; }
          .pt-footer { margin-top: 20px; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 5px; }
        }
      `}</style>

      {/* Zone d'impression — cachée à l'écran */}
      <div id="print-area">
        <div className="pt-header">
          <h1>ProAgua ERP — Rastreabilidade por Local de Intervenção</h1>
          <p>Pesquisa: &quot;{query}&quot;{pilierFilter ? ` | Pilar: ${PILIER_LABELS[pilierFilter] ?? pilierFilter}` : ''}</p>
          <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
          <p>{selectedItems.length} movimento(s) selecionado(s) em {selectedGrouped.length} local(ais)</p>
        </div>
        {selectedGrouped.map((group) => (
          <div key={group.site}>
            <div className="pt-site">
              📍 {group.site}
              {group.pilier ? ` — ${PILIER_LABELS[group.pilier] ?? group.pilier}` : ''}
              <span className="pt-count">({group.mouvements.length} saída(s))</span>
            </div>
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Referência</th>
                  <th>Data</th>
                  <th>Material</th>
                  <th>Qtd</th>
                  <th>Depósito</th>
                  <th>Operador</th>
                </tr>
              </thead>
              <tbody>
                {group.mouvements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.reference || '—'}</td>
                    <td>{new Date(m.date_mvt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{m.materiel}</td>
                    <td className="right">{m.quantite}</td>
                    <td>{m.entrepot || '—'}</td>
                    <td>{m.demandeur || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="pt-footer">ProAgua ERP v3.0 — Suez International — {new Date().toLocaleDateString('pt-BR')}</div>
      </div>

      {/* Interface principale */}
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <span>📍</span> Rastreabilidade por Local de Intervenção
            </h1>
            <p className="text-base-content/60 mt-1 text-sm">
              Pesquise pelo local onde o material foi instalado ou utilizado.
            </p>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary gap-2 self-start shadow-md"
            >
              <span>🖨️</span>
              Exportar PDF
              <span className="badge badge-primary-content badge-sm font-bold">{selectedIds.size}</span>
            </button>
          )}
        </div>

        {/* Barra de pesquisa + filtro Pilar */}
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold text-base">Local / Endereço de Intervenção</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  className="input input-bordered w-full pl-10 text-base"
                  placeholder="Ex: Nova Vida, Bairro 22, Kifangondo Nord…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg">🔍</span>
              </div>
              {query.trim().length > 0 && query.trim().length < 3 && (
                <label className="label">
                  <span className="label-text-alt text-warning">Escreva pelo menos 3 caracteres para pesquisar.</span>
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-base-content/70">Pilar:</span>
              {[
                { value: '', label: 'Todos' },
                { value: 'PILAR1', label: 'Pilar 1' },
                { value: 'PILAR2', label: 'Pilar 2' },
                { value: 'PILAR3', label: 'Pilar 3' },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPilierFilter(p.value)}
                  className={`btn btn-sm ${pilierFilter === p.value ? 'btn-primary' : 'btn-outline'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* États */}
        {loading && (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}
        {error && <div className="alert alert-error"><span>{error}</span></div>}
        {!loading && !searched && query.trim().length < 3 && (
          <div className="flex flex-col items-center justify-center py-16 text-base-content/40 gap-3">
            <span className="text-6xl">📍</span>
            <p className="text-lg">Indique um local de intervenção para pesquisar.</p>
            <p className="text-sm">Ex: nome do bairro, rua, referência de rede…</p>
          </div>
        )}
        {!loading && searched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-base-content/40 gap-3">
            <span className="text-5xl">🔎</span>
            <p className="text-lg">Nenhum material encontrado para este local.</p>
            <p className="text-sm">Verifique a ortografia ou tente um termo diferente.</p>
          </div>
        )}

        {/* Barre de sélection globale */}
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between gap-4 bg-base-200 rounded-xl px-4 py-2.5 flex-wrap">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
              />
              <span className="text-sm font-medium">
                {allSelected ? 'Desselecionar tudo' : 'Selecionar tudo'}
                <span className="text-base-content/50 ml-1">({results.length} movimentos)</span>
              </span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm text-primary font-semibold">
                {selectedIds.size} selecionado(s)
              </span>
            )}
          </div>
        )}

        {/* Resultados agrupados por site */}
        {!loading && grouped.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-base-content/60">
              {results.length} movimento(s) encontrado(s) em {grouped.length} local(ais).
            </p>

            {grouped.map((group) => {
              const groupIds = group.mouvements.map((m) => m.id);
              const allGroupSelected = groupIds.every((id) => selectedIds.has(id));
              const someGroupSelected = groupIds.some((id) => selectedIds.has(id)) && !allGroupSelected;

              return (
                <div key={group.site} className="card bg-base-100 border border-base-300 shadow-sm">
                  <div className="card-body pb-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-primary checkbox-sm"
                            checked={allGroupSelected}
                            ref={(el) => { if (el) el.indeterminate = someGroupSelected; }}
                            onChange={() => toggleGroup(group)}
                          />
                        </label>
                        <span className="text-xl">📍</span>
                        <div>
                          <p className="font-semibold text-base leading-tight">{group.site}</p>
                          <p className="text-xs text-base-content/50 mt-0.5">{group.mouvements.length} saída(s)</p>
                        </div>
                      </div>
                      {group.pilier && (
                        <span className={`badge badge-sm ${PILIER_COLORS[group.pilier] ?? 'badge-ghost'}`}>
                          {PILIER_LABELS[group.pilier] ?? group.pilier}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr className="bg-base-200 text-xs">
                          <th className="w-8" />
                          <th>Referência</th>
                          <th>Data</th>
                          <th>Material</th>
                          <th className="text-right">Qtd</th>
                          <th>Depósito</th>
                          <th>Operador</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.mouvements.map((m) => (
                          <tr
                            key={m.id}
                            className={`cursor-pointer transition-colors ${
                              selectedIds.has(m.id) ? 'bg-primary/8' : 'hover:bg-base-200/50'
                            }`}
                            onClick={() => toggleOne(m.id)}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-xs"
                                checked={selectedIds.has(m.id)}
                                onChange={() => toggleOne(m.id)}
                              />
                            </td>
                            <td className="font-mono text-xs text-primary font-semibold whitespace-nowrap">
                              {m.reference || '—'}
                            </td>
                            <td className="text-xs whitespace-nowrap">
                              {new Date(m.date_mvt).toLocaleDateString('pt-BR')}
                              <br />
                              <span className="opacity-50">
                                {new Date(m.date_mvt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="max-w-xs">
                              <p className="font-medium text-xs leading-tight">{m.materiel}</p>
                            </td>
                            <td className="text-right font-bold text-sm">{m.quantite}</td>
                            <td className="text-xs opacity-70 whitespace-nowrap">{m.entrepot || '—'}</td>
                            <td className="text-xs opacity-70 whitespace-nowrap">{m.demandeur || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
