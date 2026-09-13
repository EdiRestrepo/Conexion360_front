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
  /** Sale de `user_metadata.phone`; en la raiz de Auth0 solo existe para conexiones SMS. */
  phoneNumber?: string;
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
  phoneNumber?: string;
  nickname?: string;
}
