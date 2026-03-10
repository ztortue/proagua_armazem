// src/app/dashboard/CardStat.tsx
// ============================================================================
// FICHIER: src/app/dashboard/CardStat.tsx - VERSION FINAL
// ============================================================================

interface CardStatProps {
  title: string;
  value: string | number;
  icon: string;
  color: "primary" | "warning" | "secondary" | "accent";
}

export function CardStat({ title, value, icon, color }: CardStatProps) {
  // Map couleurs pour Tailwind (éviter dynamic classes)
  const bgColors = {
    primary: 'bg-primary',
    warning: 'bg-warning',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
  };

  const textColors = {
    primary: 'text-primary-content',
    warning: 'text-warning-content',
    secondary: 'text-secondary-content',
    accent: 'text-accent-content',
  };

  return (
    <div className={`card ${bgColors[color]} ${textColors[color]} shadow-xl hover:scale-105 transition-transform`}>
      <div className="card-body text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-3xl font-bold">{value}</h2>
        <p className="opacity-80">{title}</p>
      </div>
    </div>
  );
}