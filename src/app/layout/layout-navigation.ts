export interface LayoutNavItem {
  label: string;
  route: string;
  icon: string;
  exact: boolean;
  adminOnly?: boolean;
}

export const layoutNavItems: readonly LayoutNavItem[] = [
  { label: 'Inicio', route: '/dashboard', icon: 'dashboard', exact: true },
  { label: 'Mis envíos', route: '/shipments', icon: 'inventory_2', exact: false },
  { label: 'Historial', route: '/history', icon: 'history', exact: true },
  { label: 'Notificaciones', route: '/notifications', icon: 'notifications', exact: true },
  { label: 'Reportes', route: '/reports', icon: 'bar_chart', exact: true },
  { label: 'Ajustes', route: '/settings', icon: 'settings', exact: false },
];
