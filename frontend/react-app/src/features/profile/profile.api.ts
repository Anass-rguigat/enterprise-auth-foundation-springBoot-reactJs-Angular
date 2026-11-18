import { apiClient } from '../../core/auth/apiClient'
import type { UserProfile } from '../../core/api/page.types'

export type ProfileUpdateBody = Partial<
  Pick<
    UserProfile,
    | 'firstName'
    | 'lastName'
    | 'phone'
    | 'preferredLanguage'
    | 'timezone'
    | 'jobTitle'
    | 'department'
    | 'organization'
    | 'city'
    | 'country'
    | 'bio'
  >
>

export const profileApi = {
  getMine() {
    return apiClient.get<UserProfile>('/me/profile').then((r) => r.data)
  },

  updateMine(body: ProfileUpdateBody) {
    return apiClient.patch<UserProfile>('/me/profile', body).then((r) => r.data)
  },
}
