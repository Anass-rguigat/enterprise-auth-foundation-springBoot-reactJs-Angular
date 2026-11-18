import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';

@Injectable({ providedIn: 'root' })
export class InvitationsApi {
  private readonly http = inject(HttpClient);

  accept(token: string, password: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(apiUrl('/invitations/accept'), { token, password }));
  }
}
