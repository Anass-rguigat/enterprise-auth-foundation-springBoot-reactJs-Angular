import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Sibling-host CSRF: token from GET /auth/csrf body, kept in memory only.
 * Never persist to localStorage / sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private readonly tokenSignal = signal<string | null>(null);

  readonly token = this.tokenSignal.asReadonly();

  clear(): void {
    this.tokenSignal.set(null);
  }

  async bootstrap(): Promise<string> {
    const body = await firstValueFrom(
      this.http.get<{ token: string }>(`${environment.apiBaseUrl}/api/v1/auth/csrf`)
    );
    if (!body?.token) {
      throw new Error('CSRF bootstrap failed: empty token');
    }
    this.tokenSignal.set(body.token);
    return body.token;
  }

  requireToken(): string {
    const value = this.tokenSignal();
    if (!value) {
      throw new Error('CSRF token not bootstrapped');
    }
    return value;
  }
}
