import { apiClient } from '../../core/auth/apiClient'
import type { AuditEventType, AuditLog, SpringPage } from '../../core/api/page.types'

export const auditApi = {
  eventTypes() {
    return apiClient.get<AuditEventType[]>('/admin/audit-logs/event-types').then((r) => r.data)
  },

  search(
    opts: {
      eventType?: string
      actor?: string
      page?: number
      size?: number
    } = {},
  ) {
    return apiClient
      .get<SpringPage<AuditLog>>('/admin/audit-logs', {
        params: {
          page: opts.page ?? 0,
          size: opts.size ?? 50,
          ...(opts.eventType ? { eventType: opts.eventType } : {}),
          ...(opts.actor ? { actor: opts.actor } : {}),
        },
      })
      .then((r) => r.data)
  },

  getById(id: string) {
    return apiClient.get<AuditLog>(`/admin/audit-logs/${id}`).then((r) => r.data)
  },
}
