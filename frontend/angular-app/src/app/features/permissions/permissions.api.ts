import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { CatalogPermission } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class PermissionsApi {
  private readonly http = inject(HttpClient);

  list(): Promise<CatalogPermission[]> {
    return firstValueFrom(this.http.get<CatalogPermission[]>(apiUrl('/admin/permissions')));
  }
}
