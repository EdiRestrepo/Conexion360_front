export type UserRole = 'CLIENT' | 'ADMIN' | 'ANALISTAOPE' | 'ANALISTASAC';

export interface Auth0Identity {
  auth0UserId: string;
  email: string;
  name?: string;
  nickname?: string;
  fullName?: string;
  document?: string;
  company?: string;
  picture?: string;
  roles: UserRole[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  document?: string;
  company?: string;
  picture?: string | null;
}
