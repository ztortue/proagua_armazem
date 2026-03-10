// src/app/dashboard/LogoutButton.tsx
'use client';

export function LogoutButton() {
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
  };

  return (
    <a onClick={handleLogout} className="text-error">
      Sair
    </a>
  );
}