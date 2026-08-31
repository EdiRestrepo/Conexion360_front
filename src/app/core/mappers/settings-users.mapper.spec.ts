import { mapSettingsUsersPageResponse } from './settings-users.mapper';

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

    expect(result.items.length).toBe(2);
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

  it('leaves the fields the DTO does not expose yet empty', () => {
    const [user] = mapSettingsUsersPageResponse(listUsersResponse, 1, 10).items;

    expect(user.role).toBeNull();
    expect(user.document).toBe('');
    expect(user.company).toBe('');
    expect(user.emailVerified).toBeNull();
    expect(user.lastLogin).toBeNull();
  });

  it('also accepts a flat array, in case the backend stops nesting it', () => {
    const flat = { dataResponse: listUsersResponse.dataResponse[0], meta: listUsersResponse.meta };

    expect(mapSettingsUsersPageResponse(flat, 1, 10).items.length).toBe(2);
  });

  it('returns an empty page for an unexpected shape', () => {
    const result = mapSettingsUsersPageResponse({ dataResponse: null }, 1, 10);

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });
});
