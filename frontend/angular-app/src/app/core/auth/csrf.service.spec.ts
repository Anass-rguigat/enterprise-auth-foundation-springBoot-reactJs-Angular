import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CsrfService } from './csrf.service';
import { apiPath } from '../../../testing/auth-fixtures';

describe('CsrfService', () => {
  let csrf: CsrfService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    csrf = TestBed.inject(CsrfService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('bootstraps token into memory only', async () => {
    const pending = csrf.bootstrap();
    const req = http.expectOne(apiPath('/auth/csrf'));
    expect(req.request.method).toBe('GET');
    req.flush({ token: 'csrf-memory-token' });

    await expect(pending).resolves.toBe('csrf-memory-token');
    expect(csrf.token()).toBe('csrf-memory-token');
    // Must not rely on web storage APIs (unavailable under some Vitest/jsdom configs).
    expect(csrf.requireToken()).toBe('csrf-memory-token');
  });

  it('clears memory token', async () => {
    const pending = csrf.bootstrap();
    http.expectOne(apiPath('/auth/csrf')).flush({ token: 'x' });
    await pending;

    csrf.clear();
    expect(csrf.token()).toBeNull();
    expect(() => csrf.requireToken()).toThrow(/not bootstrapped/);
  });

  it('rejects empty CSRF body', async () => {
    const pending = csrf.bootstrap();
    http.expectOne(apiPath('/auth/csrf')).flush({});
    await expect(pending).rejects.toThrow(/empty token/);
  });
});
