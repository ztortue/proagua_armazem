// src/app/dashboard/movimentos/page.tsx
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';

type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

function MovimentosContent() {
  const searchParams = useSearchParams();
  const refParam = (searchParams.get('ref') || '').trim().toUpperCase();
  const [me, setMe] = useState<{ role?: string; pilier_affectation?: string } | null>(null);
  const fetchAllPages = async (url: string) => {
  const collected: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res: { data: PaginatedResponse<any> | any[] } = await api.get(nextUrl);
    const data: PaginatedResponse<any> | any[] = res.data;
    if (Array.isArray(data)) return data;
    const items = Array.isArray(data?.results) ? data.results : [];
    collected.push(...items);
    const nextRaw: string | null = data?.next || null;
    if (!nextRaw) {
      nextUrl = null;
    } else if (nextRaw.startsWith('http')) {
      try {
        const parsed = new URL(nextRaw);
        nextUrl = parsed.pathname.replace(/^\/api/, '') + parsed.search;
      } catch {
        nextUrl = null;
      }
    } else {
      nextUrl = nextRaw;
    }
  }
  return collected;
};
    //return collected;
  //};

  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [materiels, setMateriels] = useState<any[]>([]);
  const [projets, setProjets] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [entrepots, setEntrepots] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'single' | 'range'>('single');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportType, setExportType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [exportMovId, setExportMovId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEntrepot, setFilterEntrepot] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [form, setForm] = useState({
    materiel_id: '',        // <-- dropdown materiel ap mete ID la isit
    projet_id: '',          // <-- NOUVO
    fournisseur_id: '',     // <-- NOUVO
    type_mvt: 'ENTREE',
    quantite: 0,
    raison: '',
    entrepot_id: '',        // si w ta vle ajoute li pita (sinon ou ka retire l)
    entrepot_destino_id: '',
  });

  useEffect(() => {
    async function load() {
      try {
        // ✅ OU PA VLE NOUVO PATH NAN mouvements
        // Donk nou chaje dropdown yo nan endpoints router yo:
        const [listMovimentos, listMateriels, listProjets, listFournisseurs, listEntrepots, configRes] = await Promise.all([
          fetchAllPages('/movimentos/?page=1'),
          fetchAllPages('/materiais/?page=1'),
          fetchAllPages('/projets/?page=1'),
          fetchAllPages('/fournisseurs/?page=1'),
          fetchAllPages('/entrepots/?mode=transfer&page=1'),
          api.get('/config/').catch(() => ({ data: { page_size: 20 } })),
        ]);

        setMovimentos(listMovimentos);
        setMateriels(listMateriels);
        setProjets(listProjets);
        setFournisseurs(listFournisseurs);
        setEntrepots(listEntrepots);
        setPageSize(Number(configRes.data?.page_size) > 0 ? Number(configRes.data.page_size) : 20);
        try {
          const resMe = await api.get('/me/');
          setMe(resMe.data || null);
        } catch {
          setMe(null);
        }
      } catch (error) {
        console.error('Erro ao carregar:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const availableEntrepots = useMemo(() => entrepots, [entrepots]);

  const transferEntrepots = useMemo(() => {
    if (me?.role !== 'USER') return availableEntrepots;
    // Restricao Kifangondo <-> Marcal so para USER de PILAR1.
    if (me?.pilier_affectation !== 'PILAR1') return availableEntrepots;
    return availableEntrepots.filter((e) => {
      const nom = String(e?.nom || '').toLowerCase();
      return nom.includes('kifangondo') || nom.includes('marcal') || nom.includes('marçal');
    });
  }, [availableEntrepots, me]);

  const transferDestinations = useMemo(
    () => transferEntrepots.filter((e) => String(e.id) !== String(form.entrepot_id)),
    [transferEntrepots, form.entrepot_id]
  );

  useEffect(() => {
    if (form.type_mvt !== 'TRANSFERT' && form.entrepot_destino_id) {
      setForm((prev) => ({ ...prev, entrepot_destino_id: '' }));
      return;
    }
    if (
      form.type_mvt === 'TRANSFERT' &&
      form.entrepot_id &&
      form.entrepot_destino_id &&
      String(form.entrepot_id) === String(form.entrepot_destino_id)
    ) {
      setForm((prev) => ({ ...prev, entrepot_destino_id: '' }));
    }
  }, [form.type_mvt, form.entrepot_id, form.entrepot_destino_id]);

  const filteredMovimentos = useMemo(() => {
    return movimentos.filter((m) => {
      if (refParam) {
        const ref = String(m.reference || '').trim().toUpperCase();
        if (ref !== refParam) return false;
      }
      if (filterType && m.type_mvt !== filterType) return false;
      if (filterEntrepot) {
        const mEntrepotId = String(m.entrepot_id_value || m.entrepot?.id || '');
        if (mEntrepotId !== filterEntrepot) return false;
      }
      if (filterStartDate || filterEndDate) {
        const mvDate = new Date(m.date_mvt);
        if (filterStartDate) {
          const start = new Date(filterStartDate);
          if (mvDate < start) return false;
        }
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          if (mvDate > end) return false;
        }
      }
      return true;
    });
  }, [movimentos, refParam, filterType, filterEntrepot, filterStartDate, filterEndDate]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMovimentos.length / pageSize)),
    [filteredMovimentos.length, pageSize]
  );

  const paginatedMovimentos = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMovimentos.slice(start, start + pageSize);
  }, [filteredMovimentos, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterEntrepot, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSubmit = async () => {
    if (!form.materiel_id || form.quantite <= 0) {
      alert('Escolhe un material e uma quantidade válida.');
      return;
    }
    if (!form.entrepot_id) {
      alert('Escolhe o deposito para o movimento.');
      return;
    }
    if (form.type_mvt === 'TRANSFERT') {
      if (!form.entrepot_destino_id) {
        alert('Escolhe o deposito destino para a transfêrencia.');
        return;
      }
      if (form.entrepot_id === form.entrepot_destino_id) {
        alert('Deposito origem e deposito destino devem ser diferentes.');
        return;
      }
    }

    // ✅ Payload pwòp: voye ID yo, epi voye null si user pa chwazi pwojè/fournisseur
    const payload = {
      type_mvt: form.type_mvt,
      quantite: form.quantite,
      raison: form.raison,

      materiel_id: Number(form.materiel_id),
      projet_id: form.projet_id ? Number(form.projet_id) : null,
      fournisseur_id: form.fournisseur_id ? Number(form.fournisseur_id) : null,

      // si w pa itilize antrepot kounya, ou ka kite l null oswa retire l:
      entrepot_id: Number(form.entrepot_id),
      entrepot_destino_id: form.entrepot_destino_id ? Number(form.entrepot_destino_id) : null,
    };

    try {
      const res = await api.post('/movimentos/', payload);
      if (res.status === 201) {
        alert('Movimento criado com sucesso!');
        const listMov = await fetchAllPages('/movimentos/?page=1');
        setMovimentos(listMov);
        setModalOpen(false);

        // reset form
        setForm({
          materiel_id: '',
          projet_id: '',
          fournisseur_id: '',
          type_mvt: 'ENTREE',
          quantite: 0,
          raison: '',
          entrepot_id: '',
          entrepot_destino_id: '',
        });
      }
    } catch (error: any) {
      console.error(error?.response?.data || error);
      alert('Erro: ' + (error.response?.data?.detail || 'Erro ao criar movimento'));
    }
  };

  const buildMovRows = (list: any[]) => {
    const rows = [
      [
        'Referencia',
        'Data',
        'Tipo',
        'Material',
        'Quantidade',
        'Deposito',
        'Motivo',
      ],
    ];

    list.forEach((m) => {
      const material =
        m.materiel?.code ? `${m.materiel.code} - ${m.materiel.description}` : (m.materiel || 'N/A');
      const deposito = m.entrepot?.nom || m.entrepot || '';
      rows.push([
        m.reference || '',
        new Date(m.date_mvt).toLocaleString('pt-BR'),
        m.type_mvt,
        material,
        String(m.quantite),
        deposito,
        m.raison || '',
      ]);
    });

    return rows;
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printPdf = (title: string, rows: string[][]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const head = rows[0];
    const body = rows.slice(1);
    const tableHtml = `
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${body
            .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>
    `;

    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>body{font-family:Arial, sans-serif; padding:16px;} h1{font-size:18px;}</style>
        </head>
        <body>
          <h1>${title}</h1>
          ${tableHtml}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleExport = () => {
    let list: any[] = [];

    if (exportMode === 'single') {
      const mov = movimentos.find((m) => String(m.id) === exportMovId);
      if (!mov) {
        alert('Selecione um movimento.');
        return;
      }
      list = [mov];
    } else {
      if (!exportStartDate || !exportEndDate) {
        alert('Informe o periodo.');
        return;
      }
      const start = new Date(exportStartDate);
      const end = new Date(exportEndDate);
      end.setHours(23, 59, 59, 999);
      list = movimentos.filter((m) => {
        const d = new Date(m.date_mvt);
        return d >= start && d <= end && m.type_mvt === exportType;
      });
    }

    const rows = buildMovRows(list);
    const suffix = exportType === 'ENTREE' ? 'anexo1' : 'anexo3';
    const filename = `${suffix}_movimentos.csv`;
    const title = exportType === 'ENTREE' ? 'Anexo 1 - Recepcao' : 'Anexo 3 - Pedido';

    if (exportFormat === 'csv') {
      downloadCsv(filename, rows);
    } else {
      printPdf(title, rows);
    }

    setExportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between itemscenter mb-8">
        <h1 className="text-4xl font-bold">Gestão de Movimentos</h1>
        <div className="flex gap-3">
          <button onClick={() => setExportModalOpen(true)} className="btn btn-outline btn-primary btn-lg">
            Exportar
          </button>
          {/* BLOCK1_DECISION_2026-02-25: disable manual movement creation in UI
          <button onClick={() => setModalOpen(true)} className="btn btn-success btn-lg">
            + Novo Movimento
          </button>
          */}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          className="select select-bordered w-full"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Todos tipos</option>
          <option value="ENTREE">ENTRADA</option>
          <option value="SORTIE">SAIDA</option>
          <option value="TRANSFERT">TRANSFERENCIA</option>
          <option value="RETOUR">DEVOLUCAO</option>
        </select>
        <select
          className="select select-bordered w-full"
          value={filterEntrepot}
          onChange={(e) => setFilterEntrepot(e.target.value)}
        >
          <option value="">Todos depósitos</option>
          {availableEntrepots.map((ent) => (
            <option key={ent.id} value={String(ent.id)}>
              {ent.nom}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input input-bordered w-full"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
        />
        <input
          type="date"
          className="input input-bordered w-full"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
        />
        <button
          className="btn btn-outline"
          onClick={() => {
            setFilterType('');
            setFilterEntrepot('');
            setFilterStartDate('');
            setFilterEndDate('');
          }}
        >
          Limpar filtros
        </button>
      </div>

      <div className="mb-3 flex itemscenter justify-between text-sm text-gray-600">
        <span>{`P?gina ${page} / ${totalPages} - Total ${filteredMovimentos.length}`}</span>
        <div className="flex itemscenter gap-2">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-lg">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Referência</th>
              <th>Data</th>
              <th>Tipo</th>
              <th>Material</th>
              <th>Quantidade</th>
              <th>Depósito</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMovimentos.map(m => (
              <tr key={m.id}>
                <td>{m.reference || ""}</td>
                <td>{new Date(m.date_mvt).toLocaleString('pt-BR')}</td>
                <td>
                  <span className={`badge ${m.type_mvt === 'ENTREE' ? 'badge-success' : m.type_mvt === 'SORTIE' ? 'badge-error' : 'badge-warning'}`}>
                    {m.type_mvt}
                  </span>
                </td>

                {/* ⚠️ sa depann de serializer ou.
                    Si backend retounen materiel kòm string, mete: {m.materiel}
                    Si backend retounen object {code,description}, sa ok.
                 */}
                <td>
                  {m.materiel?.code ? `${m.materiel.code} - ${m.materiel.description}` : (m.materiel || 'N/A')}
                </td>

                <td>{m.quantite}</td>
                <td>{m.entrepot || '-'}</td>
                <td>{m.raison}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EXPORT */}
      {exportModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-2xl mb-4">Exportar</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Modo</span></label>
                <select
                  className="select select-bordered w-full"
                  value={exportMode}
                  onChange={(e) => setExportMode(e.target.value as 'single' | 'range')}
                >
                  <option value="single">Movimento unico</option>
                  <option value="range">Por periodo</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Tipo</span></label>
                <select
                  className="select select-bordered w-full"
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as 'ENTREE' | 'SORTIE')}
                >
                  <option value="ENTREE">Recepcao (Anexo 1)</option>
                  <option value="SORTIE">Pedido (Anexo 3)</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Formato</span></label>
                <select
                  className="select select-bordered w-full"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                >
                  <option value="csv">Excel (CSV)</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              {exportMode === 'single' && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Movimento</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={exportMovId}
                    onChange={(e) => setExportMovId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {movimentos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.reference || `#${m.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {exportMode === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label"><span className="label-text">Data inicio</span></label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Data fim</span></label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setExportModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleExport}>
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO MOVIMENTO */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Novo Movimento</h3>

            {/* ✅ MATERIAL */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Material *</span></label>
              <select
                className="select select-bordered w-full"
                value={form.materiel_id}
                onChange={e => setForm({ ...form, materiel_id: e.target.value })}
              >
                <option value="">Selecione o material</option>
                {materiels.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {mat.code} - {mat.description}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ ENTREPOSTO */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Deposito *</span></label>
              <select
                className="select select-bordered w-full"
                value={form.entrepot_id}
                onChange={e => setForm({ ...form, entrepot_id: e.target.value })}
              >
                <option value="">Selecione o deposito</option>
                {(form.type_mvt === 'TRANSFERT' ? transferEntrepots : availableEntrepots).map(ent => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nom}
                  </option>
                ))}
              </select>
            </div>

            {form.type_mvt === 'TRANSFERT' && (
              <div className="form-control w-full mt-4">
                <label className="label"><span className="label-text">Deposito Destino *</span></label>
                <select
                  className="select select-bordered w-full"
                  value={form.entrepot_destino_id}
                  onChange={e => setForm({ ...form, entrepot_destino_id: e.target.value })}
                >
                  <option value="">Selecione o deposito de destino</option>
                  {transferDestinations.map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ PROJETO (NO UVO) */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Projeto</span></label>
              <select
                className="select select-bordered w-full"
                value={form.projet_id}
                onChange={e => setForm({ ...form, projet_id: e.target.value })}
              >
                <option value="">Selecione o projeto</option>
                {projets.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ FOURNISSEUR (NO UVO) */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Fornecedor</span></label>
              <select
                className="select select-bordered w-full"
                value={form.fournisseur_id}
                onChange={e => setForm({ ...form, fournisseur_id: e.target.value })}
              >
                <option value="">Selecione o fornecedor</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ TIPO */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Tipo de Movimento *</span></label>
              <select
                className="select select-bordered w-full"
                value={form.type_mvt}
                onChange={e => setForm({ ...form, type_mvt: e.target.value })}
              >
                <option value="ENTREE">Entrada</option>
                <option value="SORTIE">Saida</option>
                <option value="RETOUR">Devolução</option>
                <option value="TRANSFERT">Transferência</option>
              </select>
            </div>

            {/* ✅ QUANTITE */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Quantidade *</span></label>
              <input
                type="number"
                min="1"
                className="input input-bordered w-full"
                value={form.quantite}
                onChange={e => setForm({ ...form, quantite: Number(e.target.value) })}
              />
            </div>

            {/* ✅ RAISON */}
            <div className="form-control w-full mt-4">
              <label className="label"><span className="label-text">Motivo *</span></label>
              <input
                type="text"
                placeholder="Ex: Entrega fornecedor"
                className="input input-bordered w-full"
                value={form.raison}
                onChange={e => setForm({ ...form, raison: e.target.value })}
              />
            </div>

            <div className="modal-action mt-6">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={handleSubmit}>Validar Movimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MovimentosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <MovimentosContent />
    </Suspense>
  );
}
