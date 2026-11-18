import { apiClient } from '../../core/auth/apiClient'
import type { MfaEnrollmentStart, MfaStatus } from '../../core/api/page.types'

export const mfaApi = {
  status() {
    return apiClient.get<MfaStatus>('/me/mfa').then((r) => r.data)
  },

  enroll() {
    return apiClient.post<MfaEnrollmentStart>('/me/mfa/enroll').then((r) => r.data)
  },

  cancelEnroll() {
    return apiClient.delete('/me/mfa/enroll').then(() => undefined)
  },

  confirm(code: string) {
    return apiClient
      .post<{ recoveryCodes: string[] }>('/me/mfa/confirm', { code })
      .then((r) => r.data)
  },

  regenerateRecovery(password: string, code: string) {
    return apiClient
      .post<{ recoveryCodes: string[] }>('/me/mfa/recovery-codes/regenerate', {
        password,
        code,
      })
      .then((r) => r.data)
  },

  disable(password: string, code: string) {
    return apiClient.delete('/me/mfa', { data: { password, code } }).then(() => undefined)
  },
}
