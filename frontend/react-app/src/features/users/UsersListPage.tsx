import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { AdminUser } from '../../core/api/page.types'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Pagination,
  Select,
  Table,
} from '../../shared/ui'
import { usersApi } from './users.api'
import '../feature-pages.css'
import './users.css'

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_ACTIVATION', label: 'Pending activation' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
]

const PAGE_SIZE = 20

function loginLabel(u: AdminUser): string {
  return u.status === 'ACTIVE' && u.emailVerified ? 'Enabled' : 'Disabled'
}

function statusClass(status: string): string {
  if (status === 'ACTIVE') return 'admin-status admin-status--ok'
  if (status === 'PENDING_ACTIVATION') return 'admin-status admin-status--warn'
  if (status === 'DISABLED' || status === 'SUSPENDED') return 'admin-status admin-status--danger'
  return 'admin-status'
}

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

export function UsersListPage() {
  const auth = useAuth()
  const perms = usePermissions()

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ(q)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [q])

  useEffect(() => {
    setPage(0)
  }, [status])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await usersApi.list({
        q: debouncedQ.trim() || undefined,
        status: status || undefined,
        page,
        size: PAGE_SIZE,
      })
      setUsers(result.content)
      setTotalPages(Math.max(result.totalPages, 1))
      setTotalElements(result.totalElements)
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }, [auth, debouncedQ, page, status])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="admin-page">
      <PageHeader title="Users" subtitle="Invite people, control login access, and manage roles.">
        {perms.has('USER_CREATE') ? (
          <Link to="/users/new">
            <Button type="button">Create user</Button>
          </Link>
        ) : null}
      </PageHeader>

      <section className="admin-card">
        <div className="admin-card__head">
          <p className="admin-card__eyebrow">Directory</p>
          <h2 className="admin-card__title">All users</h2>
          <p className="admin-card__desc">
            Results update as you type or change status. View details or open the edit form from
            Actions.
          </p>
        </div>
        <div className="admin-card__body">
          <div className="fp-filters">
            <Field label="Search" htmlFor="users-q">
              <Input
                id="users-q"
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Email or name"
              />
            </Field>
            <Field label="Status" htmlFor="users-status">
              <Select
                id="users-status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={STATUS_OPTIONS}
              />
            </Field>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="Failed to load users" message={error}>
              <Button variant="secondary" type="button" onClick={() => void reload()}>
                Retry
              </Button>
            </ErrorState>
          ) : !users.length ? (
            <EmptyState title="No users found" message="Try a different search or create a user." />
          ) : (
            <>
              <Table>
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Verified</th>
                      <th>Login</th>
                      <th>Roles</th>
                      <th className="users-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td>
                          {u.firstName} {u.lastName}
                        </td>
                        <td>
                          <span className={statusClass(u.status)}>
                            {u.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{u.emailVerified ? 'Yes' : 'No'}</td>
                        <td>{loginLabel(u)}</td>
                        <td>{u.roles.join(', ') || '—'}</td>
                        <td>
                          <div className="users-actions">
                            <Link
                              className="users-action"
                              to={`/users/${u.id}`}
                              title="View details"
                              aria-label={`View ${u.email}`}
                            >
                              <EyeIcon />
                            </Link>
                            {perms.has('USER_UPDATE') ? (
                              <Link
                                className="users-action"
                                to={`/users/${u.id}/edit`}
                                title="Edit user"
                                aria-label={`Edit ${u.email}`}
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
              <Pagination
                page={page + 1}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={PAGE_SIZE}
                onPageChange={(oneBased) => setPage(oneBased - 1)}
              />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
