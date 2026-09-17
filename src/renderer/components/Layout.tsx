// App shell — Figma page "09 — Navigation".
// App Shell / 1440x900 / Expanded (3:194) and Collapsed (6:175).
// Rules from the same page: 1280px prefers the collapsed rail, the active item
// is background + label emphasis, and an icon-only collapsed item always
// carries a tooltip. "27 — Responsive Tests" keeps the 248px sidebar expanded
// from 1366×768 up, so the rail is used only below 1366px.

import { useEffect, useState, type ReactNode } from 'react';

import type { IconName } from './Icon.tsx';
import { Icon } from './Icon.tsx';
import { Tooltip, type ConnectionStatusKey } from './Kit.tsx';

export type Route =
  | 'dashboard'
  | 'shipments'
  | 'create'
  | 'detail'
  | 'edit'
  | 'pricing'
  | 'barcode'
  | 'warehouses'
  | 'locations'
  | 'webhooks'
  | 'credit'
  | 'diagnostics'
  | 'settings'
  | 'about';

interface NavigationEntry {
  readonly route: Route;
  readonly label: string;
  readonly icon: IconName;
  readonly group?: string;
}

const navigation: readonly NavigationEntry[] = [
  { route: 'dashboard', label: 'Dashboard', icon: 'interface-grid' },
  { route: 'shipments', label: 'Gönderiler', icon: 'shipment-package' },
  { route: 'create', label: 'Yeni Gönderi', icon: 'shipment-package-add' },
  { route: 'webhooks', label: 'Webhooks', icon: 'system-webhook' },
  { route: 'credit', label: 'Bakiyem', icon: 'finance-wallet' },
  { route: 'warehouses', label: 'Depolar', icon: 'location-warehouse', group: 'YÖNETİM' },
  { route: 'locations', label: 'Lokasyonlar', icon: 'location-pin' },
  { route: 'diagnostics', label: 'Tanılama', icon: 'system-activity', group: 'SİSTEM' },
  { route: 'settings', label: 'Ayarlar', icon: 'control-sliders' },
  { route: 'about', label: 'Hakkında', icon: 'status-info' },
];

// Routes that are reached from Gönderiler keep that item highlighted.
const shipmentRoutes: readonly Route[] = ['shipments', 'detail', 'edit', 'pricing', 'barcode'];

function activeRouteOf(route: Route): Route {
  return shipmentRoutes.includes(route) ? 'shipments' : route;
}

// Topbar connection text. The dashboard frames use exactly three wordings:
// "● API Bağlı" (7:41), "● API Sorunu" (7:471) and "● Çevrimdışı" (7:657).
// Nothing is claimed before the first connection test has answered. Each
// wording carries the tone of its state (success, error, warning).
const connectionLabels: Record<ConnectionStatusKey, { readonly text: string; readonly tone: 'success' | 'warning' | 'error' } | null> = {
  connected: { text: '● API Bağlı', tone: 'success' },
  connecting: null,
  offline: { text: '● Çevrimdışı', tone: 'warning' },
  timeout: { text: '● API Sorunu', tone: 'error' },
  unauthorized: { text: '● API Sorunu', tone: 'error' },
  'service-problem': { text: '● API Sorunu', tone: 'error' },
};

const railQuery = '(width < 1366px)';

function useCollapsedRail(): boolean {
  const [collapsed, setCollapsed] = useState(() => window.matchMedia(railQuery).matches);
  useEffect(() => {
    const query = window.matchMedia(railQuery);
    const apply = () => setCollapsed(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return collapsed;
}

export interface LayoutProps {
  readonly route: Route;
  readonly onNavigate: (route: Route) => void;
  readonly breadcrumb: string;
  readonly connection: ConnectionStatusKey;
  readonly balance?: string | undefined;
  readonly account?: string | undefined;
  readonly children: ReactNode;
}

export function Layout({ route, onNavigate, breadcrumb, connection, balance, account, children }: LayoutProps) {
  const collapsed = useCollapsedRail();
  const active = activeRouteOf(route);
  const status = connectionLabels[connection];
  return (
    <div className={collapsed ? 'app-shell app-shell--collapsed' : 'app-shell'}>
      <aside className="sidebar">
        <span className="sidebar__brand">{collapsed ? 'K' : 'KARGONOMİ'}</span>
        <span className="sidebar__tagline">Logistics Control Center</span>
        <nav aria-label="Ana menü" className="sidebar__nav">
          {navigation.map((item) => (
            <NavItem key={item.route} item={item} active={item.route === active} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </aside>
      <div className="main-region">
        <header className="topbar">
          <p className="topbar__breadcrumb">{breadcrumb}</p>
          <div className="topbar__meta">
            {status === null ? null : <span className={`topbar__connection topbar__connection--${status.tone}`} role="status">{status.text}</span>}
            {balance === undefined ? null : <span className="topbar__meta-item">{`Bakiye  ${balance}`}</span>}
            {account === undefined ? null : <span className="topbar__meta-item">{account}</span>}
          </div>
        </header>
        {children}
        {/* Dialogs portal here so their scrim covers only the main content. */}
        <div id="main-modal-root" className="main-modal-root" />
      </div>
    </div>
  );
}

function NavItem({ item, active, collapsed, onNavigate }: {
  readonly item: NavigationEntry;
  readonly active: boolean;
  readonly collapsed: boolean;
  readonly onNavigate: (route: Route) => void;
}) {
  const button = (
    <button type="button" className="nav-item" aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} onClick={() => onNavigate(item.route)}>
      <Icon name={item.icon} size={18} />
      {collapsed ? null : <span className="nav-item__label">{item.label}</span>}
    </button>
  );
  return (
    <>
      {item.group === undefined ? null : <p className="sidebar__group">{item.group}</p>}
      {collapsed ? <Tooltip label={item.label}>{button}</Tooltip> : button}
    </>
  );
}
