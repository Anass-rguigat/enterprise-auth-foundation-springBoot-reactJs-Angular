import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingState } from '../../shared/ui'

/** Wait for CSRF + /me boot before routing decisions. */
export function AuthBootGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  if (!auth.initialized) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <LoadingState label="Starting session…" />
      </div>
    )
  }
  return children
}

/** Public auth pages — bounce signed-in users. */
export function AnonymousRoute() {
  const auth = useAuth()
  if (auth.status === 'mustChangePassword') {
    return <Navigate to="/change-password" replace />
  }
  if (auth.status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }
  if (auth.status === 'mfaChallenge') {
    return <Navigate to="/mfa" replace />
  }
  return <Outlet />
}

/** MFA challenge only while pending. */
export function MfaChallengeRoute() {
  const auth = useAuth()
  if (auth.mfaPending || auth.status === 'mfaChallenge') {
    return <Outlet />
  }
  if (auth.status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }
  if (auth.status === 'mustChangePassword') {
    return <Navigate to="/change-password" replace />
  }
  return <Navigate to="/login" replace />
}

/** Shell routes — authenticated and not gated to password change. */
export function ProtectedRoute() {
  const auth = useAuth()
  if (auth.status === 'mustChangePassword') {
    return <Navigate to="/change-password" replace />
  }
  if (auth.status === 'authenticated') {
    return <Outlet />
  }
  if (auth.status === 'mfaChallenge') {
    return <Navigate to="/mfa" replace />
  }
  return <Navigate to="/login" replace />
}

/** Change password — signed-in or must-change gate. */
export function ChangePasswordRoute() {
  const auth = useAuth()
  if (auth.status === 'authenticated' || auth.status === 'mustChangePassword') {
    return <Outlet />
  }
  return <Navigate to="/login" replace />
}
