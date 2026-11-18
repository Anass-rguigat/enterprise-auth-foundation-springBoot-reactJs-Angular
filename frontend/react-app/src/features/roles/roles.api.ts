import { apiClient } from '../../core/auth/apiClient'
import type { Role } from '../../core/api/page.types'

export const rolesApi = {
  list() {
    return apiClient.get<Role[]>('/admin/roles').then((r) => r.data)
  },

  get(roleCode: string) {
    return apiClient
      .get<Role>(`/admin/roles/${encodeURIComponent(roleCode)}`)
      .then((r) => r.data)
  },

  create(body: {
    code: string
    name: string
    description?: string
    permissionCodes?: string[]
  }) {
    return apiClient.post<Role>('/admin/roles', body).then((r) => r.data)
  },

  update(roleCode: string, body: { name?: string; description?: string | null }) {
    return apiClient
      .patch<Role>(`/admin/roles/${encodeURIComponent(roleCode)}`, body)
      .then((r) => r.data)
  },

  delete(roleCode: string) {
    return apiClient
      .delete(`/admin/roles/${encodeURIComponent(roleCode)}`)
      .then(() => undefined)
  },

  attachPermission(roleCode: string, permissionCode: string) {
    return apiClient
      .post(`/admin/roles/${encodeURIComponent(roleCode)}/permissions`, { permissionCode })
      .then(() => undefined)
  },

  detachPermission(roleCode: string, permissionCode: string) {
    return apiClient
      .delete(
        `/admin/roles/${encodeURIComponent(roleCode)}/permissions/${encodeURIComponent(permissionCode)}`,
      )
      .then(() => undefined)
  },
}
