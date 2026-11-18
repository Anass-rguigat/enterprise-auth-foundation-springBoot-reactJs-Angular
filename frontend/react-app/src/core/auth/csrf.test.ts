import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiPath } from '../../testing/auth-fixtures'
import {
  bootstrapCsrf,
  clearCsrfToken,
  getCsrfToken,
  requireCsrfToken,
} from './csrf'

describe('csrf memory bootstrap', () => {
  let mock: MockAdapter

  beforeEach(() => {
    clearCsrfToken()
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.restore()
    clearCsrfToken()
  })

  it('bootstraps token into memory only', async () => {
    mock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'csrf-memory-token' })

    await expect(bootstrapCsrf()).resolves.toBe('csrf-memory-token')
    expect(getCsrfToken()).toBe('csrf-memory-token')
    expect(requireCsrfToken()).toBe('csrf-memory-token')
  })

  it('clears memory token', async () => {
    mock.onGet(apiPath('/auth/csrf')).reply(200, { token: 'x' })
    await bootstrapCsrf()

    clearCsrfToken()
    expect(getCsrfToken()).toBeNull()
    expect(() => requireCsrfToken()).toThrow(/not bootstrapped/)
  })

  it('rejects empty CSRF body', async () => {
    mock.onGet(apiPath('/auth/csrf')).reply(200, {})
    await expect(bootstrapCsrf()).rejects.toThrow(/empty token/)
  })
})
