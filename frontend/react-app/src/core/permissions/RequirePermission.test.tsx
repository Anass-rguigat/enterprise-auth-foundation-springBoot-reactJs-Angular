import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { RequirePermission } from './RequirePermission'

const permsState = {
  permissions: [] as string[],
  loaded: true,
  setPermissions: vi.fn(),
  clear: vi.fn(),
  has: (code: string) => permsState.permissions.includes(code),
  hasAny: (required?: readonly string[]) =>
    !required?.length || required.some((c) => permsState.permissions.includes(c)),
  hasAll: (required?: readonly string[]) =>
    !required?.length || required.every((c) => permsState.permissions.includes(c)),
}

vi.mock('./PermissionContext', () => ({
  usePermissions: () => permsState,
}))

function renderGate(initial: string, any?: readonly string[]) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequirePermission any={any} />}>
          <Route path="/roles" element={<div>roles-ok</div>} />
        </Route>
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  it('renders outlet when permission is present', () => {
    permsState.loaded = true
    permsState.permissions = ['ROLE_READ']
    renderGate('/roles', ['ROLE_READ'])
    expect(screen.getByText('roles-ok')).toBeInTheDocument()
  })

  it('shows no-access when permission is missing', () => {
    permsState.loaded = true
    permsState.permissions = ['USER_READ']
    renderGate('/roles', ['ROLE_READ'])
    expect(screen.getByText('No access')).toBeInTheDocument()
    expect(screen.queryByText('roles-ok')).not.toBeInTheDocument()
  })

  it('waits while permissions are loading', () => {
    permsState.loaded = false
    permsState.permissions = []
    renderGate('/roles', ['ROLE_READ'])
    expect(screen.getByText('Checking access…')).toBeInTheDocument()
  })
})
