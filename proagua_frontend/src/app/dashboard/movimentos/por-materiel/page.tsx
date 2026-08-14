'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api';

type Materiel = {
  id: number;
  code: string;
  description: string;
};

type Mouvement = {
  id: number;
  reference: string;
  date_mvt: string;
  type_mvt: string;
  quantite: number;
  raison: string;
  materiel: string;
  materiel_id_value: number;
  materiel_code: string;
  entrepot: string;
  demandeur: string;
  site_intervention: string;
};

type GroupedMateriel = {
  materiel_id: number;
  materiel_label: string;
  materiel_code: string;
  mouvements: Mouvement[];
};

const TYPE_MVT_LABELS: Record<string, { label: string; color: string }> = {
  ENTREE:       { label: 'Entrada',       color: 'badge-success' },
  SORTIE:       { label: 'Saída',         color: 'badge-error' },
  TRANSFERT:    { label: 'Transferência', color: 'badge-info' },
  TRANSFERENCIA:{ label: 'Transferência', color: 'badge-info' },
  RETOUR:       { label: 'Devolução',     color: 'badge-warning' },
  AJUSTE:       { label: 'Ajuste',        color: 'badge-ghost' },
};

function groupByMateriel(mouvements: Mouvement[]): GroupedMateriel[] {
  const map = new Map<number, GroupedMateriel>();
  for (const m of mouvements) {
    const key = m.materiel_id_value;
    if (!map.has(key)) {
      map.set(key, {
        materiel_id: key,
        materiel_label: m.materiel,
        materiel_code: m.materiel_code,
        mouvements: [],
      });
    }
    map.get(key)!.mouvements.push(m);
  }
  return Array.from(map.values());
}

export default function PorMaterielPage() {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Materiel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMateriaux, setSelectedMateriaux] = useState<Materiel[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autocomplete — cherche matériaux par nom/code
  useEffect(() => {
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    const q = searchInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestDebounce.current = setTimeout(async () => {
      try {
        const res = await api.get(`/materiais/?search=${encodeURIComponent(q)}&page_size=8`);
        const data = res.data;
        const items: Materiel[] = Array.isArray(data) ? data : (data?.results ?? []);
        setSuggestions(items.filter((m) => !selectedMateriaux.find((s) => s.id === m.id)));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }, [searchInput, selectedMateriaux]);

  function selectMateriel(m: Materiel) {
    if (!selectedMateriaux.find((s) => s.id === m.id)) {
      setSelectedMateriaux((prev) => [...prev, m]);
    }
    setSearchInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeMateriel(id: number) {
    setSelectedMateriaux((prev) => prev.filter((m) => m.id !== id));
  }

  const handleSearch = useCallback(async () => {
    if (selectedMateriaux.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('materiel_ids', selectedMateriaux.map((m) => m.id).join(','));
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await api.get(`/movimentos/?${params.toString()}`);
      const data = res.data;
      const items: Mouvement[] = Array.isArray(data) ? data : (data?.results ?? []);
      setResults(items);
      setSearched(true);
    } catch {
      setError('Erro ao carregar movimentos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedMateriaux, dateFrom, dateTo]);

  // Re-cherche automatiquement si on change les filtres date et qu'on a déjà des matériaux
  useEffect(() => {
    if (searched && selectedMateriaux.length > 0) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const grouped = groupByMateriel(results);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <span>📦</span> Histórico por Material
        </h1>
        <p className="text-base-content/60 mt-1 text-sm">
          Selecione um ou vários materiais e consulte todos os movimentos registados.
        </p>
      </div>

      {/* Painel de pesquisa */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">

          {/* Autocomplete matériaux */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold text-base">Material(ais)</span>
              {selectedMateriaux.length > 0 && (
                <span className="label-text-alt text-base-content/50">{selectedMateriaux.length} selecionado(s)</span>
              )}
            </label>

            {/* Chips des matériaux sélectionnés */}
            {selectedMateriaux.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedMateriaux.map((m) => (
                  <span key={m.id} className="badge badge-primary badge-lg gap-1 pr-1">
                    <span className="font-mono text-xs opacity-80">{m.code}</span>
                    <span className="max-w-[180px] truncate text-xs">{m.description}</span>
                    <button
                      type="button"
                      onClick={() => removeMateriel(m.id)}
                      className="ml-1 opacity-70 hover:opacity-100 font-bold leading-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Champ de recherche avec suggestions */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                className="input input-bordered w-full pl-10"
                placeholder="Pesquisar por código ou descrição…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">🔍</span>

              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-base-200 flex items-center gap-3"
                        onMouseDown={() => selectMateriel(m)}
                      >
                        <span className="font-mono text-xs text-primary font-semibold shrink-0">{m.code}</span>
                        <span className="text-sm truncate">{m.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {searchInput.trim().length === 1 && (
              <label className="label">
                <span className="label-text-alt text-warning">Escreva pelo menos 2 caracteres.</span>
              </label>
            )}
          </div>

          {/* Plage de dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Data início (opcional)</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Data fim (opcional)</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Bouton rechercher */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={selectedMateriaux.length === 0 || loading}
            className="btn btn-primary w-full sm:w-auto"
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : <span>🔍</span>}
            {loading ? 'A pesquisar…' : 'Pesquisar'}
          </button>
        </div>
      </div>

      {/* États */}
      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {!loading && !searched && selectedMateriaux.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40 gap-3">
          <span className="text-6xl">📦</span>
          <p className="text-lg">Selecione um material para ver o seu histórico.</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/40 gap-3">
          <span className="text-5xl">🔎</span>
          <p className="text-lg">Nenhum movimento encontrado para os critérios selecionados.</p>
        </div>
      )}

      {/* Résultats groupés par matériel */}
      {!loading && grouped.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-base-content/60">
            {results.length} movimento(s) encontrado(s) para {grouped.length} material(ais).
          </p>

          {grouped.map((group) => {
            const totalEntree = group.mouvements
              .filter((m) => m.type_mvt === 'ENTREE')
              .reduce((s, m) => s + m.quantite, 0);
            const totalSortie = group.mouvements
              .filter((m) => ['SORTIE', 'TRANSFERT', 'TRANSFERENCIA'].includes(m.type_mvt))
              .reduce((s, m) => s + m.quantite, 0);

            return (
              <div key={group.materiel_id} className="card bg-base-100 border border-base-300 shadow-sm">
                <div className="card-body pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="font-semibold text-base leading-tight">{group.materiel_label}</p>
                        <p className="font-mono text-xs text-primary opacity-70 mt-0.5">{group.materiel_code}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1 text-success font-semibold">
                        ↑ {totalEntree} entrada(s)
                      </span>
                      <span className="flex items-center gap-1 text-error font-semibold">
                        ↓ {totalSortie} saída(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr className="bg-base-200 text-xs">
                        <th>Referência</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th className="text-right">Qtd</th>
                        <th>Depósito</th>
                        <th>Operador</th>
                        <th>Razão / Site</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.mouvements.map((m) => {
                        const typeInfo = TYPE_MVT_LABELS[m.type_mvt] ?? { label: m.type_mvt, color: 'badge-ghost' };
                        return (
                          <tr key={m.id} className="hover:bg-base-200/50">
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
                            <td>
                              <span className={`badge badge-xs ${typeInfo.color}`}>{typeInfo.label}</span>
                            </td>
                            <td className="text-right font-bold text-sm">{m.quantite}</td>
                            <td className="text-xs opacity-70 whitespace-nowrap">{m.entrepot || '—'}</td>
                            <td className="text-xs opacity-70 whitespace-nowrap">{m.demandeur || '—'}</td>
                            <td className="text-xs opacity-60 max-w-[160px] truncate">
                              {m.site_intervention || m.raison || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
