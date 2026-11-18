import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { signal } from '@angular/core';
import {
  anonymousGuard,
  authGuard,
  changePasswordGuard,
  mfaChallengeGuard,
} from './auth.guards';
import { AuthService } from './auth.service';
import { AuthStatus } from './auth.models';

describe('auth guards', () => {
  const status = signal<AuthStatus>('anonymous');
  const mfaPending = signal(false);

  const authStub = {
    status: status.asReadonly(),
    mfaPending: mfaPending.asReadonly(),
  };

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/' } as RouterStateSnapshot;

  beforeEach(() => {
    status.set('anonymous');
    mfaPending.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
  });

  function run(guard: CanActivateFn): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => guard(route, state)) as boolean | UrlTree;
  }

  function path(result: boolean | UrlTree): string | true {
    if (result === true) {
      return true;
    }
    if (result instanceof UrlTree || (typeof result === 'object' && result !== null)) {
      return TestBed.inject(Router).serializeUrl(result as UrlTree);
    }
    return String(result);
  }

  describe('anonymousGuard', () => {
    it('allows anonymous users', () => {
      expect(run(anonymousGuard)).toBe(true);
    });

    it('redirects authenticated users to dashboard', () => {
      status.set('authenticated');
      expect(path(run(anonymousGuard))).toBe('/dashboard');
    });

    it('redirects must-change users to change-password', () => {
      status.set('mustChangePassword');
      expect(path(run(anonymousGuard))).toBe('/change-password');
    });

    it('redirects MFA challenge to /mfa', () => {
      status.set('mfaChallenge');
      expect(path(run(anonymousGuard))).toBe('/mfa');
    });
  });

  describe('authGuard', () => {
    it('allows authenticated users', () => {
      status.set('authenticated');
      expect(run(authGuard)).toBe(true);
    });

    it('forces password change gate', () => {
      status.set('mustChangePassword');
      expect(path(run(authGuard))).toBe('/change-password');
    });

    it('sends anonymous users to login', () => {
      expect(path(run(authGuard))).toBe('/login');
    });

    it('sends MFA challenge to /mfa', () => {
      status.set('mfaChallenge');
      expect(path(run(authGuard))).toBe('/mfa');
    });
  });

  describe('mfaChallengeGuard', () => {
    it('allows pending MFA challenge', () => {
      mfaPending.set(true);
      expect(run(mfaChallengeGuard)).toBe(true);
    });

    it('blocks when no challenge is active', () => {
      expect(path(run(mfaChallengeGuard))).toBe('/login');
    });
  });

  describe('changePasswordGuard', () => {
    it('allows authenticated and must-change users', () => {
      status.set('authenticated');
      expect(run(changePasswordGuard)).toBe(true);
      status.set('mustChangePassword');
      expect(run(changePasswordGuard)).toBe(true);
    });

    it('blocks anonymous users', () => {
      expect(path(run(changePasswordGuard))).toBe('/login');
    });
  });
});
