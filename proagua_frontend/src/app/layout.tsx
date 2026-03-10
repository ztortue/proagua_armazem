// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProAgua - Gestão de Estoque",
  description: "Sistema ERP Suez International Angola",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="corporate">
      <body className="antialiased min-h-screen bg-base-200 relative overflow-x-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-center bg-no-repeat bg-contain opacity-10 z-0"
          style={{ backgroundImage: "url('/proagualogo.png')" }}
        />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
