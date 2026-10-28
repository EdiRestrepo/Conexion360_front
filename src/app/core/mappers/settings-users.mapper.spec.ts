import { mapSettingsRolesResponse, mapSettingsUsersPageResponse } from './settings-users.mapper';

/** Respuesta real de `GET /api/v1/settings/listusers?page=1&size=10`. */
const listUsersResponse = {
  timestamp: '2026-08-30T23:42:39.9385607Z',
  status: 200,
  error: null,
  message: 'Solicitud exitosa',
  dataResponse: [
    [
      {
        userId: 'auth0|6a7d2c9d789142a48d96ec53',
        email: 'edisonestival@gmail.com',
        userName: 'edisonestival@gmail.com',
        phoneNumber: '',
        createdDate: '2026-08-13T02:31:57.127Z',
        updatedDate: '2026-08-30T13:57:42.328Z',
        isBlocked: false,
        nickname: 'edisonestival',
      },
      {
        userId: 'auth0|6a8f97cc0bdc2f5eb854787e',
        email: 'shakran91@gmail.com',
        userName: 'shakran91@gmail.com',
        phoneNumber: '',
        createdDate: '2026-08-27T01:50:04.086Z',
        updatedDate: '2026-08-27T01:53:18.305Z',
        isBlocked: true,
        nickname: 'shakran91',
      },
    ],
  ],
  meta: { totalItems: 6, totalPages: 1, currentPage: 0, limit: 10 },
  path: '/api/v1/settings/listusers',
};

describe('mapSettingsUsersPageResponse', () => {
  it('unwraps the array nested inside dataResponse', () => {
    const result = mapSettingsUsersPageResponse(listUsersResponse, 1, 10);

    expect(result.items).toHaveSize(2);
    expect(result.items[0].userId).toBe('auth0|6a7d2c9d789142a48d96ec53');
    expect(result.items[0].email).toBe('edisonestival@gmail.com');
    expect(result.items[1].isBlocked).toBeTrue();
  });

  it('reads the totals from meta', () => {
    const result = mapSettingsUsersPageResponse(listUsersResponse, 1, 10);

    expect(result.totalItems).toBe(6);
    expect(result.totalPages).toBe(1);
    expect(result.pageSize).toBe(10);
  });

  it('keeps the requested page instead of the unreliable meta.currentPage', () => {
    const result = mapSettingsUsersPageResponse(listUsersResponse, 3, 10);

    expect(result.page).toBe(3);
  });

  it('leaves the fields missing from an older response empty', () => {
    const [user] = mapSettingsUsersPageResponse(listUsersResponse, 1, 10).items;

    expect(user.role).toBeNull();
    expect(user.document).toBe('');
    expect(user.company).toBe('');
    expect(user.emailVerified).toBeNull();
    expect(user.lastLogin).toBeNull();
  });

  it('also accepts a flat array, in case the backend stops nesting it', () => {
    const flat = { dataResponse: listUsersResponse.dataResponse[0], meta: listUsersResponse.meta };

    expect(mapSettingsUsersPageResponse(flat, 1, 10).items).toHaveSize(2);
  });

  it('returns an empty page for an unexpected shape', () => {
    const result = mapSettingsUsersPageResponse({ dataResponse: null }, 1, 10);

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });
});

/** Forma de `listusers` tras ampliar `Auth0UserDto` (swagger de 2026-10). */
const enrichedUser = {
  userId: 'auth0|6a7d2c9d789142a48d96ec53',
  email: 'edisonestival@gmail.com',
  userName: 'edisonestival@gmail.com',
  phoneNumber: null,
  createdDate: '2026-08-13T02:31:57.127Z',
  updatedDate: '2026-10-20T13:57:42.328Z',
  isBlocked: false,
  nickname: 'edisonestival',
  roleId: 'rol_abc123',
  roleName: 'ADMIN',
  company: 'Transporte de Carga',
  document: '1234567891',
  fullName: 'Edison Restrepo',
  phone: '+573175766335',
};

describe('mapSettingsUsersPageResponse with the enriched Auth0UserDto', () => {
  const [user] = mapSettingsUsersPageResponse({ dataResponse: [[enrichedUser]], meta: {} }, 1, 10).items;

  it('reads role id, role name and the known role', () => {
    expect(user.roleId).toBe('rol_abc123');
    expect(user.roleName).toBe('ADMIN');
    expect(user.role).toBe('ADMIN');
  });

  it('reads the phone as text and keeps the empty root phoneNumber apart', () => {
    expect(user.phone).toBe('+573175766335');
    expect(user.phoneNumber).toBe('');
  });

  it('reads document, company and full name', () => {
    expect(user.document).toBe('1234567891');
    expect(user.company).toBe('Transporte de Carga');
    expect(user.fullName).toBe('Edison Restrepo');
  });

  it('keeps an unknown Auth0 role name but without a typed role', () => {
    const [other] = mapSettingsUsersPageResponse({ dataResponse: [{ ...enrichedUser, roleName: 'AUDITOR' }] }, 1, 10).items;

    expect(other.roleName).toBe('AUDITOR');
    expect(other.role).toBeNull();
  });
});

describe('mapSettingsRolesResponse', () => {
  const roles = [
    { id: 'rol_1', name: 'ADMIN', description: 'Administrador' },
    { id: 'rol_2', name: 'CLIENT', description: null },
  ];

  it('reads a plain array', () => {
    expect(mapSettingsRolesResponse(roles)).toEqual([
      { id: 'rol_1', name: 'ADMIN', description: 'Administrador' },
      { id: 'rol_2', name: 'CLIENT', description: '' },
    ]);
  });

  it('also reads it wrapped in dataResponse', () => {
    expect(mapSettingsRolesResponse({ dataResponse: roles })).toHaveSize(2);
  });

  it('drops roles without id or name', () => {
    expect(mapSettingsRolesResponse([{ id: '', name: 'X' }, { id: 'rol_3' }])).toEqual([]);
  });
});
