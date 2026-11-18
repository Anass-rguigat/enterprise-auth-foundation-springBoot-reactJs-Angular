import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { UserProfile } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  getMine(): Promise<UserProfile> {
    return firstValueFrom(this.http.get<UserProfile>(apiUrl('/me/profile')));
  }

  updateMine(body: Partial<UserProfile>): Promise<UserProfile> {
    return firstValueFrom(this.http.patch<UserProfile>(apiUrl('/me/profile'), body));
  }
}
