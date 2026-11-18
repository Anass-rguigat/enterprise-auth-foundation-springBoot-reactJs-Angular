import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import type { AuthStatus } from './auth.models'
import {
  AnonymousRoute,
  ChangePasswordRoute,
  MfaChallengeRoute,
  ProtectedRoute,
} from './RouteGuards'

const authState = {
  status: 'anonymous' as AuthStatus,
  mfaPending: false,
  initialized: true,
  user: null,
  isAuthenticated: false,
  displayName: '',
}

vi.mock('./AuthContext', () => ({
  useAuth: () => authState,
}))

function renderGuards(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<AnonymousRoute />}>
          <Route path="/login" element={<div>login-page</div>} />
        </Route>
        <Route element={<MfaChallengeRoute />}>
          <Route path="/mfa" element={<div>mfa-page</div>} />
        </Route>
        <Route element={<ChangePasswordRoute />}>
          <Route path="/change-password" element={<div>change-password-page</div>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>dashboard-page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteGuards', () => {
  beforeEach(() => {
    authState.status = 'anonymous'
    authState.mfaPending = false
    authState.isAuthenticated = false
  })

  describe('AnonymousRoute', () => {
    it('allows anonymous users', () => {
      renderGuards('/login')
      expect(screen.getByText('login-page')).toBeInTheDocument()
    })

    it('redirects authenticated users to dashboard', () => {
      authState.status = 'authenticated'
      authState.isAuthenticated = true
      renderGuards('/login')
      expect(screen.getByText('dashboard-page')).toBeInTheDocument()
    })

    it('redirects must-change users to change-password', () => {
      authState.status = 'mustChangePassword'
      authState.isAuthenticated = true
      renderGuards('/login')
      expect(screen.getByText('change-password-page')).toBeInTheDocument()
    })

    it('redirects MFA challenge to /mfa', () => {
      authState.status = 'mfaChallenge'
      authState.mfaPending = true
      renderGuards('/login')
      expect(screen.getByText('mfa-page')).toBeInTheDocument()
    })
  })

  describe('ProtectedRoute', () => {
    it('allows authenticated users', () => {
      authState.status = 'authenticated'
      authState.isAuthenticated = true
      renderGuards('/dashboard')
      expect(screen.getByText('dashboard-page')).toBeInTheDocument()
    })

    it('forces password change gate', () => {
      authState.status = 'mustChangePassword'
      authState.isAuthenticated = true
      renderGuards('/dashboard')
      expect(screen.getByText('change-password-page')).toBeInTheDocument()
    })

    it('sends anonymous users to login', () => {
      renderGuards('/dashboard')
      expect(screen.getByText('login-page')).toBeInTheDocument()
    })

    it('sends MFA challenge to /mfa', () => {
      authState.status = 'mfaChallenge'
      authState.mfaPending = true
      renderGuards('/dashboard')
      expect(screen.getByText('mfa-page')).toBeInTheDocument()
    })
  })

  describe('MfaChallengeRoute', () => {
    it('allows pending MFA challenge', () => {
      authState.mfaPending = true
      authState.status = 'mfaChallenge'
      renderGuards('/mfa')
      expect(screen.getByText('mfa-page')).toBeInTheDocument()
    })

    it('blocks when no challenge is active', () => {
      renderGuards('/mfa')
      expect(screen.getByText('login-page')).toBeInTheDocument()
    })
  })

  describe('ChangePasswordRoute', () => {
    it('allows authenticated and must-change users', () => {
      authState.status = 'authenticated'
      authState.isAuthenticated = true
      renderGuards('/change-password')
      expect(screen.getByText('change-password-page')).toBeInTheDocument()
    })

    it('blocks anonymous users', () => {
      renderGuards('/change-password')
      expect(screen.getByText('login-page')).toBeInTheDocument()
    })
  })
})
