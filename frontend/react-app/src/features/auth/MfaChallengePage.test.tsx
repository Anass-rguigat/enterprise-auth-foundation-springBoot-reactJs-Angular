import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MfaChallengePage } from './MfaChallengePage'

const verifyMfa = vi.fn()
const recoverMfa = vi.fn()
const problemMessage = vi.fn((_err: unknown, fallback?: string) => fallback ?? 'error')
const navigate = vi.fn()

vi.mock('../../core/auth/AuthContext', () => ({
  useAuth: () => ({
    verifyMfa,
    recoverMfa,
    problemMessage,
    status: 'mfaChallenge',
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

function renderMfa() {
  return render(
    <MemoryRouter initialEntries={['/mfa']}>
      <Routes>
        <Route path="/mfa" element={<MfaChallengePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MfaChallengePage', () => {
  beforeEach(() => {
    verifyMfa.mockReset()
    recoverMfa.mockReset()
    problemMessage.mockClear()
    navigate.mockReset()
  })

  it('requires a code before verify', async () => {
    const user = userEvent.setup()
    renderMfa()

    await user.click(screen.getByRole('button', { name: /^verify$/i }))

    expect(verifyMfa).not.toHaveBeenCalled()
    expect(screen.getByText('Code is required')).toBeInTheDocument()
  })

  it('verifies TOTP and navigates to dashboard', async () => {
    const user = userEvent.setup()
    verifyMfa.mockResolvedValue('session')
    renderMfa()

    await user.type(screen.getByLabelText(/authenticator code/i), '123456')
    await user.click(screen.getByRole('button', { name: /^verify$/i }))

    await waitFor(() => {
      expect(verifyMfa).toHaveBeenCalledWith('123456')
      expect(navigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('uses recovery code path', async () => {
    const user = userEvent.setup()
    recoverMfa.mockResolvedValue('session')
    renderMfa()

    await user.type(screen.getByLabelText(/authenticator code/i), 'ABCD-EFGH')
    await user.click(screen.getByRole('button', { name: /use recovery code/i }))

    await waitFor(() => {
      expect(recoverMfa).toHaveBeenCalledWith('ABCD-EFGH')
      expect(navigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
