import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { CatalogPermission, Role } from '../../core/api/page.types'
import { Button, ErrorState, LoadingState } from '../../shared/ui'
import { permissionsApi } from '../permissions/permissions.api'
import { rolesApi } from './roles.api'
import '../feature-pages.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function RoleDetailPage() {
  const { roleCode: rawCode = '' } = useParams()
  const roleCode = decodeURIComponent(rawCode)
  const auth = useAuth()
  const perms = usePermissions()

  const [role, setRole] = useState<Role | null>(null)
  const [catalog, setCatalog] = useState<CatalogPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRole(await rolesApi.get(roleCode))
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load role'))
    } finally {
      setLoading(false)
    }
  }, [auth, roleCode])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!perms.has('PERMISSION_READ')) return
    void permissionsApi
      .list()
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [perms])

  const permissionDetails = useMemo(() => {
    if (!role) return []
    const byCode = new Map(catalog.map((p) => [p.code, p]))
    return role.permissionCodes.map((code) => byCode.get(code) ?? { code, module: '—', description: null })
  }, [role, catalog])

  const canEdit = perms.has('ROLE_UPDATE') || perms.has('ROLE_ASSIGN_PERMISSION')

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to="/roles">
          ← Roles
        </Link>
      </p>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Role not available" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : role ? (
        <>
          <section className="admin-card">
            <div className="admin-card__body">
              <div className="users-hero" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ margin: 0, font: '600 1.25rem/1.25 var(--font-display)' }}>{role.name}</h1>
                  <p className="fp-muted" style={{ margin: '0.35rem 0 0' }}>
                    <code>{role.code}</code>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <span className={`admin-status${role.systemRole ? ' admin-status--warn' : ''}`}>
                      {role.systemRole ? 'System role' : 'Custom role'}
                    </span>
                    <span className="admin-status">{role.permissionCodes.length} permissions</span>
                    <span className="admin-status">{role.assignedUserCount} users</span>
                  </div>
                </div>
                {canEdit ? (
                  <Link to={`/roles/${encodeURIComponent(role.code)}/edit`}>
                    <Button type="button">Edit role</Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Overview</p>
              <h2 className="admin-card__title">Role information</h2>
              <p className="admin-card__desc">Read-only snapshot. Use Edit to change metadata or permissions.</p>
            </div>
            <div className="admin-card__body">
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>Code</dt>
                  <dd>
                    <code>{role.code}</code>
                  </dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>{role.name}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{role.description || '—'}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{role.systemRole ? 'System' : 'Custom'}</dd>
                </div>
                <div>
                  <dt>Assigned users</dt>
                  <dd>{role.assignedUserCount}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(role.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Authorization</p>
              <h2 className="admin-card__title">Permissions</h2>
            </div>
            <div className="admin-card__body">
              {!permissionDetails.length ? (
                <p className="fp-muted">No permissions on this role</p>
              ) : (
                <ul className="users-role-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {permissionDetails.map((p) => (
                    <li
                      key={p.code}
                      style={{
                        padding: '0.35rem 0.65rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '999px',
                        fontSize: '0.8125rem',
                        background: 'var(--color-surface)',
                      }}
                      title={p.description || undefined}
                    >
                      <code>{p.code}</code>
                      {p.module && p.module !== '—' ? (
                        <span className="fp-muted"> · {p.module}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
