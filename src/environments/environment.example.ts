export const environment = {
  production: false,
  auth0: {
    domain: '',
    clientId: '',
    audience: 'https://api.conexion360.com',
    scope: 'openid profile email',
  },
  api: {
    baseUrl: '/api/v1',
  },
  /**
   * Cierre de sesión por inactividad (ver `IdleSessionService`).
   * `warningSeconds` es la antesala del cierre, no tiempo extra: el aviso sale
   * en `idleTimeoutMinutes - warningSeconds`.
   */
  session: {
    idleTimeoutMinutes: 15,
    warningSeconds: 20,
  },
  appUrl: '',
  appName: 'Conexion360',
};
