import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { AdminUser, SpringPage, UserProfile } from '../../core/api/page.types';

export type CreateUserPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  preferredLanguage?: string;
  timezone?: string;
  jobTitle?: string;
  department?: string;
  organization?: string;
  city?: string;
  country?: string;
  bio?: string;
  roleCodes?: string[];
};

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferredLanguage?: string;
  timezone?: string;
  jobTitle?: string;
  department?: string;
  organization?: string;
  city?: string;
  country?: string;
  bio?: string;
};

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  list(opts: { q?: string; status?: string; page?: number; size?: number } = {}): Promise<SpringPage<AdminUser>> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 20));
    if (opts.q) {
      params = params.set('q', opts.q);
    }
    if (opts.status) {
      params = params.set('status', opts.status);
    }
    return firstValueFrom(this.http.get<SpringPage<AdminUser>>(apiUrl('/admin/users'), { params }));
  }

  get(userId: string): Promise<AdminUser> {
    return firstValueFrom(this.http.get<AdminUser>(apiUrl(`/admin/users/${userId}`)));
  }

  getProfile(userId: string): Promise<UserProfile> {
    return firstValueFrom(this.http.get<UserProfile>(apiUrl(`/admin/users/${userId}/profile`)));
  }

  create(body: CreateUserPayload): Promise<AdminUser> {
    return firstValueFrom(this.http.post<AdminUser>(apiUrl('/admin/users'), body));
  }

  update(userId: string, body: UpdateUserPayload): Promise<AdminUser> {
    return firstValueFrom(this.http.patch<AdminUser>(apiUrl(`/admin/users/${userId}`), body));
  }

  activate(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/activate`), null));
  }

  suspend(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/suspend`), null));
  }

  disable(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/disable`), null));
  }

  softDelete(userId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/admin/users/${userId}`)));
  }

  restore(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/restore`), null));
  }

  forcePasswordReset(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/force-password-reset`), null));
  }

  revokeSessions(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/revoke-sessions`), null));
  }

  sendInvitation(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/invitations`), null));
  }

  assignRole(userId: string, roleCode: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(apiUrl(`/admin/users/${userId}/roles`), { roleCode })
    );
  }

  removeRole(userId: string, roleCode: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(apiUrl(`/admin/users/${userId}/roles/${encodeURIComponent(roleCode)}`))
    );
  }

  grantSuperAdmin(userId: string, password: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(apiUrl(`/admin/users/${userId}/grant-super-admin`), { password })
    );
  }

  resetMfa(userId: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl(`/admin/users/${userId}/mfa/reset`), null));
  }
}
