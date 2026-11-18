import { apiClient } from '../../core/auth/apiClient'
import type { DemoNote } from '../../core/api/page.types'

export const notesApi = {
  list() {
    return apiClient.get<DemoNote[]>('/demo/notes').then((r) => r.data)
  },

  create(title: string, body: string) {
    return apiClient.post<DemoNote>('/demo/notes', { title, body }).then((r) => r.data)
  },

  update(id: string, title: string, body: string) {
    return apiClient.put<DemoNote>(`/demo/notes/${id}`, { title, body }).then((r) => r.data)
  },

  delete(id: string) {
    return apiClient.delete(`/demo/notes/${id}`).then(() => undefined)
  },
}
