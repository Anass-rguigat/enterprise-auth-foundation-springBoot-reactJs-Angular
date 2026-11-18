import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import { usePermissions } from '../../core/permissions/PermissionContext'
import type { CatalogPermission, Role } from '../../core/api/page.types'
import {
  Button,
  Checkbox,
  Dialog,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  useToast,
} from '../../shared/ui'
import { permissionsApi } from '../permissions/permissions.api'
import { rolesApi } from './roles.api'
import '../feature-pages.css'

export function RoleEditPage() {
  const { roleCode: rawCode = '' } = useParams()
  const roleCode = decodeURIComponent(rawCode)
  const auth = useAuth()
  const perms = usePermissions()
  const toast = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  const [catalog, setCatalog] = useState<CatalogPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [permFilter, setPermFilter] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await rolesApi.get(roleCode)
      setRole(r)
      setName(r.name)
      setDescription(r.description ?? '')
      setSelected(new Set(r.permissionCodes))
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

  const modules = useMemo(() => {
    const needle = permFilter.trim().toLowerCase()
    const groups = new Map<string, CatalogPermission[]>()
    for (const p of catalog) {
      if (
        needle &&
        !p.code.toLowerCase().includes(needle) &&
        !(p.description || '').toLowerCase().includes(needle) &&
        !p.module.toLowerCase().includes(needle)
      ) {
        continue
      }
      const list = groups.get(p.module) ?? []
      list.push(p)
      groups.set(p.module, list)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [catalog, permFilter])

  function toggle(codeValue: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(codeValue)) next.delete(codeValue)
      else next.add(codeValue)
      return next
    })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!role) return
    setSaving(true)
    setFormError('')
    try {
      if (perms.has('ROLE_UPDATE') && !role.systemRole) {
        await rolesApi.update(roleCode, { name, description })
      }

      if (perms.has('ROLE_ASSIGN_PERMISSION') && !role.systemRole) {
        const current = new Set(role.permissionCodes)
        for (const code of selected) {
          if (!current.has(code)) await rolesApi.attachPermission(roleCode, code)
        }
        for (const code of current) {
          if (!selected.has(code)) await rolesApi.detachPermission(roleCode, code)
        }
      }

      toast.success('Role updated')
      await reload()
      void navigate(`/roles/${encodeURIComponent(roleCode)}`)
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Could not save role'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRole() {
    setBusy(true)
    try {
      await rolesApi.delete(roleCode)
      toast.success('Role deleted')
      await navigate('/roles')
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Delete failed — role may still be assigned to users'))
      setDeleteOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const metaDisabled = !!role?.systemRole || !perms.has('ROLE_UPDATE')
  const permsDisabled = !!role?.systemRole || !perms.has('ROLE_ASSIGN_PERMISSION')

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to={`/roles/${encodeURIComponent(roleCode)}`}>
          ← Back to details
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
          <PageHeader title={`Edit ${role.name}`} subtitle={role.code}>
            {perms.has('ROLE_DELETE') && !role.systemRole ? (
              <Button variant="danger" type="button" onClick={() => setDeleteOpen(true)}>
                Delete role
              </Button>
            ) : null}
          </PageHeader>

          {role.systemRole ? (
            <section className="admin-card">
              <div className="admin-card__body">
                <p className="fp-muted" style={{ margin: 0 }}>
                  System roles are immutable. You can review permissions but cannot change them here.
                </p>
              </div>
            </section>
          ) : null}

          <form onSubmit={save} noValidate>
            <section className="admin-card">
              <div className="admin-card__head">
                <p className="admin-card__eyebrow">Role</p>
                <h2 className="admin-card__title">Basics</h2>
                <p className="admin-card__desc">Update the display name and description.</p>
              </div>
              <div className="admin-card__body">
                <div className="admin-grid">
                  <Field label="Code" htmlFor="re-code">
                    <Input id="re-code" value={role.code} disabled readOnly />
                  </Field>
                  <Field label="Name" htmlFor="re-name">
                    <Input
                      id="re-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={metaDisabled}
                      required
                    />
                  </Field>
                  <div className="admin-grid--full">
                    <Field label="Description" htmlFor="re-desc">
                      <Input
                        id="re-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={metaDisabled}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-card__head">
                <p className="admin-card__eyebrow">Authorization</p>
                <h2 className="admin-card__title">Permissions</h2>
                <p className="admin-card__desc">
                  {selected.size} selected. Tick boxes to grant access; holders update on the next
                  request.
                </p>
              </div>
              <div className="admin-card__body">
                <Field label="Filter permissions" htmlFor="re-perm-q">
                  <Input
                    id="re-perm-q"
                    value={permFilter}
                    onChange={(e) => setPermFilter(e.target.value)}
                    placeholder="Search code, module, or description"
                  />
                </Field>
                <div className="admin-perm-modules">
                  {modules.map(([module, items]) => (
                    <div key={module} className="admin-perm-module">
                      <div className="admin-perm-module__head">{module}</div>
                      <div className="admin-perm-module__body">
                        {items.map((p) => (
                          <div key={p.code} className="admin-perm-chip">
                            <Checkbox
                              id={`re-${p.code}`}
                              checked={selected.has(p.code)}
                              disabled={permsDisabled}
                              onChange={() => toggle(p.code)}
                            >
                              <strong>{p.code}</strong>
                              <span>{p.description || 'No description'}</span>
                            </Checkbox>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {formError ? (
                  <p className="fp-err" role="alert">
                    {formError}
                  </p>
                ) : null}
                <div className="fp-row">
                  {!role.systemRole ? (
                    <Button type="submit" loading={saving}>
                      Save changes
                    </Button>
                  ) : null}
                  <Link to={`/roles/${encodeURIComponent(roleCode)}`}>
                    <Button variant="secondary" type="button">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </form>
        </>
      ) : null}

      <Dialog
        open={deleteOpen}
        title="Delete role?"
        confirmLabel="Delete"
        danger
        confirmLoading={busy}
        onConfirm={() => void deleteRole()}
        onCancel={() => setDeleteOpen(false)}
      >
        This fails if any users still have the role. System roles cannot be deleted.
      </Dialog>
    </div>
  )
}
