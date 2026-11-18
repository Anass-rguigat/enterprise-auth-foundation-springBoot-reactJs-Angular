import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionService } from '../permissions/permission.service';
import { AuthBroadcastService } from './auth-broadcast.service';
import {
  ApiProblem,
  AuthStatus,
  CurrentUser,
  LoginOutcome,
} from './auth.models';
import { CsrfService } from './csrf.service';

const api = (path: string) => `${environment.apiBaseUrl}/api/v1${path}`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly permissions = inject(PermissionService);
  private readonly broadcast = inject(AuthBroadcastService);
  private readonly router = inject(Router);

  private readonly userSignal = signal<CurrentUser | null>(null);
  private readonly statusSignal = signal<AuthStatus>('unknown');
  private readonly mfaPendingSignal = signal(false);
  private readonly initializedSignal = signal(false);

  private refreshInFlight: Promise<boolean | 'unavailable'> | null = null;
  private peerRefreshWaiters: Array<(ok: boolean | 'unavailable') => void> = [];
  private peerRefreshActive = false;
  private unsubBroadcast: (() => void) | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly mfaPending = this.mfaPendingSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly isAuthenticated = computed(
    () => this.statusSignal() === 'authenticated' || this.statusSignal() === 'mustChangePassword'
  );
  readonly displayName = computed(() => {
    const u = this.userSignal();
    if (!u) {
      return '';
    }
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.email;
  });

  constructor() {
    this.unsubBroadcast = this.broadcast.subscribe((msg) => this.onBroadcast(msg));
  }

  async initialize(): Promise<void> {
    try {
      await this.csrf.bootstrap();
    } catch {
      this.setAnonymous();
      this.initializedSignal.set(true);
      return;
    }

    try {
      await this.loadMe();
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 503) {
        // Keep cookies; do not treat infra failure as logout. Guards will retry via login/me later.
        this.statusSignal.set('anonymous');
      } else {
        this.setAnonymous();
      }
    } finally {
      this.initializedSignal.set(true);
    }
  }

  async login(email: string, password: string): Promise<LoginOutcome> {
    await this.ensureCsrf();
    const res = await firstValueFrom(
      this.http.post<{ mfaRequired?: boolean } | null>(api('/auth/login'), { email, password }, {
        observe: 'response',
      })
    );
    if (res.status === 204) {
      this.mfaPendingSignal.set(false);
      await this.loadMe();
      this.broadcast.publish({ type: 'session' });
      return 'session';
    }
    if (res.status === 200 && res.body?.mfaRequired) {
      this.mfaPendingSignal.set(true);
      this.statusSignal.set('mfaChallenge');
      this.userSignal.set(null);
      this.permissions.clear();
      return 'mfaRequired';
    }
    throw this.toProblem(res.status, res.body);
  }

  async verifyMfa(code: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/auth/mfa/verify'), { code }, { observe: 'response' }));
    this.mfaPendingSignal.set(false);
    await this.loadMe();
    this.broadcast.publish({ type: 'session' });
  }

  async recoverMfa(code: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/auth/mfa/recover'), { code }, { observe: 'response' }));
    this.mfaPendingSignal.set(false);
    await this.loadMe();
    this.broadcast.publish({ type: 'session' });
  }

  async forgotPassword(email: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/auth/forgot-password'), { email }));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/auth/reset-password'), { token, password }));
  }

  async verifyEmail(token: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/auth/verify-email'), { token }));
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(
      this.http.post(api('/me/password'), { currentPassword, newPassword }, { observe: 'response' })
    );
    this.csrf.clear();
    this.setAnonymous();
    this.broadcast.publish({ type: 'logout' });
    await this.csrf.bootstrap().catch(() => undefined);
  }

  async beginEmailChange(newEmail: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post(api('/me/email-change'), { newEmail }));
  }

  async logout(): Promise<void> {
    try {
      await this.ensureCsrf();
      await firstValueFrom(this.http.post(api('/auth/logout'), null, { observe: 'response' }));
    } catch {
      /* always clear local state */
    }
    this.csrf.clear();
    this.setAnonymous();
    this.broadcast.publish({ type: 'logout' });
    await this.csrf.bootstrap().catch(() => undefined);
    await this.router.navigateByUrl('/login');
  }

  async logoutAll(): Promise<void> {
    try {
      await this.ensureCsrf();
      await firstValueFrom(this.http.post(api('/auth/logout-all'), null, { observe: 'response' }));
    } catch {
      /* clear locally even if call fails */
    }
    this.csrf.clear();
    this.setAnonymous();
    this.broadcast.publish({ type: 'logout' });
    await this.csrf.bootstrap().catch(() => undefined);
    await this.router.navigateByUrl('/login');
  }

  /**
   * Single-flight refresh with same-origin BroadcastChannel coordination.
   * `true` = refreshed; `false` = auth failure; `'unavailable'` = 503 (do not logout).
   */
  refreshSession(): Promise<boolean | 'unavailable'> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }
    if (this.peerRefreshActive) {
      return this.waitForPeerRefresh();
    }

    this.broadcast.publish({ type: 'refresh:start' });
    this.refreshInFlight = this.performRefresh()
      .then((result) => {
        if (result === true) {
          this.broadcast.publish({ type: 'refresh:done' });
        } else if (result === false) {
          this.broadcast.publish({ type: 'refresh:failed' });
        } else {
          this.broadcast.publish({ type: 'refresh:unavailable' });
        }
        return result;
      })
      .finally(() => {
        this.refreshInFlight = null;
      });
    return this.refreshInFlight;
  }

  requirePasswordChange(): void {
    if (this.userSignal()) {
      this.statusSignal.set('mustChangePassword');
    }
    void this.router.navigateByUrl('/change-password');
  }

  handleSessionLost(): void {
    this.setAnonymous();
    this.csrf.clear();
    void this.csrf.bootstrap().catch(() => undefined);
    void this.router.navigateByUrl('/login');
  }

  problemMessage(err: unknown, fallback = 'Request failed'): string {
    if (err instanceof HttpErrorResponse) {
      const problem = err.error as ApiProblem | string | null;
      if (problem && typeof problem === 'object') {
        return problem.detail || problem.title || fallback;
      }
      if (err.status === 401) {
        return 'Invalid email or password';
      }
      if (err.status === 503) {
        return 'Service temporarily unavailable. Please retry — you are not signed out.';
      }
    }
    if (err && typeof err === 'object' && 'detail' in err) {
      return String((err as ApiProblem).detail || fallback);
    }
    return fallback;
  }

  private async loadMe(): Promise<void> {
    try {
      // 401 → authRefreshInterceptor single-flight refresh + one retry
      const me = await firstValueFrom(this.http.get<CurrentUser>(api('/auth/me')));
      this.applyUser(me);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 503) {
        // Keep prior/unknown state — 503 is not logout
        throw err;
      }
      this.setAnonymous();
    }
  }

  private applyUser(me: CurrentUser): void {
    this.userSignal.set(me);
    this.mfaPendingSignal.set(false);
    this.permissions.setPermissions(me.permissions ?? []);
    this.statusSignal.set(me.mustChangePassword ? 'mustChangePassword' : 'authenticated');
  }

  private setAnonymous(): void {
    this.userSignal.set(null);
    this.mfaPendingSignal.set(false);
    this.permissions.clear();
    this.statusSignal.set('anonymous');
  }

  /** Always re-fetch: other GETs must not leave memory out of sync with the API-host cookie. */
  private async ensureCsrf(): Promise<void> {
    await this.csrf.bootstrap();
  }

  private async performRefresh(): Promise<boolean | 'unavailable'> {
    try {
      await this.ensureCsrf();
      const res = await firstValueFrom(
        this.http.post(api('/auth/refresh'), null, { observe: 'response' })
      );
      return res.status === 204;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 503) {
        return 'unavailable';
      }
      return false;
    }
  }

  private waitForPeerRefresh(timeoutMs = 10_000): Promise<boolean | 'unavailable'> {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.peerRefreshWaiters = this.peerRefreshWaiters.filter((w) => w !== resolve);
        resolve(false);
      }, timeoutMs);
      this.peerRefreshWaiters.push((ok) => {
        window.clearTimeout(timer);
        resolve(ok);
      });
    });
  }

  private onBroadcast(msg: { type: string }): void {
    switch (msg.type) {
      case 'refresh:start':
        if (!this.refreshInFlight) {
          this.peerRefreshActive = true;
        }
        break;
      case 'refresh:done':
        this.peerRefreshActive = false;
        this.peerRefreshWaiters.splice(0).forEach((w) => w(true));
        break;
      case 'refresh:failed':
        this.peerRefreshActive = false;
        this.peerRefreshWaiters.splice(0).forEach((w) => w(false));
        break;
      case 'refresh:unavailable':
        this.peerRefreshActive = false;
        this.peerRefreshWaiters.splice(0).forEach((w) => w('unavailable'));
        break;
      case 'logout':
        this.peerRefreshActive = false;
        this.peerRefreshWaiters.splice(0).forEach((w) => w(false));
        // Match React: leave the shell (authGuard does not re-run on signal-only clears).
        this.handleSessionLost();
        break;
      case 'session':
        void this.loadMe().catch(() => undefined);
        break;
      default:
        break;
    }
  }

  private toProblem(status: number, body: unknown): ApiProblem {
    if (body && typeof body === 'object') {
      return { ...(body as ApiProblem), status };
    }
    return { status, detail: 'Request failed', errorCode: 'UNAUTHORIZED' };
  }
}
