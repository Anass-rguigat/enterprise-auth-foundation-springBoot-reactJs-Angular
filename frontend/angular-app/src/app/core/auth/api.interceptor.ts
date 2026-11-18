import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { ApiProblem } from './auth.models';

export const AUTH_RETRIED = new HttpContextToken<boolean>(() => false);

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

const SKIP_REFRESH_SUFFIXES = [
  '/api/v1/auth/csrf',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/mfa/verify',
  '/api/v1/auth/mfa/recover',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
];

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl);
}

function shouldSkipRefresh(url: string): boolean {
  return SKIP_REFRESH_SUFFIXES.some((suffix) => url.includes(suffix));
}

/** Credentials + CSRF memory header + correlation id for API host requests. */
export const apiCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const csrf = inject(CsrfService);
  let headers = req.headers;

  if (!headers.has('Accept')) {
    headers = headers.set('Accept', 'application/json');
  }
  if (!headers.has('X-Correlation-Id')) {
    headers = headers.set('X-Correlation-Id', crypto.randomUUID());
  }

  const method = req.method.toUpperCase();
  if (!SAFE.has(method)) {
    const token = csrf.token();
    if (token) {
      headers = headers.set('X-XSRF-TOKEN', token);
    }
  }

  return next(
    req.clone({
      headers,
      withCredentials: true,
    })
  );
};

/**
 * On 401: single-flight refresh once, then retry. 503 never clears session.
 * 403 PASSWORD_CHANGE_REQUIRED forces password-change UX.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      if (err.status === 503) {
        return throwError(() => err);
      }

      const problem = (err.error ?? {}) as ApiProblem;
      if (err.status === 403 && problem.errorCode === 'PASSWORD_CHANGE_REQUIRED') {
        auth.requirePasswordChange();
        return throwError(() => err);
      }

      if (err.status !== 401 || shouldSkipRefresh(req.url) || req.context.get(AUTH_RETRIED)) {
        return throwError(() => err);
      }

      return from(auth.refreshSession()).pipe(
        switchMap((result) => {
          if (result === 'unavailable') {
            // Infra failure — keep session UX; surface original error to caller.
            return throwError(() => err);
          }
          if (!result) {
            // Avoid navigating during anonymous boot (status still unknown/anonymous).
            if (auth.status() === 'authenticated' || auth.status() === 'mustChangePassword') {
              auth.handleSessionLost();
            }
            return throwError(() => err);
          }
          return next(
            req.clone({
              context: req.context.set(AUTH_RETRIED, true),
            })
          );
        })
      );
    })
  );
};
