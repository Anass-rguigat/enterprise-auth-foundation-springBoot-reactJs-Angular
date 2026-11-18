import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PermissionProvider, usePermissions } from './PermissionContext'

function wrapper({ children }: { children: ReactNode }) {
  return <PermissionProvider>{children}</PermissionProvider>
}

describe('PermissionContext', () => {
  it('shows all gates before /me load', () => {
    const { result } = renderHook(() => usePermissions(), { wrapper })
    expect(result.current.loaded).toBe(false)
    expect(result.current.has('USER_READ')).toBe(true)
    expect(result.current.hasAny(['ROLE_READ'])).toBe(true)
  })

  it('enforces advisory gates after permissions are set', () => {
    const { result } = renderHook(() => usePermissions(), { wrapper })
    act(() => {
      result.current.setPermissions(['USER_READ', 'NOTE_READ'])
    })
    expect(result.current.loaded).toBe(true)
    expect(result.current.has('USER_READ')).toBe(true)
    expect(result.current.has('ROLE_READ')).toBe(false)
    expect(result.current.hasAny(['ROLE_READ', 'NOTE_READ'])).toBe(true)
    expect(result.current.hasAll(['USER_READ', 'NOTE_READ'])).toBe(true)
    expect(result.current.hasAll(['USER_READ', 'AUDIT_READ'])).toBe(false)
  })

  it('clears loaded state on logout', () => {
    const { result } = renderHook(() => usePermissions(), { wrapper })
    act(() => {
      result.current.setPermissions(['USER_READ'])
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.loaded).toBe(false)
    expect(result.current.permissions).toEqual([])
  })
})
