import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '../config'
import { getCsrfToken } from './csrf'
import { getAuthBridge } from './authBridge'
import type { ApiProblem } from './auth.models'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

/** Match relative (`/auth/login`) and absolute (`…/api/v1/auth/login`) axios URLs. */
const SKIP_REFRESH_SUFFIXES = [
  '/auth/csrf',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/mfa/verify',
  '/auth/mfa/recover',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
]

type RetriableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean }

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) return true
  return SKIP_REFRESH_SUFFIXES.some((suffix) => url.includes(suffix))
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  withCredentials: true,
  headers: { Accept: 'application/json' },
  validateStatus: (status) => status >= 200 && status < 300,
})

apiClient.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = axios.AxiosHeaders.from({})
  }
  if (!config.headers.get('X-Correlation-Id')) {
    config.headers.set('X-Correlation-Id', crypto.randomUUID())
  }
  const method = (config.method ?? 'get').toUpperCase()
  if (!SAFE.has(method)) {
    const token = getCsrfToken()
    if (token) {
      config.headers.set('X-XSRF-TOKEN', token)
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiProblem>) => {
    const status = error.response?.status
    const config = error.config as RetriableConfig | undefined
    const bridge = getAuthBridge()

    if (status === 503) {
      return Promise.reject(error)
    }

    if (status === 403 && error.response?.data?.errorCode === 'PASSWORD_CHANGE_REQUIRED') {
      bridge.requirePasswordChange()
      return Promise.reject(error)
    }

    if (
      status !== 401 ||
      !config ||
      shouldSkipRefresh(config.url) ||
      config._authRetried
    ) {
      return Promise.reject(error)
    }

    const result = await bridge.refreshSession()
    if (result === 'unavailable') {
      return Promise.reject(error)
    }
    if (!result) {
      const authStatus = bridge.getStatus()
      if (authStatus === 'authenticated' || authStatus === 'mustChangePassword') {
        bridge.handleSessionLost()
      }
      return Promise.reject(error)
    }

    config._authRetried = true
    return apiClient.request(config)
  },
)

export function problemMessage(err: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(err)) {
    const problem = err.response?.data as ApiProblem | string | undefined
    if (problem && typeof problem === 'object') {
      return problem.detail || problem.title || fallback
    }
    if (err.response?.status === 401) {
      return 'Invalid email or password'
    }
    if (err.response?.status === 503) {
      return 'Service temporarily unavailable. Please retry — you are not signed out.'
    }
  }
  if (err && typeof err === 'object' && 'detail' in err) {
    return String((err as ApiProblem).detail || fallback)
  }
  return fallback
}
