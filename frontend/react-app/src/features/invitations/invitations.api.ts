import { apiClient } from '../../core/auth/apiClient'

export const invitationsApi = {
  accept(token: string, password: string) {
    return apiClient.post('/invitations/accept', { token, password }).then(() => undefined)
  },
}
