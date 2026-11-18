import { CurrentUser } from '../app/core/auth/auth.models';
import { environment } from '../environments/environment';

export const API = environment.apiBaseUrl;

export function apiPath(path: string): string {
  return `${API}/api/v1${path}`;
}

export function sampleUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Admin',
    status: 'ACTIVE',
    emailVerified: true,
    mustChangePassword: false,
    mfaEnabled: false,
    roles: ['SUPER_ADMIN'],
    permissions: ['USER_READ', 'ROLE_READ', 'AUDIT_READ'],
    tokenVersion: 1,
    authzVersion: 1,
    ...overrides,
  };
}
