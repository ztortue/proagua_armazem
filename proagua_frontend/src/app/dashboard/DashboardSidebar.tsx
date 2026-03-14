'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  ArchiveBoxIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  QueueListIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/solid';
import { api } from './lib/api';

type Me = {
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'CONSULTATION';
  pilier_affectation?: 'PILAR1' | 'PILAR2' | 'PILAR3' | 'TODOS';
};

type MenuItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor: string;
  iconClassName?: string;
  adminOnly?: boolean;
  managerOrAdmin?: boolean;
  usePilierFilter?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon, iconColor: 'text-primary' },
  { href: '/dashboard/armazens', label: 'Armazéns', icon: BuildingOffice2Icon, iconColor: 'text-secondary', usePilierFilter: true },
  { href: '/dashboard/materiais', label: 'Materiais', icon: CubeIcon, iconColor: 'text-accent', usePilierFilter: true },
  { href: '/dashboard/estoque', label: 'Estoque', icon: ArchiveBoxIcon, iconColor: 'text-primary', usePilierFilter: true },
  { href: '/dashboard/alertes-stock', label: 'Alertes Stock', icon: ExclamationTriangleIcon, iconColor: 'text-warning', usePilierFilter: true },
  { href: '/dashboard/pedidos', label: 'Operações', icon: ClipboardDocumentListIcon, iconColor: 'text-secondary', usePilierFilter: true },
  { href: '/dashboard/formulaires', label: 'Formulários', icon: ClipboardDocumentListIcon, iconColor: 'text-primary', usePilierFilter: true },
  { href: '/dashboard/transferencias', label: 'Transferências', icon: TruckIcon, iconColor: 'text-info', usePilierFilter: true },
  { href: '/dashboard/devolucoes', label: 'Devoluções', icon: TruckIcon, iconColor: 'text-warning', iconClassName: '-scale-x-100', usePilierFilter: true },
  { href: '/dashboard/movimentos', label: 'Movimentos', icon: TruckIcon, iconColor: 'text-accent', usePilierFilter: true },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: QueueListIcon, iconColor: 'text-info', usePilierFilter: true, managerOrAdmin: true },
  { href: '/dashboard/audit-logs', label: 'Auditoria', icon: QueueListIcon, iconColor: 'text-warning', adminOnly: true },
  { href: '/dashboard/profile', label: 'Perfil', icon: UserCircleIcon, iconColor: 'text-primary' },
  { href: '/dashboard/users', label: 'Usuários', icon: UserGroupIcon, iconColor: 'text-secondary', managerOrAdmin: true },
  { href: '/dashboard/familles', label: 'Famílias', icon: QueueListIcon, iconColor: 'text-primary', managerOrAdmin: true },
  { href: '/dashboard/categories', label: 'Categorias', icon: QueueListIcon, iconColor: 'text-accent', adminOnly: true },
  { href: '/dashboard/sous-familles', label: 'Subcategorias', icon: QueueListIcon, iconColor: 'text-secondary' },
  { href: '/dashboard/fournisseurs', label: 'Fornecedores', icon: WrenchScrewdriverIcon, iconColor: 'text-secondary', adminOnly: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await api.get('/me/');
        setMe(res.data);
      } catch {
        setMe(null);
      }
    }
    loadMe();
  }, []);

  const menuItems = useMemo(() => {
    const role = me?.role;
    const pilier = me?.pilier_affectation;

    return MENU_ITEMS.filter((item) => {
      if (item.adminOnly && role !== 'ADMIN') return false;
      if (item.managerOrAdmin && role !== 'ADMIN' && role !== 'MANAGER') return false;
      return true;
    }).map((item) => {
      if (!item.usePilierFilter) return item;
      if (!pilier || pilier === 'TODOS') return item;
      return { ...item, href: `${item.href}?pilier=${pilier}` };
    });
  }, [me]);

  const isStoreKeeperView = me?.role === 'USER' || me?.role === 'CONSULTATION';

  const adminRoutes = new Set([
    '/dashboard/users',
    '/dashboard/familles',
    '/dashboard/categories',
    '/dashboard/fournisseurs',
    '/dashboard/audit-logs',
  ]);

  const operationalItems = menuItems.filter((item) => !adminRoutes.has(item.href.split('?')[0]));
  const administrationItems = menuItems.filter((item) => adminRoutes.has(item.href.split('?')[0]));
  const dashboardItem = operationalItems.find((item) => item.href.split('?')[0] === '/dashboard') || null;
  const operationalItemsNoDashboard = operationalItems.filter((item) => item.href.split('?')[0] !== '/dashboard');

  const storeKeeperPrimaryRoutes = [
    '/dashboard/materiais',
    '/dashboard/pedidos',
    '/dashboard/formulaires',
    '/dashboard/transferencias',
    '/dashboard/devolucoes',
    '/dashboard/movimentos',
  ];

  const operationalItemsOrdered = useMemo(() => {
    if (!isStoreKeeperView) return operationalItemsNoDashboard;
    const order = new Map(storeKeeperPrimaryRoutes.map((route, idx) => [route, idx]));
    return [...operationalItemsNoDashboard].sort((a, b) => {
      const aBase = a.href.split('?')[0];
      const bBase = b.href.split('?')[0];
      const aOrder = order.has(aBase) ? (order.get(aBase) as number) : 999;
      const bOrder = order.has(bBase) ? (order.get(bBase) as number) : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.label.localeCompare(b.label);
    });
  }, [isStoreKeeperView, operationalItemsNoDashboard]);

  const primaryOpsItems = operationalItemsOrdered.filter((item) =>
    storeKeeperPrimaryRoutes.includes(item.href.split('?')[0])
  );
  const secondaryOpsItems = operationalItemsOrdered.filter(
    (item) => !storeKeeperPrimaryRoutes.includes(item.href.split('?')[0])
  );

  return (
    <ul className="menu p-2 pb-36 w-56 h-full bg-base-100 text-base-content lg:fixed lg:top-16 lg:bottom-12 lg:left-0 lg:w-56 lg:overflow-y-auto">
      <li className="mb-1 border-b pb-3">
        <div className="block text-center">
          <h2 className="text-lg font-bold text-primary">ProAgua ERP</h2>
          <p className="text-sm text-gray-600">Suez International</p>
          {me?.pilier_affectation && me.pilier_affectation !== 'TODOS' && (
            <p className="mt-2 text-xs opacity-70">{`Acesso: ${me.pilier_affectation}`}</p>
          )}
          {isStoreKeeperView && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Modo Store Keeper
            </p>
          )}
        </div>
      </li>
      {dashboardItem && (
        <li className="mb-1">
          {(() => {
            const baseHref = dashboardItem.href.split('?')[0];
            const isActive = pathname === baseHref || pathname.startsWith(`${baseHref}/`);
            return (
              <Link
                href={dashboardItem.href}
                className={`text-[13px] py-1 px-2 transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'hover:text-primary'
                }`}
              >
                <dashboardItem.icon
                  className={`mr-2 h-3.5 w-3.5 ${isActive ? 'text-primary' : dashboardItem.iconColor} ${dashboardItem.iconClassName ?? ''}`}
                />
                {dashboardItem.label}
              </Link>
            );
          })()}
        </li>
      )}
      <li className="my-1 border-t border-base-300" />
      <li className="menu-title mt-1 px-2 text-[10px] uppercase tracking-wider text-gray-500">
        <span>Operacional</span>
      </li>
      {isStoreKeeperView && primaryOpsItems.length > 0 && (
        <li className="menu-title px-2 text-[9px] uppercase tracking-wider text-primary/80">
          <span>Fluxos Principais</span>
        </li>
      )}
      {(isStoreKeeperView ? primaryOpsItems : operationalItemsOrdered).map((item) => {
        const baseHref = item.href.split('?')[0];
        const isActive =
          pathname === baseHref ||
          (baseHref !== '/dashboard' && pathname.startsWith(`${baseHref}/`));

        return (
          <li key={item.href}>
              <Link
                href={item.href}
                className={`text-[13px] py-1 rounded-lg transition-colors ${
                  isActive ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-200'
                }`}
              >
              <item.icon className={`mr-2 h-3.5 w-3.5 ${isActive ? 'text-primary-content' : item.iconColor} ${item.iconClassName ?? ''}`} />
              {item.label}
            </Link>
          </li>
        );
      })}
      {isStoreKeeperView && secondaryOpsItems.length > 0 && (
        <>
          <li className="menu-title mt-2 px-2 text-[9px] uppercase tracking-wider text-gray-500">
            <span>Consultas</span>
          </li>
          {secondaryOpsItems.map((item) => {
            const baseHref = item.href.split('?')[0];
            const isActive =
              pathname === baseHref ||
              (baseHref !== '/dashboard' && pathname.startsWith(`${baseHref}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-[13px] py-1 rounded-lg transition-colors ${
                    isActive ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-200'
                  }`}
                >
                  <item.icon className={`mr-2 h-3.5 w-3.5 ${isActive ? 'text-primary-content' : item.iconColor} ${item.iconClassName ?? ''}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </>
      )}
      {administrationItems.length > 0 && (
        <>
          <li className="my-2 border-t border-base-300" />
          <li className="menu-title px-2 text-[10px] uppercase tracking-wider text-gray-500">
            <span>Administração</span>
          </li>
          {administrationItems.map((item) => {
            const baseHref = item.href.split('?')[0];
            const isActive =
              pathname === baseHref ||
              (baseHref !== '/dashboard' && pathname.startsWith(`${baseHref}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-[13px] py-1 rounded-lg transition-colors ${
                    isActive ? 'bg-primary text-primary-content font-semibold' : 'hover:bg-base-200'
                  }`}
                >
                  <item.icon className={`mr-2 h-3.5 w-3.5 ${isActive ? 'text-primary-content' : item.iconColor} ${item.iconClassName ?? ''}`} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </>
      )}
    </ul>
  );
}
