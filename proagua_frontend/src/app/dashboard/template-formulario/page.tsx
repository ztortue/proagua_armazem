'use client';

import { useState } from 'react';

const BLANK = '___________________________';
const BLANK_SHORT = '___________';

const NUM_ROWS_OPTIONS = [5, 10, 15, 20];

type FormType = 'SAIDA' | 'ENTRADA';

const formTypeLabel: Record<FormType, string> = {
  SAIDA: 'Saída',
  ENTRADA: 'Entrada',
};

export default function TemplateFormularioPage() {
  const [formType, setFormType] = useState<FormType>('SAIDA');
  const [numRows, setNumRows] = useState(10);

  const blankRows = Array.from({ length: numRows });

  return (
    <>
      <style>{`
        @media print {
          header, footer, .drawer-side, .drawer-overlay,
          #left-sidebar, .no-print {
            display: none !important;
          }
          .drawer-content, .drawer-content.lg\\:ml-80 {
            margin-left: 0 !important;
          }
          main { padding: 0 !important; }
          .print-only { display: block !important; }
          .print-page {
            padding: 8mm 8mm;
            min-height: 250mm;
            display: flex;
            flex-direction: column;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
            table-layout: fixed;
          }
          .print-table th, .print-table td {
            border: 1px solid #999;
            padding: 4px 6px;
            vertical-align: top;
          }
          .print-table td { height: 20px; }
          .print-signatures {
            margin-top: auto;
            padding-top: 12px;
            border-top: 1px solid #999;
          }
          .print-signatures-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 8px;
          }
          .print-sign-box {
            min-height: 70px;
            border: 1px dashed #999;
            padding: 8px;
            font-size: 12px;
          }
          .print-aviso {
            margin-top: 8px;
            padding: 6px;
            border: 1px solid #d4a72c;
            background: #fefce8;
            font-size: 10px;
          }
          .print-aviso ol { margin: 0; padding-left: 16px; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* CONTROLES — escondidos na impressão */}
      <div className="no-print p-8">
        <h1 className="text-4xl font-bold text-primary mb-6">Template Formulário em Branco</h1>

        <div className="card bg-base-100 shadow-md border border-base-300 mb-6">
          <div className="card-body">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <label className="label"><span className="label-text font-semibold">Tipo de formulário</span></label>
                <div className="flex gap-2">
                  {(['SAIDA', 'ENTRADA'] as FormType[]).map((t) => (
                    <button
                      key={t}
                      className={`btn ${formType === t ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setFormType(t)}
                    >
                      {formTypeLabel[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label"><span className="label-text font-semibold">Número de linhas</span></label>
                <div className="flex gap-2">
                  {NUM_ROWS_OPTIONS.map((n) => (
                    <button
                      key={n}
                      className={`btn ${numRows === n ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setNumRows(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-base-content/60">
          Selecione o tipo e o número de linhas, depois clique em Imprimir.
        </div>
      </div>

      {/* FORMULÁRIO IMPRIMÍVEL */}
      <div className="print-only">
        <section className="print-page">
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <img src="/suezlogo.png" alt="Suez" style={{ height: '24px', width: 'auto' }} />
                <img src="/mitrelli-logo.jpeg" alt="Mitrelli" style={{ height: '24px', width: 'auto' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#0284c7' }}>
                  Formulário de {formTypeLabel[formType]}
                </h1>
                <div style={{ fontSize: '11px', color: '#555' }}>Template — preenchimento manual</div>
              </div>
            </div>
            <img src="/EPAL-logo.jpeg" alt="EPAL" style={{ height: '24px', width: 'auto' }} />
          </div>

          {/* Dados da operação */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '12px', marginBottom: '10px' }}>
            <div><strong>Referência:</strong> {BLANK_SHORT}</div>
            <div><strong>Data:</strong> {BLANK_SHORT}</div>
            <div><strong>Nº Formulário:</strong> {BLANK_SHORT}</div>
            <div><strong>Solicitante:</strong> {BLANK}</div>
            <div><strong>Projeto:</strong> {BLANK}</div>
            <div><strong>Tipo de Material:</strong> {BLANK_SHORT}</div>
            <div><strong>Motivo:</strong> {BLANK}</div>
            <div><strong>Destino de uso:</strong> {BLANK}</div>
            <div><strong>Observações:</strong> {BLANK}</div>
          </div>

          {/* Tabela de materiais */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>REF ITEM</th>
                <th style={{ width: '42%' }}>DESIGNAÇÃO</th>
                <th style={{ width: '12%' }}>QTDE</th>
                <th style={{ width: '15%' }}>DATA NECESSÁRIA</th>
                <th style={{ width: '15%' }}>COMENTÁRIO</th>
              </tr>
            </thead>
            <tbody>
              {blankRows.map((_, i) => (
                <tr key={i}>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Assinaturas + Aviso */}
          <div className="print-signatures">
            <div className="print-signatures-row">
              <div className="print-sign-box">
                <div><strong>Solicitado por:</strong> {BLANK}</div>
                <div><strong>Data:</strong> {BLANK_SHORT}</div>
                <div style={{ marginTop: '24px' }}>Assinatura: ____________________</div>
              </div>
              <div className="print-sign-box">
                <div><strong>{formType === 'SAIDA' ? 'Entregue por' : 'Recebido por'}:</strong> {BLANK}</div>
                <div><strong>Data:</strong> {BLANK_SHORT}</div>
                <div style={{ marginTop: '24px' }}>Assinatura: ____________________</div>
              </div>
            </div>

            <div className="print-aviso" style={{ marginTop: '8px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: '#92400e' }}>Aviso</div>
              <ol style={{ margin: 0, paddingLeft: '18px', color: '#78350f' }}>
                <li>Comunique imediatamente qualquer avaria ao setor responsável (Logístico/Gestão de Materiais).</li>
                <li>Não descarte ou repare o item sem autorização prévia.</li>
                <li>Documente o dano com fotos e relatório detalhado (causa, data, condições de recebimento).</li>
                <li>Siga os procedimentos internos para não conformidades.</li>
              </ol>
              <div style={{ marginTop: '6px', fontWeight: 700, color: '#92400e' }}>
                O não cumprimento poderá resultar em responsabilização por reparo ou substituições.
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
