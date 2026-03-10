import Link from 'next/link';
import { UserMenu } from './UserMenu';
import { DashboardSidebar } from './DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-200 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-contain opacity-10 z-0"
        style={{ backgroundImage: "url('/proagualogo.png')" }}
      />

      <header className="fixed top-0 left-0 right-0 z-50 navbar bg-base-100/95 backdrop-blur shadow-lg px-6">
        <div className="flex-1">
          <Link href="/pilier" className="btn btn-ghost text-2xl font-bold text-primary">
            <img src="/suezlogo.png" alt="Suez" className="h-8 w-auto" />
            ProAgua
          </Link>
        </div>
        <div className="flex itemscenter gap-3">
          <img src="/EPAL-logo.jpeg" alt="EPAL" className="h-8 w-auto rounded-sm" />
          <UserMenu />
        </div>
      </header>

      <main className="pt-16 pb-14 relative z-10">
        <div className="drawer lg:drawer-open">
          <input id="left-sidebar" type="checkbox" className="drawer-toggle" />

          <div className="drawer-content lg:ml-72">
            <div className="p-6">{children}</div>
          </div>

          <div className="drawer-side">
            <label htmlFor="left-sidebar" className="drawer-overlay"></label>
            <DashboardSidebar />
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-base-300 bg-base-100/95 backdrop-blur">
        <div className="px-6 py-2 text-center text-xs opacity-70">
          Todos os direitos reservados - Pro Agua
        </div>
      </footer>
    </div>
  );
}
