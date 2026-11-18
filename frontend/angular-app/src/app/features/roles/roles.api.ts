import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { Role } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class RolesApi {
  private readonly http = inject(HttpClient);

  list(): Promise<Role[]> {
    return firstValueFrom(this.http.get<Role[]>(apiUrl('/admin/roles')));
  }

  get(roleCode: string): Promise<Role> {
    return firstValueFrom(this.http.get<Role>(apiUrl(`/admin/roles/${encodeURIComponent(roleCode)}`)));
  }

  create(body: {
    code: string;
    name: string;
    description?: string;
    permissionCodes?: string[];
  }): Promise<Role> {
    return firstValueFrom(this.http.post<Role>(apiUrl('/admin/roles'), body));
  }

  update(roleCode: string, body: { name?: string; description?: string | null }): Promise<Role> {
    return firstValueFrom(
      this.http.patch<Role>(apiUrl(`/admin/roles/${encodeURIComponent(roleCode)}`), body)
    );
  }

  delete(roleCode: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(apiUrl(`/admin/roles/${encodeURIComponent(roleCode)}`))
    );
  }

  attachPermission(roleCode: string, permissionCode: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(apiUrl(`/admin/roles/${encodeURIComponent(roleCode)}/permissions`), {
        permissionCode,
      })
    );
  }

  detachPermission(roleCode: string, permissionCode: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        apiUrl(
          `/admin/roles/${encodeURIComponent(roleCode)}/permissions/${encodeURIComponent(permissionCode)}`
        )
      )
    );
  }
}
