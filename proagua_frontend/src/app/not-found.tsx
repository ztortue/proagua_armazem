// src/app/not-found.tsx – PAGE 404 AVÈK IMAG PWÒP + TEXTE AN PÒTIGÈ
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-2xl max-w-4xl w-full">
        <div className="card-body text-center py-12">
          {/* IMAG PWÒP LA */}
          <img 
            src="/resposta404.png" 
            alt="Página em construção" 
            className="mx-auto mb-8 max-w-full h-auto rounded-lg shadow-lg"
          />

          {/* TIT + SOU-TIT */}
          <h1 className="text-5xl font-bold text-primary mb-4">Página Não Encontrada</h1>
          <p className="text-2xl text-gray-700 mb-12">
            Estamos construindo esta página sob medida.
          </p>

          {/* LOGO SUEZ + PROAGUA */}
          <div className="flex items-center justify-center gap-8 mb-12">
            <img src="/suezlogo.png" alt="Suez" className="h-16 w-auto" />
            <div className="divider divider-horizontal"></div>
            <h2 className="text-4xl font-bold text-primary">ProAgua ERP</h2>
          </div>

          {/* BOUTON RETOUNEN */}
          <Link href="/dashboard" className="btn btn-primary btn-lg px-12">
            Voltar ao Dashboard
          </Link>

          <p className="text-sm text-gray-400 mt-8">
            Suez International © 2025
          </p>
        </div>
      </div>
    </div>
  );
}