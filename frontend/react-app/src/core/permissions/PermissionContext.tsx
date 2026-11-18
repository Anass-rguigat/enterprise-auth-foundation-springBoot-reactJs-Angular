import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * UI permission gate for nav + routes. Backend @PreAuthorize remains authoritative.
 * Before /me load, has/hasAny return true so shell can paint during boot.
 */
type PermissionContextValue = {
  permissions: readonly string[]
  loaded: boolean
  setPermissions: (codes: readonly string[]) => void
  clear: () => void
  has: (code: string) => boolean
  hasAny: (required?: readonly string[]) => boolean
  hasAll: (required?: readonly string[]) => boolean
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissionsState] = useState<readonly string[]>([])
  const [loaded, setLoaded] = useState(false)

  const setPermissions = useCallback((codes: readonly string[]) => {
    setPermissionsState([...codes])
    setLoaded(true)
  }, [])

  const clear = useCallback(() => {
    setPermissionsState([])
    setLoaded(false)
  }, [])

  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  const has = useCallback(
    (code: string) => {
      if (!loaded) return true
      return permissionSet.has(code)
    },
    [loaded, permissionSet],
  )

  const hasAny = useCallback(
    (required?: readonly string[]) => {
      if (!required?.length) return true
      if (!loaded) return true
      return required.some((code) => permissionSet.has(code))
    },
    [loaded, permissionSet],
  )

  const hasAll = useCallback(
    (required?: readonly string[]) => {
      if (!required?.length) return true
      if (!loaded) return true
      return required.every((code) => permissionSet.has(code))
    },
    [loaded, permissionSet],
  )

  const value = useMemo(
    () => ({ permissions, loaded, setPermissions, clear, has, hasAny, hasAll }),
    [permissions, loaded, setPermissions, clear, has, hasAny, hasAll],
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext)
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionProvider')
  }
  return ctx
}
