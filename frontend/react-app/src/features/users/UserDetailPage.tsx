import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { AdminUser } from '../../core/api/page.types'
import { Button, ErrorState, LoadingState } from '../../shared/ui'
import { usersApi } from './users.api'
import '../feature-pages.css'
import './users.css'

function initials(user: AdminUser): string {
  const a = (user.firstName || '').trim()
  const b = (user.lastName || '').trim()
  if (a && b) return (a[0] + b[0]).toUpperCase()
  return (user.email || '?').slice(0, 2).toUpperCase()
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function UserDetailPage() {
  const { userId = '' } = useParams()
  const auth = useAuth()
  const perms = usePermissions()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loginEnabled = !!user && user.status === 'ACTIVE' && user.emailVerified

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUser(await usersApi.get(userId))
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load user'))
    } finally {
      setLoading(false)
    }
  }, [auth, userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to="/users">
          ← Users
        </Link>
      </p>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="User not available" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : user ? (
        <>
          <section className="admin-card">
            <div className="admin-card__body">
              <div className="users-hero">
                <div className="users-hero__main">
                  <div className="users-avatar" aria-hidden>
                    {initials(user)}
                  </div>
                  <div>
                    <h1 className="users-hero__email">
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                    </h1>
                    <p className="users-hero__meta">{user.email}</p>
                    <div className="users-hero__badges">
                      <span
                        className={`admin-status${loginEnabled ? ' admin-status--ok' : ' admin-status--danger'}`}
                      >
                        {loginEnabled ? 'Can sign in' : 'Cannot sign in'}
                      </span>
                      <span className="admin-status">{user.status.replace(/_/g, ' ')}</span>
                      <span
                        className={`admin-status${user.emailVerified ? ' admin-status--ok' : ' admin-status--warn'}`}
                      >
                        {user.emailVerified ? 'Email verified' : 'Email not verified'}
                      </span>
                    </div>
                  </div>
                </div>
                {perms.has('USER_UPDATE') ? (
                  <Link to={`/users/${user.id}/edit`}>
                    <Button type="button">Edit user</Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Overview</p>
              <h2 className="admin-card__title">Account information</h2>
              <p className="admin-card__desc">Read-only snapshot. Use Edit to change profile or access.</p>
            </div>
            <div className="admin-card__body">
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Pending email</dt>
                  <dd>{user.pendingEmail || '—'}</dd>
                </div>
                <div>
                  <dt>First name</dt>
                  <dd>{user.firstName || '—'}</dd>
                </div>
                <div>
                  <dt>Last name</dt>
                  <dd>{user.lastName || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{user.phone || '—'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{user.status.replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt>Login</dt>
                  <dd>{loginEnabled ? 'Enabled' : 'Disabled'}</dd>
                </div>
                <div>
                  <dt>Must change password</dt>
                  <dd>{user.mustChangePassword ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(user.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Authorization</p>
              <h2 className="admin-card__title">Roles</h2>
            </div>
            <div className="admin-card__body">
              {user.roles.length ? (
                <ul className="users-role-list">
                  {user.roles.map((role) => (
                    <li key={role}>{role}</li>
                  ))}
                </ul>
              ) : (
                <p className="fp-muted">No roles assigned</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
