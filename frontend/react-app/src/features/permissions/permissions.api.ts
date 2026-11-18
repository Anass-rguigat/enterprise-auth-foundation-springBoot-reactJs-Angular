import { apiClient } from '../../core/auth/apiClient'
import type { CatalogPermission } from '../../core/api/page.types'

export const permissionsApi = {
  list() {
    return apiClient.get<CatalogPermission[]>('/admin/permissions').then((r) => r.data)
  },
}
