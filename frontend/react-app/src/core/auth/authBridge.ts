import type { AuthStatus, RefreshResult } from './auth.models'

/**
 * Mutable bridge so axios interceptors can call AuthProvider logic
 * without a circular import at module load time.
 */
type AuthBridge = {
  refreshSession: () => Promise<RefreshResult>
  requirePasswordChange: () => void
  handleSessionLost: () => void
  getStatus: () => AuthStatus
}

const noopBridge: AuthBridge = {
  refreshSession: async () => false,
  requirePasswordChange: () => undefined,
  handleSessionLost: () => undefined,
  getStatus: () => 'anonymous',
}

let bridge: AuthBridge = noopBridge

export function bindAuthBridge(next: AuthBridge): void {
  bridge = next
}

export function getAuthBridge(): AuthBridge {
  return bridge
}
