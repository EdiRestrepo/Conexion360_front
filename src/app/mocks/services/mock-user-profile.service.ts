import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import { Auth0Identity, PendingUserProfile, UserProfile } from '../../core/models/user-profile.model';
import { UserProfileDataSource } from '../../core/services/user-profile-data-source';

// Persistencia temporal para prototipo frontend; no almacena credenciales ni tokens.
const profileStorageKey = 'conexion360.user-profiles';
const pendingRegistrationStorageKey = 'conexion360.pending-profile';
const simulatedLatencyMs = 250;

@Injectable({
  providedIn: 'root',
})
export class MockUserProfileService implements UserProfileDataSource {
  private readonly profilesChanged = signal(0);

  readonly profileChanges = this.profilesChanged.asReadonly();

  getProfileByAuth0Id(auth0UserId: string): Observable<UserProfile | null> {
    return of(this.findProfileByAuth0Id(auth0UserId)).pipe(delay(simulatedLatencyMs));
  }

  saveProfile(profile: UserProfile): Observable<UserProfile> {
    this.writeProfiles([...this.readProfiles().filter((item) => item.auth0UserId !== profile.auth0UserId), profile]);
    this.profilesChanged.update((value) => value + 1);
    return of(profile).pipe(delay(simulatedLatencyMs));
  }

  savePendingRegistration(profile: PendingUserProfile): Observable<PendingUserProfile> {
    localStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(profile));
    return of(profile).pipe(delay(simulatedLatencyMs));
  }

  getPendingRegistration(): Observable<PendingUserProfile | null> {
    return of(this.readPendingRegistration()).pipe(delay(simulatedLatencyMs));
  }

  clearPendingRegistration(): Observable<void> {
    localStorage.removeItem(pendingRegistrationStorageKey);
    return of(undefined).pipe(delay(simulatedLatencyMs));
  }

  completeProfileFromIdentity(identity: Auth0Identity): Observable<UserProfile | null> {
    const existingProfile = this.findProfileByAuth0Id(identity.auth0UserId);

    if (existingProfile) {
      return of(existingProfile).pipe(delay(simulatedLatencyMs));
    }

    const pendingProfile = this.readPendingRegistration();

    if (!pendingProfile || !this.isSameEmail(pendingProfile.email, identity.email)) {
      return of(null).pipe(delay(simulatedLatencyMs));
    }

    const profile = this.createUserProfile(identity, pendingProfile);
    this.writeProfiles([...this.readProfiles(), profile]);
    localStorage.removeItem(pendingRegistrationStorageKey);
    this.profilesChanged.update((value) => value + 1);

    return of(profile).pipe(delay(simulatedLatencyMs));
  }

  createProfileFromForm(identity: Auth0Identity, formProfile: Omit<PendingUserProfile, 'email' | 'createdAt'>): Observable<UserProfile> {
    const pendingProfile: PendingUserProfile = {
      ...formProfile,
      email: identity.email,
      createdAt: new Date().toISOString(),
    };
    const profile = this.createUserProfile(identity, pendingProfile);
    this.writeProfiles([...this.readProfiles().filter((item) => item.auth0UserId !== identity.auth0UserId), profile]);
    this.profilesChanged.update((value) => value + 1);

    return of(profile).pipe(delay(simulatedLatencyMs));
  }

  hasUnsafeStoredCredentials(): boolean {
    const storedData = `${localStorage.getItem(profileStorageKey) ?? ''}${localStorage.getItem(pendingRegistrationStorageKey) ?? ''}`;
    return /password|contrase|access_token|refresh_token|client_secret/i.test(storedData);
  }

  private createUserProfile(identity: Auth0Identity, pendingProfile: PendingUserProfile): UserProfile {
    return {
      auth0UserId: identity.auth0UserId,
      fullName: pendingProfile.fullName,
      company: pendingProfile.company,
      email: identity.email || pendingProfile.email,
      phone: pendingProfile.phone ?? null,
      picture: identity.picture ?? null,
      role: 'CLIENT',
      profileCompleted: true,
      notificationPreferences: {
        email: true,
        inApp: true,
        shipmentStatusChanges: true,
        delays: true,
        delivery: true,
        documents: true,
        containers: true,
      },
      acceptedDataPolicyAt: pendingProfile.createdAt,
      createdAt: new Date().toISOString(),
    };
  }

  private findProfileByAuth0Id(auth0UserId: string): UserProfile | null {
    return this.readProfiles().find((profile) => profile.auth0UserId === auth0UserId) ?? null;
  }

  private readProfiles(): UserProfile[] {
    const rawProfiles = localStorage.getItem(profileStorageKey);

    if (!rawProfiles) {
      return [];
    }

    try {
      return JSON.parse(rawProfiles) as UserProfile[];
    } catch {
      localStorage.removeItem(profileStorageKey);
      return [];
    }
  }

  private writeProfiles(profiles: UserProfile[]): void {
    localStorage.setItem(profileStorageKey, JSON.stringify(profiles));
  }

  private readPendingRegistration(): PendingUserProfile | null {
    const rawProfile = localStorage.getItem(pendingRegistrationStorageKey);

    if (!rawProfile) {
      return null;
    }

    try {
      return JSON.parse(rawProfile) as PendingUserProfile;
    } catch {
      localStorage.removeItem(pendingRegistrationStorageKey);
      return null;
    }
  }

  private isSameEmail(firstEmail: string, secondEmail: string): boolean {
    return firstEmail.trim().toLowerCase() === secondEmail.trim().toLowerCase();
  }
}
