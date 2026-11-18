import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { SecurityOverview, SessionSummary } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class SecurityApi {
  private readonly http = inject(HttpClient);

  overview(): Promise<SecurityOverview> {
    return firstValueFrom(this.http.get<SecurityOverview>(apiUrl('/me/security')));
  }

  sessions(): Promise<SessionSummary[]> {
    return firstValueFrom(this.http.get<SessionSummary[]>(apiUrl('/me/security/sessions')));
  }

  revokeSession(familyId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(apiUrl(`/me/security/sessions/${encodeURIComponent(familyId)}`))
    );
  }
}
