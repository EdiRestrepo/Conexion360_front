import { UserRole } from './user.model';

export interface NotificationPreference {
  email: boolean;
  inApp: boolean;
  shipmentStatusChanges: boolean;
  delays: boolean;
  delivery: boolean;
  documents: boolean;
  containers: boolean;
}

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

export interface PendingUserProfile {
  fullName: string;
  company: string;
  email: string;
  document?: string;
  phone?: string | null;
  acceptedDataPolicy: true;
  createdAt: string;
}

export interface UserProfile {
  auth0UserId: string;
  fullName: string;
  company: string;
  email: string;
  document?: string;
  phone?: string | null;
  picture?: string | null;
  role: UserRole;
  profileCompleted: boolean;
  notificationPreferences: NotificationPreference;
  acceptedDataPolicyAt: string;
  createdAt: string;
}
