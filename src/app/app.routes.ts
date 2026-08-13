import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    data: { mode: 'login' },
    loadComponent: () => import('./core/components/auth-redirect/auth-redirect').then((m) => m.AuthRedirect),
  },
  {
    path: 'register',
    data: { mode: 'signup' },
    loadComponent: () => import('./core/components/auth-redirect/auth-redirect').then((m) => m.AuthRedirect),
  },
  {
    // Destino del Action "Requiere correo verificado" de Auth0. Debe quedar
    // fuera de `authGuard`: el usuario llega aquí sin sesión en la app.
    path: 'verificar-correo',
    loadComponent: () =>
      import('./core/components/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'shipments',
        loadComponent: () =>
          import('./features/shipments/shipment-list/shipment-list').then((m) => m.ShipmentList),
      },
      {
        path: 'shipments/:id',
        loadComponent: () =>
          import('./features/shipment-detail/shipment-detail').then((m) => m.ShipmentDetail),
      },
      {
        path: 'history',
        loadComponent: () => import('./features/history/history').then((m) => m.History),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications').then((m) => m.Notifications),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
        children: [
          {
            path: 'notifications',
            loadComponent: () =>
              import('./features/settings/settings-notifications/settings-notifications').then(
                (m) => m.SettingsNotifications,
              ),
          },
          {
            path: 'users',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN'] },
            loadComponent: () =>
              import('./features/settings/settings-users/settings-users').then((m) => m.SettingsUsers),
          },
          {
            path: 'master-data',
            canActivate: [roleGuard],
            data: { roles: ['ADMIN'] },
            loadComponent: () =>
              import('./features/settings/settings-master-data/settings-master-data').then(
                (m) => m.SettingsMasterData,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
