export type AuthStatus =
  | 'unknown'
  | 'anonymous'
  | 'mfaChallenge'
  | 'authenticated'
  | 'mustChangePassword'

export type CurrentUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string
  emailVerified: boolean
  mustChangePassword: boolean
  mfaEnabled: boolean
  roles: string[]
  permissions: string[]
  tokenVersion: number
  authzVersion: number
}

export type ApiProblem = {
  title?: string
  detail?: string
  status?: number
  errorCode?: string
  fields?: Record<string, string | string[]>
  correlationId?: string
}

export type LoginOutcome = 'session' | 'mfaRequired' | 'mustChangePassword'

/** Post MFA / session establishment routing hint. */
export type SessionGate = 'session' | 'mustChangePassword'

export type RefreshResult = true | false | 'unavailable'

export type AuthBroadcastMessage =
  | { type: 'refresh:start' }
  | { type: 'refresh:done' }
  | { type: 'refresh:failed' }
  | { type: 'refresh:unavailable' }
  | { type: 'logout' }
  | { type: 'session' }
