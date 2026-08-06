export type UserRole = 'CLIENT' | 'ADMIN' | 'ANALISTAOPE' | 'ANALISTASAC';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  document?: string;
  company?: string;
  picture?: string | null;
}
