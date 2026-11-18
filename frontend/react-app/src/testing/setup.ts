import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { clearCsrfToken } from '../core/auth/csrf'
import { bindAuthBridge } from '../core/auth/authBridge'

// Enable React 19 act() warnings / flushing under Vitest + jsdom.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  clearCsrfToken()
  bindAuthBridge({
    refreshSession: async () => false,
    requirePasswordChange: () => undefined,
    handleSessionLost: () => undefined,
    getStatus: () => 'anonymous',
  })
})
