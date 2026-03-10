'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserFromToken } from './lib/api';
import { LogoutButton } from './LogoutButton';

type UserInfo = {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
};

export function UserMenu() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    setUser(getUserFromToken());
  }, []);

  const firstInitial = (user?.first_name || user?.username || 'U')[0].toUpperCase();
  const lastInitial = (user?.last_name?.[0] || '').toUpperCase();
  const fullName =
    user?.first_name || user?.last_name
      ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
      : user?.username || 'User';

  return (
    <div className="flex-none">
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-ghost flex itemscenter gap-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-white rounded-full w-10 flex itemscenter justify-center text-xl font-bold">
              {firstInitial}
              {lastInitial}
            </div>
          </div>
          <span className="hidden md:block font-medium">{fullName}</span>
        </div>

        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50">
          <li>
            <Link href="/dashboard/profile" className="justify-between">
              Perfil
              <span className="badge badge-sm">{user?.role || 'USER'}</span>
            </Link>
          </li>
          <li>
            <LogoutButton />
          </li>
        </ul>
      </div>
    </div>
  );
}
