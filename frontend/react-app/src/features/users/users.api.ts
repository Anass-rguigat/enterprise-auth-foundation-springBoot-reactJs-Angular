import { apiClient } from '../../core/auth/apiClient'
import type { AdminUser, SpringPage } from '../../core/api/page.types'

export type CreateUserPayload = {
  email: string
  firstName: string
  lastName: string
  phone?: string
  preferredLanguage?: string
  timezone?: string
  jobTitle?: string
  department?: string
  organization?: string
  city?: string
  country?: string
  bio?: string
  roleCodes?: string[]
}

export type UpdateUserPayload = {
  firstName?: string
  lastName?: string
  phone?: string
  preferredLanguage?: string
  timezone?: string
  jobTitle?: string
  department?: string
  organization?: string
  city?: string
  country?: string
  bio?: string
}

export const usersApi = {
  list(opts: { q?: string; status?: string; page?: number; size?: number } = {}) {
    return apiClient
      .get<SpringPage<AdminUser>>('/admin/users', {
        params: {
          page: opts.page ?? 0,
          size: opts.size ?? 20,
          ...(opts.q ? { q: opts.q } : {}),
          ...(opts.status ? { status: opts.status } : {}),
        },
      })
      .then((r) => r.data)
  },

  get(userId: string) {
    return apiClient.get<AdminUser>(`/admin/users/${userId}`).then((r) => r.data)
  },

  create(body: CreateUserPayload) {
    return apiClient.post<AdminUser>('/admin/users', body).then((r) => r.data)
  },

  update(userId: string, body: UpdateUserPayload) {
    return apiClient.patch<AdminUser>(`/admin/users/${userId}`, body).then((r) => r.data)
  },

  /** Enable login (ACTIVE). */
  activate(userId: string) {
    return apiClient.post(`/admin/users/${userId}/activate`).then(() => undefined)
  },

  suspend(userId: string) {
    return apiClient.post(`/admin/users/${userId}/suspend`).then(() => undefined)
  },

  /** Disable login and revoke sessions. */
  disable(userId: string) {
    return apiClient.post(`/admin/users/${userId}/disable`).then(() => undefined)
  },

  forcePasswordReset(userId: string) {
    return apiClient.post(`/admin/users/${userId}/force-password-reset`).then(() => undefined)
  },

  revokeSessions(userId: string) {
    return apiClient.post(`/admin/users/${userId}/revoke-sessions`).then(() => undefined)
  },

  sendInvitation(userId: string) {
    return apiClient.post(`/admin/users/${userId}/invitations`).then(() => undefined)
  },

  assignRole(userId: string, roleCode: string) {
    return apiClient.post(`/admin/users/${userId}/roles`, { roleCode }).then(() => undefined)
  },

  removeRole(userId: string, roleCode: string) {
    return apiClient
      .delete(`/admin/users/${userId}/roles/${encodeURIComponent(roleCode)}`)
      .then(() => undefined)
  },

  grantSuperAdmin(userId: string, password: string) {
    return apiClient
      .post(`/admin/users/${userId}/grant-super-admin`, { password })
      .then(() => undefined)
  },

  resetMfa(userId: string) {
    return apiClient.post(`/admin/users/${userId}/mfa/reset`).then(() => undefined)
  },
}
