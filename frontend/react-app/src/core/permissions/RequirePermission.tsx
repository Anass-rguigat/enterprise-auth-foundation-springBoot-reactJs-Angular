import { Outlet } from 'react-router-dom'
import { LoadingState } from '../../shared/ui'
import { NoAccessPage } from '../../features/access/NoAccessPage'
import { usePermissions } from './PermissionContext'

type Props = {
  /** User needs at least one of these codes. Empty / omitted = allow. */
  any?: readonly string[]
  /** User needs every listed code. */
  all?: readonly string[]
}

/**
 * Route gate for shell pages. Keeps the URL and shows No access when denied.
 * Backend @PreAuthorize remains authoritative for API calls.
 */
export function RequirePermission({ any: anyOf, all }: Props) {
  const perms = usePermissions()

  if (!perms.loaded) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <LoadingState label="Checking access…" />
      </div>
    )
  }

  const allowed = all?.length ? perms.hasAll(all) : perms.hasAny(anyOf)
  if (!allowed) {
    return <NoAccessPage />
  }

  return <Outlet />
}
