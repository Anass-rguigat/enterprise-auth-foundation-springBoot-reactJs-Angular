import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Public auth pages — bounce signed-in users to app (or forced password change). */
export const anonymousGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.status() === 'mustChangePassword') {
    return router.createUrlTree(['/change-password']);
  }
  if (auth.status() === 'authenticated') {
    return router.createUrlTree(['/dashboard']);
  }
  if (auth.status() === 'mfaChallenge') {
    return router.createUrlTree(['/mfa']);
  }
  return true;
};

/** MFA challenge only while challenge cookie / pending flag is active. */
export const mfaChallengeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.mfaPending() || auth.status() === 'mfaChallenge') {
    return true;
  }
  if (auth.status() === 'authenticated') {
    return router.createUrlTree(['/dashboard']);
  }
  if (auth.status() === 'mustChangePassword') {
    return router.createUrlTree(['/change-password']);
  }
  return router.createUrlTree(['/login']);
};

/** Shell routes — authenticated and not gated to password change. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.status() === 'mustChangePassword') {
    return router.createUrlTree(['/change-password']);
  }
  if (auth.status() === 'authenticated') {
    return true;
  }
  if (auth.status() === 'mfaChallenge') {
    return router.createUrlTree(['/mfa']);
  }
  return router.createUrlTree(['/login']);
};

/** Change password — signed-in or must-change gate. */
export const changePasswordGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.status() === 'authenticated' || auth.status() === 'mustChangePassword') {
    return true;
  }
  return router.createUrlTree(['/login']);
};
