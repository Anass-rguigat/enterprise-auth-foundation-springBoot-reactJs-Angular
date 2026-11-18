import { apiClient } from '../../core/auth/apiClient'
import type { SecurityOverview, SessionSummary } from '../../core/api/page.types'

export const securityApi = {
  overview() {
    return apiClient.get<SecurityOverview>('/me/security').then((r) => r.data)
  },

  sessions() {
    return apiClient.get<SessionSummary[]>('/me/security/sessions').then((r) => r.data)
  },

  revokeSession(familyId: string) {
    return apiClient
      .delete(`/me/security/sessions/${encodeURIComponent(familyId)}`)
      .then(() => undefined)
  },
}
