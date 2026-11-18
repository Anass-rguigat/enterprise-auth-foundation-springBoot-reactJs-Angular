import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { apiPath, sampleUser } from '../../testing/auth-fixtures'
import { PermissionProvider, usePermissions } from '../permissions/PermissionContext'
import { AuthProvider, useAuth } from './AuthContext'
import { apiClient } from './apiClient'
import { clearCsrfToken, getCsrfToken } from './csrf'

function Probe() {
  const auth = useAuth()
  const perms = usePermissions()
  return (
    <div>
      <div data-testid="status">{auth.status}</div>
      <div data-testid="initialized">{String(auth.initialized)}</div>
      <div data-testid="email">{auth.user?.email ?? ''}</div>
      <div data-testid="mfa">{String(auth.mfaPending)}</div>
      <div data-testid="perm-user">{String(perms.has('USER_READ'))}</div>
      <div data-testid="perm-audit">{String(perms.has('AUDIT_READ'))}</div>
      <div data-testid="perm-loaded">{String(perms.loaded)}</div>
      <button type="button" onClick={() => void auth.login('admin@example.com', 'secret')}>
        login
      </button>
      <button type="button" onClick={() => void auth.verifyMfa('123456')}>
        verify-mfa
      </button>
      <button
        type="button"
        onClick={() => {
          void Promise.all([auth.refreshSession(), auth.refreshSession()]).then((results) => {
            ;(window as unknown as { __refreshResults?: unknown }).__refreshResults = results
          })
        }}
      >
        refresh-twice
      </button>
      <button type="button" onClick={() => void auth.logout()}>
        logout
      </button>
      <button
        type="button"
        onClick={() => {
          void auth.refreshSession().then((r) => {
            ;(window as unknown as { __refreshResult?: unknown }).__refreshResult = r
          })
        }}
      >
        refresh-once
      </button>
    </div>
  )
}

function renderAuth(ui?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <PermissionProvider>
        <AuthProvider>{ui ?? <Probe />}</AuthProvider>
      </PermissionProvider>
    </MemoryRouter>,
  )
}

async function waitBoot() {
  await waitFor(() => {
    expect(screen.getByTestId('initialized').textContent).toBe('true')
  })
}

describe('AuthContext', () => {
  let apiMock: MockAdapter
  let axiosMock: MockAdapter

  beforeEach(() => {
    clearCsrfToken()
    apiMock = new MockAdapter(apiClient)
    axiosMock = new MockAdapter(axios)
    axiosMock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'csrf-token' })
    // Boot /me 401 must not hang on an unmocked refresh from the interceptor.
    apiMock.onPost('/auth/refresh').reply(401)
    apiMock.onGet('/auth/me').reply(401)
  })

  afterEach(() => {
    apiMock.restore()
    axiosMock.restore()
    delete (window as unknown as { __refreshResults?: unknown }).__refreshResults
    delete (window as unknown as { __refreshResult?: unknown }).__refreshResult
  })

  it('logs in without MFA and loads /me permissions', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock
      .onGet('/auth/me')
      .reply(200, sampleUser({ permissions: ['USER_READ', 'ROLE_READ'] }))

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
      expect(screen.getByTestId('email').textContent).toBe('admin@example.com')
      expect(screen.getByTestId('perm-user').textContent).toBe('true')
      expect(screen.getByTestId('perm-audit').textContent).toBe('false')
    })
  })

  it('enters MFA challenge on login 200 mfaRequired', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(200, { mfaRequired: true })

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('mfaChallenge')
      expect(screen.getByTestId('mfa').textContent).toBe('true')
      expect(screen.getByTestId('email').textContent).toBe('')
    })
  })

  it('verifies MFA then loads /me', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/mfa/verify').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser({ mfaEnabled: true }))

    await act(async () => {
      screen.getByText('verify-mfa').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
      expect(screen.getByTestId('mfa').textContent).toBe('false')
    })
  })

  it('applies mustChangePassword from /me', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser({ mustChangePassword: true }))

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('mustChangePassword')
    })
  })

  it('single-flights concurrent refreshSession calls', async () => {
    renderAuth()
    await waitBoot()

    let refreshHits = 0
    apiMock.onPost('/auth/refresh').reply(() => {
      refreshHits += 1
      return [204]
    })

    await act(async () => {
      screen.getByText('refresh-twice').click()
    })

    await waitFor(() => {
      expect((window as unknown as { __refreshResults?: unknown[] }).__refreshResults).toEqual([
        true,
        true,
      ])
    })
    expect(refreshHits).toBe(1)
  })

  it('returns unavailable on refresh 503 without clearing session', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser())

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
    })

    apiMock.onPost('/auth/refresh').reply(503, { errorCode: 'SERVICE_UNAVAILABLE' })

    await act(async () => {
      screen.getByText('refresh-once').click()
    })

    await waitFor(() => {
      expect((window as unknown as { __refreshResult?: unknown }).__refreshResult).toBe(
        'unavailable',
      )
    })
    expect(screen.getByTestId('status').textContent).toBe('authenticated')
    expect(screen.getByTestId('email').textContent).toBe('admin@example.com')
  })

  it('logout clears user and permissions', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser())

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
    })

    apiMock.onPost('/auth/logout').reply(204)
    axiosMock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'new-csrf' })

    await act(async () => {
      screen.getByText('logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('anonymous')
      expect(screen.getByTestId('email').textContent).toBe('')
      expect(screen.getByTestId('perm-loaded').textContent).toBe('false')
    })
  })

  it('clears local session when peer broadcasts logout', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser())

    await act(async () => {
      screen.getByText('login').click()
    })
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated')
    })

    axiosMock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'peer-logout-csrf' })
    const peer = new BroadcastChannel('enterprise-auth')
    peer.postMessage({ type: 'logout' })

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('anonymous')
      expect(screen.getByTestId('email').textContent).toBe('')
    })
    peer.close()
  })

  it('keeps CSRF token in memory after login (not a JWT store)', async () => {
    renderAuth()
    await waitBoot()

    apiMock.onPost('/auth/login').reply(204)
    apiMock.onGet('/auth/me').reply(200, sampleUser())

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('email').textContent).toBe('admin@example.com')
    })
    expect(getCsrfToken()).toBe('csrf-token')
  })
})
