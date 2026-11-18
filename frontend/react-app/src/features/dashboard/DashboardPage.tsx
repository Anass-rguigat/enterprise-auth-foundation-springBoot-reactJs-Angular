import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { SecurityOverview } from '../../core/api/page.types'
import { Button, LoadingState, PageHeader } from '../../shared/ui'
import { securityApi } from '../security/security.api'
import '../feature-pages.css'

export function DashboardPage() {
  const auth = useAuth()
  const perms = usePermissions()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<SecurityOverview | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await securityApi.overview()
        if (!cancelled) setOverview(data)
      } catch {
        if (!cancelled) setOverview(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${auth.displayName || 'user'}`} />
      {loading ? (
        <LoadingState />
      ) : (
        <div className="fp-grid">
          <section className="fp-panel">
            <h2>Session</h2>
            {auth.user ? (
              <dl className="fp-dl">
                <div>
                  <dt>Email</dt>
                  <dd>{auth.user.email}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{auth.user.status}</dd>
                </div>
                <div>
                  <dt>MFA</dt>
                  <dd>{auth.user.mfaEnabled ? 'Enabled' : 'Off'}</dd>
                </div>
                <div>
                  <dt>Roles</dt>
                  <dd>{auth.user.roles.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Permissions</dt>
                  <dd>{auth.user.permissions.length}</dd>
                </div>
              </dl>
            ) : null}
            <div className="fp-row">
              <Link to="/profile">
                <Button variant="secondary">Profile</Button>
              </Link>
              <Link to="/security">
                <Button variant="secondary">Security</Button>
              </Link>
              <Link to="/settings/mfa">
                <Button variant="secondary">MFA</Button>
              </Link>
            </div>
          </section>

          <section className="fp-panel">
            <h2>Security overview</h2>
            {overview ? (
              <dl className="fp-dl">
                <div>
                  <dt>Email verified</dt>
                  <dd>{overview.emailVerified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Pending email</dt>
                  <dd>{overview.pendingEmail || '—'}</dd>
                </div>
                <div>
                  <dt>Active sessions</dt>
                  <dd>{overview.activeSessionCount}</dd>
                </div>
                <div>
                  <dt>Must change password</dt>
                  <dd>{overview.mustChangePassword ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            ) : (
              <p className="fp-muted">Could not load security overview.</p>
            )}
          </section>

          {perms.hasAny([
            'USER_READ',
            'ROLE_READ',
            'PERMISSION_READ',
            'AUDIT_READ',
            'NOTE_READ',
          ]) ? (
            <section className="fp-panel">
              <h2>Administration</h2>
              <div className="fp-row">
                {perms.has('USER_READ') ? (
                  <Link to="/users">
                    <Button variant="secondary">Users</Button>
                  </Link>
                ) : null}
                {perms.has('ROLE_READ') ? (
                  <Link to="/roles">
                    <Button variant="secondary">Roles</Button>
                  </Link>
                ) : null}
                {perms.has('PERMISSION_READ') ? (
                  <Link to="/permissions">
                    <Button variant="secondary">Permissions</Button>
                  </Link>
                ) : null}
                {perms.has('AUDIT_READ') ? (
                  <Link to="/audit">
                    <Button variant="secondary">Activity log</Button>
                  </Link>
                ) : null}
                {perms.has('NOTE_READ') ? (
                  <Link to="/notes">
                    <Button variant="secondary">Demo notes</Button>
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  )
}
