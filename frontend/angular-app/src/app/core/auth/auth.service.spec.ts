import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { PermissionService } from '../permissions/permission.service';
import { AuthBroadcastService } from './auth-broadcast.service';
import { apiPath, sampleUser } from '../../../testing/auth-fixtures';

/** Flush microtasks so async service methods reach their HttpClient subscribe. */
async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let csrf: CsrfService;
  let permissions: PermissionService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }, { path: 'dashboard', children: [] }]),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    csrf = TestBed.inject(CsrfService);
    permissions = TestBed.inject(PermissionService);
    TestBed.inject(AuthBroadcastService);
  });

  afterEach(() => {
    http.verify();
  });

  /** ensureCsrf() always bootstraps before mutations. */
  async function flushEnsureCsrf(token = 'csrf-token'): Promise<void> {
    await tick();
    http.expectOne(apiPath('/auth/csrf')).flush({ token });
    await tick();
  }

  it('logs in without MFA and loads /me permissions', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();

    const loginReq = http.expectOne(apiPath('/auth/login'));
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.body).toEqual({ email: 'admin@example.com', password: 'secret' });
    loginReq.flush(null, { status: 204, statusText: 'No Content' });
    await tick();

    http.expectOne(apiPath('/auth/me')).flush(sampleUser({ permissions: ['USER_READ', 'ROLE_READ'] }));

    await expect(loginPromise).resolves.toBe('session');
    expect(auth.status()).toBe('authenticated');
    expect(auth.user()?.email).toBe('admin@example.com');
    expect(permissions.has('USER_READ')).toBe(true);
    expect(permissions.has('AUDIT_READ')).toBe(false);
  });

  it('enters MFA challenge on login 200 mfaRequired', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/login')).flush({ mfaRequired: true });
    await expect(loginPromise).resolves.toBe('mfaRequired');
    expect(auth.status()).toBe('mfaChallenge');
    expect(auth.mfaPending()).toBe(true);
    expect(auth.user()).toBeNull();
  });

  it('verifies MFA then loads /me', async () => {
    const verifyPromise = auth.verifyMfa('123456');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/mfa/verify')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser({ mfaEnabled: true }));
    await verifyPromise;
    expect(auth.status()).toBe('authenticated');
    expect(auth.mfaPending()).toBe(false);
  });

  it('applies mustChangePassword from /me', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/login')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser({ mustChangePassword: true }));
    await loginPromise;
    expect(auth.status()).toBe('mustChangePassword');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('single-flights concurrent refreshSession calls', async () => {
    const first = auth.refreshSession();
    const second = auth.refreshSession();
    expect(second).toBe(first);
    await flushEnsureCsrf();

    const refreshReq = http.expectOne(apiPath('/auth/refresh'));
    expect(refreshReq.request.method).toBe('POST');
    refreshReq.flush(null, { status: 204, statusText: 'No Content' });

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('returns unavailable on refresh 503 without clearing session', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/login')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser());
    await loginPromise;
    expect(auth.status()).toBe('authenticated');

    const refreshPromise = auth.refreshSession();
    await flushEnsureCsrf('refresh-csrf');
    http.expectOne(apiPath('/auth/refresh')).flush(
      { errorCode: 'SERVICE_UNAVAILABLE' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    await expect(refreshPromise).resolves.toBe('unavailable');
    expect(auth.status()).toBe('authenticated');
    expect(auth.user()).not.toBeNull();
  });

  it('logout clears user and permissions', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/login')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser());
    await loginPromise;

    const logoutPromise = auth.logout();
    await flushEnsureCsrf('logout-csrf');
    http.expectOne(apiPath('/auth/logout')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/csrf')).flush({ token: 'new-csrf' });
    await logoutPromise;

    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
    expect(permissions.loaded()).toBe(false);
  });

  it('clears local session when peer broadcasts logout', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf();
    http.expectOne(apiPath('/auth/login')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser());
    await loginPromise;

    const peer = new BroadcastChannel('enterprise-auth');
    peer.postMessage({ type: 'logout' });
    await vi.waitFor(() => {
      expect(auth.status()).toBe('anonymous');
      expect(auth.user()).toBeNull();
    });
    // handleSessionLost re-bootstraps CSRF after clear
    http.expectOne(apiPath('/auth/csrf')).flush({ token: 'peer-logout-csrf' });
    peer.close();
  });

  it('keeps CSRF token in memory after login (not a JWT store)', async () => {
    const loginPromise = auth.login('admin@example.com', 'secret');
    await flushEnsureCsrf('csrf-token');
    http.expectOne(apiPath('/auth/login')).flush(null, { status: 204, statusText: 'No Content' });
    await tick();
    http.expectOne(apiPath('/auth/me')).flush(sampleUser());
    await loginPromise;

    expect(csrf.token()).toBe('csrf-token');
    expect(auth.user()?.email).toBe('admin@example.com');
  });
});
