import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { apiClient, problemMessage } from './apiClient'
import { bindAuthBridge } from './authBridge'
import { publishAuthMessage, subscribeAuthMessages } from './authBroadcast'
import { bootstrapCsrf, clearCsrfToken } from './csrf'
import type {
  AuthStatus,
  CurrentUser,
  LoginOutcome,
  RefreshResult,
  SessionGate,
} from './auth.models'
import { usePermissions } from '../permissions/PermissionContext'

type AuthContextValue = {
  user: CurrentUser | null
  status: AuthStatus
  mfaPending: boolean
  initialized: boolean
  isAuthenticated: boolean
  displayName: string
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<LoginOutcome>
  verifyMfa: (code: string) => Promise<SessionGate>
  recoverMfa: (code: string) => Promise<SessionGate>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  beginEmailChange: (newEmail: string) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  refreshSession: () => Promise<RefreshResult>
  requirePasswordChange: () => void
  handleSessionLost: () => void
  problemMessage: (err: unknown, fallback?: string) => string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const permissions = usePermissions()

  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('unknown')
  const [mfaPending, setMfaPending] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const refreshInFlight = useRef<Promise<RefreshResult> | null>(null)
  const peerRefreshActive = useRef(false)
  const peerRefreshWaiters = useRef<Array<(ok: RefreshResult) => void>>([])
  const statusRef = useRef(status)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const setAnonymous = useCallback(() => {
    setUser(null)
    setMfaPending(false)
    permissions.clear()
    setStatus('anonymous')
  }, [permissions])

  const applyUser = useCallback(
    (me: CurrentUser) => {
      setUser(me)
      setMfaPending(false)
      permissions.setPermissions(me.permissions ?? [])
      setStatus(me.mustChangePassword ? 'mustChangePassword' : 'authenticated')
    },
    [permissions],
  )

  /** Always re-fetch: other GETs must not leave memory out of sync with the API-host cookie. */
  const ensureCsrf = useCallback(async () => {
    await bootstrapCsrf()
  }, [])

  const performRefresh = useCallback(async (): Promise<RefreshResult> => {
    try {
      await ensureCsrf()
      const res = await apiClient.post('/auth/refresh', null, {
        validateStatus: (s) => s === 204,
      })
      return res.status === 204
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        return 'unavailable'
      }
      return false
    }
  }, [ensureCsrf])

  const waitForPeerRefresh = useCallback((timeoutMs = 10_000): Promise<RefreshResult> => {
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        peerRefreshWaiters.current = peerRefreshWaiters.current.filter((w) => w !== resolve)
        resolve(false)
      }, timeoutMs)
      peerRefreshWaiters.current.push((ok) => {
        window.clearTimeout(timer)
        resolve(ok)
      })
    })
  }, [])

  const refreshSession = useCallback((): Promise<RefreshResult> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current
    }
    if (peerRefreshActive.current) {
      return waitForPeerRefresh()
    }

    publishAuthMessage({ type: 'refresh:start' })
    refreshInFlight.current = performRefresh()
      .then((result) => {
        if (result === true) publishAuthMessage({ type: 'refresh:done' })
        else if (result === false) publishAuthMessage({ type: 'refresh:failed' })
        else publishAuthMessage({ type: 'refresh:unavailable' })
        return result
      })
      .finally(() => {
        refreshInFlight.current = null
      })
    return refreshInFlight.current
  }, [performRefresh, waitForPeerRefresh])

  const loadMe = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const res = await apiClient.get<CurrentUser>('/auth/me')
      applyUser(res.data)
      return res.data
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        throw err
      }
      setAnonymous()
      return null
    }
  }, [applyUser, setAnonymous])

  const gateFromUser = (me: CurrentUser | null): SessionGate =>
    me?.mustChangePassword ? 'mustChangePassword' : 'session'

  const requirePasswordChange = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'authenticated' || prev === 'mustChangePassword') {
        return 'mustChangePassword'
      }
      return prev
    })
    void navigate('/change-password')
  }, [navigate])

  const handleSessionLost = useCallback(() => {
    setAnonymous()
    clearCsrfToken()
    void bootstrapCsrf().catch(() => undefined)
    void navigate('/login')
  }, [navigate, setAnonymous])

  const initialize = useCallback(async () => {
    try {
      await bootstrapCsrf()
    } catch {
      setAnonymous()
      setInitialized(true)
      return
    }
    try {
      await loadMe()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        setStatus('anonymous')
      } else {
        setAnonymous()
      }
    } finally {
      setInitialized(true)
    }
  }, [loadMe, setAnonymous])

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      await ensureCsrf()
      const res = await apiClient.post<{ mfaRequired?: boolean } | null>(
        '/auth/login',
        { email, password },
        { validateStatus: (s) => s === 204 || s === 200 },
      )
      if (res.status === 204) {
        setMfaPending(false)
        const me = await loadMe()
        publishAuthMessage({ type: 'session' })
        return gateFromUser(me)
      }
      if (res.status === 200 && res.data?.mfaRequired) {
        setMfaPending(true)
        setStatus('mfaChallenge')
        setUser(null)
        permissions.clear()
        return 'mfaRequired'
      }
      throw { status: res.status, detail: 'Request failed', errorCode: 'UNAUTHORIZED' }
    },
    [ensureCsrf, loadMe, permissions],
  )

  const verifyMfa = useCallback(
    async (code: string): Promise<SessionGate> => {
      await ensureCsrf()
      await apiClient.post('/auth/mfa/verify', { code }, { validateStatus: (s) => s === 204 })
      setMfaPending(false)
      const me = await loadMe()
      publishAuthMessage({ type: 'session' })
      return gateFromUser(me)
    },
    [ensureCsrf, loadMe],
  )

  const recoverMfa = useCallback(
    async (code: string): Promise<SessionGate> => {
      await ensureCsrf()
      await apiClient.post('/auth/mfa/recover', { code }, { validateStatus: (s) => s === 204 })
      setMfaPending(false)
      const me = await loadMe()
      publishAuthMessage({ type: 'session' })
      return gateFromUser(me)
    },
    [ensureCsrf, loadMe],
  )

  const forgotPassword = useCallback(
    async (email: string) => {
      await ensureCsrf()
      await apiClient.post('/auth/forgot-password', { email }, { validateStatus: (s) => s === 204 })
    },
    [ensureCsrf],
  )

  const resetPassword = useCallback(
    async (token: string, password: string) => {
      await ensureCsrf()
      await apiClient.post(
        '/auth/reset-password',
        { token, password },
        { validateStatus: (s) => s === 204 },
      )
    },
    [ensureCsrf],
  )

  const verifyEmail = useCallback(
    async (token: string) => {
      await ensureCsrf()
      await apiClient.post('/auth/verify-email', { token }, { validateStatus: (s) => s === 204 })
    },
    [ensureCsrf],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await ensureCsrf()
      await apiClient.post(
        '/me/password',
        { currentPassword, newPassword },
        { validateStatus: (s) => s === 204 },
      )
      clearCsrfToken()
      setAnonymous()
      publishAuthMessage({ type: 'logout' })
      await bootstrapCsrf().catch(() => undefined)
    },
    [ensureCsrf, setAnonymous],
  )

  const beginEmailChange = useCallback(
    async (newEmail: string) => {
      await ensureCsrf()
      await apiClient.post('/me/email-change', { newEmail }, { validateStatus: (s) => s === 204 })
    },
    [ensureCsrf],
  )

  const logout = useCallback(async () => {
    try {
      await ensureCsrf()
      await apiClient.post('/auth/logout', null, { validateStatus: (s) => s === 204 })
    } catch {
      /* always clear local state */
    }
    clearCsrfToken()
    setAnonymous()
    publishAuthMessage({ type: 'logout' })
    await bootstrapCsrf().catch(() => undefined)
    await navigate('/login')
  }, [ensureCsrf, navigate, setAnonymous])

  const logoutAll = useCallback(async () => {
    try {
      await ensureCsrf()
      await apiClient.post('/auth/logout-all', null, { validateStatus: (s) => s === 204 })
    } catch {
      /* clear locally even if call fails */
    }
    clearCsrfToken()
    setAnonymous()
    publishAuthMessage({ type: 'logout' })
    await bootstrapCsrf().catch(() => undefined)
    await navigate('/login')
  }, [ensureCsrf, navigate, setAnonymous])

  // Wire axios interceptors ↔ auth
  useEffect(() => {
    bindAuthBridge({
      refreshSession,
      requirePasswordChange,
      handleSessionLost,
      getStatus: () => statusRef.current,
    })
  }, [refreshSession, requirePasswordChange, handleSessionLost])

  // Cross-tab coordination
  useEffect(() => {
    return subscribeAuthMessages((msg) => {
      switch (msg.type) {
        case 'refresh:start':
          if (!refreshInFlight.current) peerRefreshActive.current = true
          break
        case 'refresh:done':
          peerRefreshActive.current = false
          peerRefreshWaiters.current.splice(0).forEach((w) => w(true))
          break
        case 'refresh:failed':
          peerRefreshActive.current = false
          peerRefreshWaiters.current.splice(0).forEach((w) => w(false))
          break
        case 'refresh:unavailable':
          peerRefreshActive.current = false
          peerRefreshWaiters.current.splice(0).forEach((w) => w('unavailable'))
          break
        case 'logout':
          peerRefreshActive.current = false
          peerRefreshWaiters.current.splice(0).forEach((w) => w(false))
          handleSessionLost()
          break
        case 'session':
          void loadMe().catch(() => undefined)
          break
        default:
          break
      }
    })
  }, [handleSessionLost, loadMe])

  // Boot once on mount — do not re-run when permission context identity changes.
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    void initialize()
    // intentionally omit initialize: remount-only boot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayName = useMemo(() => {
    if (!user) return ''
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    return name || user.email
  }, [user])

  const isAuthenticated = status === 'authenticated' || status === 'mustChangePassword'

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      mfaPending,
      initialized,
      isAuthenticated,
      displayName,
      initialize,
      login,
      verifyMfa,
      recoverMfa,
      forgotPassword,
      resetPassword,
      verifyEmail,
      changePassword,
      beginEmailChange,
      logout,
      logoutAll,
      refreshSession,
      requirePasswordChange,
      handleSessionLost,
      problemMessage,
    }),
    [
      user,
      status,
      mfaPending,
      initialized,
      isAuthenticated,
      displayName,
      initialize,
      login,
      verifyMfa,
      recoverMfa,
      forgotPassword,
      resetPassword,
      verifyEmail,
      changePassword,
      beginEmailChange,
      logout,
      logoutAll,
      refreshSession,
      requirePasswordChange,
      handleSessionLost,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
