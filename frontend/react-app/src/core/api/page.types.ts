export type SpringPage<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first?: boolean
  last?: boolean
}

export type AdminUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  status: string
  emailVerified: boolean
  pendingEmail: string | null
  mustChangePassword: boolean
  tokenVersion: number
  authzVersion: number
  roles: string[]
  permissions: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type Role = {
  code: string
  name: string
  description: string | null
  systemRole: boolean
  createdAt: string
  permissionCodes: string[]
  assignedUserCount: number
}

export type CatalogPermission = {
  code: string
  module: string
  description: string | null
}

export type UserProfile = {
  userId: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  preferredLanguage: string | null
  timezone: string | null
  jobTitle: string | null
  department: string | null
  organization: string | null
  city: string | null
  country: string | null
  bio: string | null
}

export type SecurityOverview = {
  emailVerified: boolean
  pendingEmail: string | null
  mustChangePassword: boolean
  mfaEnabled: boolean
  activeSessionCount: number
}

export type SessionSummary = {
  familyId: string
  createdAt: string
  lastUsedAt: string | null
  label: string | null
  current: boolean
}

export type MfaStatus = {
  enabled: boolean
  enrollmentPending: boolean
  unusedRecoveryCodes: number
}

export type MfaEnrollmentStart = {
  secretBase32: string
  otpauthUri: string
  expiresAt: string
}

export type AuditLog = {
  id: string
  eventType: string
  actionTitle: string
  actionSummary: string
  category: string
  module: string
  outcome: string
  outcomeLabel: string
  actorDisplayName: string | null
  actorEmail: string | null
  targetDisplayName: string | null
  targetEmail: string | null
  clientIp: string | null
  userAgent: string | null
  deviceSummary: string | null
  country: string | null
  city: string | null
  locationSummary: string | null
  macAddress: string | null
  createdAt: string
}

export type AuditEventType = {
  code: string
  title: string
  category: string
}

export type DemoNote = {
  id: string
  ownerUserId: string
  title: string
  body: string | null
  createdAt: string
  updatedAt: string
}
