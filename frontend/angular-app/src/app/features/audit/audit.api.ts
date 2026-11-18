import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { AuditEventType, AuditLog, SpringPage } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class AuditApi {
  private readonly http = inject(HttpClient);

  eventTypes(): Promise<AuditEventType[]> {
    return firstValueFrom(
      this.http.get<AuditEventType[]>(apiUrl('/admin/audit-logs/event-types')),
    );
  }

  search(
    opts: {
      eventType?: string;
      actor?: string;
      page?: number;
      size?: number;
    } = {},
  ): Promise<SpringPage<AuditLog>> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 50));
    if (opts.eventType) {
      params = params.set('eventType', opts.eventType);
    }
    if (opts.actor) {
      params = params.set('actor', opts.actor);
    }
    return firstValueFrom(
      this.http.get<SpringPage<AuditLog>>(apiUrl('/admin/audit-logs'), { params }),
    );
  }

  getById(id: string): Promise<AuditLog> {
    return firstValueFrom(this.http.get<AuditLog>(apiUrl(`/admin/audit-logs/${id}`)));
  }
}
