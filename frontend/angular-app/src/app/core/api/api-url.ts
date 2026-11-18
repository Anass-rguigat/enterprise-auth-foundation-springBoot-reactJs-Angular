import { environment } from '../../../environments/environment';

/** Absolute `/api/v1/...` URL on the API host. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${environment.apiBaseUrl}/api/v1${normalized}`;
}
