import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiPath, sampleUser } from '../../testing/auth-fixtures'
import { apiClient } from './apiClient'
import { bindAuthBridge } from './authBridge'
import { bootstrapCsrf, clearCsrfToken } from './csrf'
import type { AuthStatus, RefreshResult } from './auth.models'

describe('apiClient interceptors', () => {
  let apiMock: MockAdapter
  let axiosMock: MockAdapter

  const refreshSession = vi.fn<() => Promise<RefreshResult>>()
  const requirePasswordChange = vi.fn()
  const handleSessionLost = vi.fn()
  let status: AuthStatus = 'authenticated'

  beforeEach(async () => {
    clearCsrfToken()
    status = 'authenticated'
    refreshSession.mockReset()
    requirePasswordChange.mockReset()
    handleSessionLost.mockReset()

    apiMock = new MockAdapter(apiClient)
    axiosMock = new MockAdapter(axios)

    bindAuthBridge({
      refreshSession,
      requirePasswordChange,
      handleSessionLost,
      getStatus: () => status,
    })

    axiosMock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'mem-csrf' })
    await bootstrapCsrf()
  })

  afterEach(() => {
    apiMock.restore()
    axiosMock.restore()
  })

  it('adds credentials, CSRF header, and correlation id on unsafe API calls', async () => {
    apiMock.onPost('/admin/users').reply((config) => {
      expect(config.withCredentials).toBe(true)
      const headers = config.headers as { get?: (name: string) => unknown } & Record<string, unknown>
      const csrf = headers.get?.('X-XSRF-TOKEN') ?? headers['X-XSRF-TOKEN']
      const correlation = headers.get?.('X-Correlation-Id') ?? headers['X-Correlation-Id']
      expect(csrf).toBe('mem-csrf')
      expect(correlation).toBeTruthy()
      return [200, { id: '1' }]
    })

    await expect(apiClient.post('/admin/users', { email: 'a@b.c' })).resolves.toMatchObject({
      data: { id: '1' },
    })
  })

  it('retries once after successful single-flight refresh on 401', async () => {
    refreshSession.mockResolvedValue(true)
    let hits = 0
    apiMock.onGet('/auth/me').reply(() => {
      hits += 1
      if (hits === 1) {
        return [401, { title: 'Unauthorized' }]
      }
      return [200, sampleUser()]
    })

    const res = await apiClient.get('/auth/me')
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(res.data.email).toBe('admin@example.com')
    expect(handleSessionLost).not.toHaveBeenCalled()
  })

  it('calls handleSessionLost when refresh fails while authenticated', async () => {
    refreshSession.mockResolvedValue(false)
    apiMock.onGet('/demo/notes').reply(401, {})

    await expect(apiClient.get('/demo/notes')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(handleSessionLost).toHaveBeenCalledTimes(1)
  })

  it('does not logout on 503', async () => {
    apiMock.onGet('/auth/me').reply(503, { errorCode: 'SERVICE_UNAVAILABLE' })

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      response: { status: 503 },
    })
    expect(refreshSession).not.toHaveBeenCalled()
    expect(handleSessionLost).not.toHaveBeenCalled()
  })

  it('does not logout when refresh returns unavailable', async () => {
    refreshSession.mockResolvedValue('unavailable')
    apiMock.onGet('/auth/me').reply(401, {})

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(handleSessionLost).not.toHaveBeenCalled()
  })

  it('forces password change on 403 PASSWORD_CHANGE_REQUIRED', async () => {
    apiMock.onGet('/admin/users').reply(403, {
      errorCode: 'PASSWORD_CHANGE_REQUIRED',
      detail: 'Password change required',
    })

    await expect(apiClient.get('/admin/users')).rejects.toMatchObject({
      response: { status: 403 },
    })
    expect(requirePasswordChange).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('skips refresh for login 401', async () => {
    apiMock.onPost('/auth/login').reply(401, {})

    await expect(
      apiClient.post('/auth/login', { email: 'a', password: 'b' }),
    ).rejects.toMatchObject({ response: { status: 401 } })
    expect(refreshSession).not.toHaveBeenCalled()
  })
})
