import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { Role } from '../../core/api/page.types'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Table,
} from '../../shared/ui'
import { rolesApi } from './roles.api'
import '../feature-pages.css'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M13 6.5 17.5 11" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

const TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'custom', label: 'Custom' },
  { value: 'system', label: 'System' },
]

export function RolesListPage() {
  const auth = useAuth()
  const perms = usePermissions()

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQ(q), 250)
    return () => window.clearTimeout(handle)
  }, [q])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRoles(await rolesApi.list())
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load roles'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return roles.filter((r) => {
      if (typeFilter === 'system' && !r.systemRole) return false
      if (typeFilter === 'custom' && r.systemRole) return false
      if (!needle) return true
      return (
        r.code.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        (r.description || '').toLowerCase().includes(needle)
      )
    })
  }, [roles, debouncedQ, typeFilter])

  return (
    <div className="admin-page">
      <PageHeader
        title="Roles"
        subtitle="Group permissions into roles. Changes apply immediately to role holders."
      >
        {perms.has('ROLE_CREATE') ? (
          <Link to="/roles/new">
            <Button type="button">Create role</Button>
          </Link>
        ) : null}
      </PageHeader>

      <section className="admin-card">
        <div className="admin-card__head">
          <p className="admin-card__eyebrow">Authorization</p>
          <h2 className="admin-card__title">Role catalog</h2>
          <p className="admin-card__desc">
            Results update as you type. View details or open the edit form from Actions.
          </p>
        </div>
        <div className="admin-card__body">
          <div className="fp-filters">
            <Field label="Search" htmlFor="roles-q">
              <Input
                id="roles-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Code, name, or description"
              />
            </Field>
            <Field label="Type" htmlFor="roles-type">
              <Select
                id="roles-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={TYPE_OPTIONS}
              />
            </Field>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="Failed to load roles" message={error}>
              <Button variant="secondary" type="button" onClick={() => void reload()}>
                Retry
              </Button>
            </ErrorState>
          ) : !filtered.length ? (
            <EmptyState title="No roles found" message="Try a different search or create a role." />
          ) : (
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Permissions</th>
                    <th>Users</th>
                    <th className="admin-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.code}>
                      <td>
                        <code>{r.code}</code>
                      </td>
                      <td>{r.name}</td>
                      <td>
                        <span className={`admin-status${r.systemRole ? ' admin-status--warn' : ''}`}>
                          {r.systemRole ? 'System' : 'Custom'}
                        </span>
                      </td>
                      <td>{r.permissionCodes.length}</td>
                      <td>{r.assignedUserCount}</td>
                      <td>
                        <div className="admin-actions">
                          <Link
                            className="admin-action"
                            to={`/roles/${encodeURIComponent(r.code)}`}
                            title="View details"
                            aria-label={`View ${r.code}`}
                          >
                            <EyeIcon />
                          </Link>
                          {perms.has('ROLE_UPDATE') || perms.has('ROLE_ASSIGN_PERMISSION') ? (
                            <Link
                              className="admin-action"
                              to={`/roles/${encodeURIComponent(r.code)}/edit`}
                              title="Edit role"
                              aria-label={`Edit ${r.code}`}
                            >
                              <EditIcon />
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Table>
          )}
        </div>
      </section>
    </div>
  )
}
