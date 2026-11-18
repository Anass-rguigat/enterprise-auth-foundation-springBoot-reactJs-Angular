import axios from 'axios'
import { apiBaseUrl } from '../config'

/** Sibling-host CSRF: body token kept in memory only — never web storage. */
let csrfToken: string | null = null

export function getCsrfToken(): string | null {
  return csrfToken
}

export function clearCsrfToken(): void {
  csrfToken = null
}

export function requireCsrfToken(): string {
  if (!csrfToken) {
    throw new Error('CSRF token not bootstrapped')
  }
  return csrfToken
}

export async function bootstrapCsrf(): Promise<string> {
  const res = await axios.get<{ token: string }>(`${apiBaseUrl}/api/v1/auth/csrf`, {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  })
  if (!res.data?.token) {
    throw new Error('CSRF bootstrap failed: empty token')
  }
  csrfToken = res.data.token
  return csrfToken
}
