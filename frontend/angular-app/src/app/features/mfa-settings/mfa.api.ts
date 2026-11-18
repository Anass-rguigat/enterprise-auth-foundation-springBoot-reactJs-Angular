import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../../core/api/api-url';
import { MfaEnrollmentStart, MfaStatus } from '../../core/api/page.types';

@Injectable({ providedIn: 'root' })
export class MfaApi {
  private readonly http = inject(HttpClient);

  status(): Promise<MfaStatus> {
    return firstValueFrom(this.http.get<MfaStatus>(apiUrl('/me/mfa')));
  }

  enroll(): Promise<MfaEnrollmentStart> {
    return firstValueFrom(this.http.post<MfaEnrollmentStart>(apiUrl('/me/mfa/enroll'), null));
  }

  cancelEnroll(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl('/me/mfa/enroll')));
  }

  confirm(code: string): Promise<{ recoveryCodes: string[] }> {
    return firstValueFrom(
      this.http.post<{ recoveryCodes: string[] }>(apiUrl('/me/mfa/confirm'), { code })
    );
  }

  regenerateRecovery(password: string, code: string): Promise<{ recoveryCodes: string[] }> {
    return firstValueFrom(
      this.http.post<{ recoveryCodes: string[] }>(apiUrl('/me/mfa/recovery-codes/regenerate'), {
        password,
        code,
      })
    );
  }

  disable(password: string, code: string): Promise<void> {
    return firstValueFrom(
      this.http.request<void>('DELETE', apiUrl('/me/mfa'), { body: { password, code } })
    );
  }
}
