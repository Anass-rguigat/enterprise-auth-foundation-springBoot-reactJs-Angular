import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiCredentialsInterceptor, authRefreshInterceptor } from './api.interceptor';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { AuthStatus } from './auth.models';
import { apiPath } from '../../../testing/auth-fixtures';

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('API interceptors', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let csrf: CsrfService;

  const status = signal<AuthStatus>('authenticated');
  const refreshSession = vi.fn();
  const requirePasswordChange = vi.fn();
  const handleSessionLost = vi.fn();

  const authStub = {
    status: status.asReadonly(),
    refreshSession,
    requirePasswordChange,
    handleSessionLost,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    status.set('authenticated');
    refreshSession.mockReset();
    requirePasswordChange.mockReset();
    handleSessionLost.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiCredentialsInterceptor, authRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    csrf = TestBed.inject(CsrfService);
  });

  afterEach(() => {
    http.verify();
  });

  async function seedCsrf(token = 'mem-csrf'): Promise<void> {
    const boot = csrf.bootstrap();
    http.expectOne(apiPath('/auth/csrf')).flush({ token });
    await boot;
  }

  it('adds credentials, CSRF header, and correlation id on unsafe API calls', async () => {
    await seedCsrf();

    const pending = firstValueFrom(httpClient.post(apiPath('/admin/users'), { email: 'a@b.c' }));
    const req = http.expectOne(apiPath('/admin/users'));
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('mem-csrf');
    expect(req.request.headers.get('X-Correlation-Id')).toBeTruthy();
    req.flush({ id: '1' });
    await pending;
  });

  it('retries once after successful single-flight refresh on 401', async () => {
    refreshSession.mockResolvedValue(true);

    const pending = firstValueFrom(httpClient.get(apiPath('/auth/me')));
    http.expectOne(apiPath('/auth/me')).flush({ title: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await tick();

    const retry = http.expectOne(apiPath('/auth/me'));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    retry.flush({ email: 'admin@example.com' });
    await expect(pending).resolves.toEqual({ email: 'admin@example.com' });
    expect(handleSessionLost).not.toHaveBeenCalled();
  });

  it('calls handleSessionLost when refresh fails while authenticated', async () => {
    refreshSession.mockResolvedValue(false);
    const pending = firstValueFrom(httpClient.get(apiPath('/demo/notes')));
    http.expectOne(apiPath('/demo/notes')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();
    await expect(pending).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(handleSessionLost).toHaveBeenCalledTimes(1);
  });

  it('does not logout on 503', async () => {
    const pending = firstValueFrom(httpClient.get(apiPath('/auth/me')));
    http.expectOne(apiPath('/auth/me')).flush(
      { errorCode: 'SERVICE_UNAVAILABLE' },
      { status: 503, statusText: 'Service Unavailable' }
    );
    await expect(pending).rejects.toMatchObject({ status: 503 });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(handleSessionLost).not.toHaveBeenCalled();
  });

  it('does not logout when refresh returns unavailable', async () => {
    refreshSession.mockResolvedValue('unavailable');
    const pending = firstValueFrom(httpClient.get(apiPath('/auth/me')));
    http.expectOne(apiPath('/auth/me')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await tick();
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(handleSessionLost).not.toHaveBeenCalled();
  });

  it('forces password change on 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const pending = firstValueFrom(httpClient.get(apiPath('/admin/users')));
    http.expectOne(apiPath('/admin/users')).flush(
      { errorCode: 'PASSWORD_CHANGE_REQUIRED', detail: 'Password change required' },
      { status: 403, statusText: 'Forbidden' }
    );
    await expect(pending).rejects.toMatchObject({ status: 403 });
    expect(requirePasswordChange).toHaveBeenCalledTimes(1);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('skips refresh for login 401', async () => {
    const pending = firstValueFrom(
      httpClient.post(apiPath('/auth/login'), { email: 'a', password: 'b' })
    );
    http.expectOne(apiPath('/auth/login')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('ignores non-API requests', async () => {
    const pending = firstValueFrom(httpClient.get('https://example.com/health'));
    const req = http.expectOne('https://example.com/health');
    expect(req.request.withCredentials).toBe(false);
    req.flush({ ok: true });
    await pending;
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
