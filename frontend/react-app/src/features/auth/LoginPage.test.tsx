import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const login = vi.fn()
const problemMessage = vi.fn((_err: unknown, fallback?: string) => fallback ?? 'error')
const navigate = vi.fn()

vi.mock('../../core/auth/AuthContext', () => ({
  useAuth: () => ({
    login,
    problemMessage,
    status: 'anonymous',
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    problemMessage.mockClear()
    navigate.mockReset()
  })

  it('validates required fields before calling auth', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(login).not.toHaveBeenCalled()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('navigates to dashboard after successful session login', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue('session')
    renderLogin()

    await user.type(screen.getByLabelText(/^email$/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin@example.com', 'secret')
      expect(navigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('navigates to MFA challenge when required', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue('mfaRequired')
    renderLogin()

    await user.type(screen.getByLabelText(/^email$/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/mfa')
    })
  })

  it('shows generic failure message on login error', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new Error('nope'))
    problemMessage.mockReturnValue('Invalid email or password')
    renderLogin()

    await user.type(screen.getByLabelText(/^email$/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'bad')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })
})
