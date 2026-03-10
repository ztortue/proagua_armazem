// src/app/dashboard/page.tsx
import { CardStat } from './CardStat';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-4xl font-bold mb-8">Bem-vindo ao ProAgua ERP</h1>
      <DashboardContent />
    </>
  );
}