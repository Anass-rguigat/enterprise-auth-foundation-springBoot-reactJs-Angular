import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import type { CatalogPermission } from '../../core/api/page.types'
import {
  Button,
  Checkbox,
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

function slugRoleCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!slug) return ''
  return /^[A-Z]/.test(slug) ? slug.slice(0, 64) : `R_${slug}`.slice(0, 64)
}

export function RoleCreatePage() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [catalog, setCatalog] = useState<CatalogPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [codeTouched, setCodeTouched] = useState(false)
  const [permFilter, setPermFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    void permissionsApi
      .list()
      .then(setCatalog)
      .catch((err) => setLoadError(auth.problemMessage(err, 'Failed to load permissions')))
      .finally(() => setLoading(false))
  }, [auth])

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

  function onNameChange(value: string) {
    setName(value)
    if (!codeTouched) setCode(slugRoleCode(value))
  }

  function toggle(codeValue: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(codeValue)) next.delete(codeValue)
      else next.add(codeValue)
      return next
    })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!code.trim() || !name.trim()) {
      setFormError('Code and name are required')
      return
    }
    setSaving(true)
    try {
      const created = await rolesApi.create({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        permissionCodes: [...selected],
      })
      toast.success('Role created')
      void navigate(`/roles/${encodeURIComponent(created.code)}`)
    } catch (err) {
      setFormError(auth.problemMessage(err, 'Create failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to="/roles">
          ← Roles
        </Link>
      </p>
      <PageHeader
        title="Create role"
        subtitle="Name the role, then tick the permissions it should grant."
      />

      {loading ? <LoadingState /> : null}
      {loadError ? <ErrorState title="Could not load permissions" message={loadError} /> : null}

      <form onSubmit={submit} noValidate>
        <section className="admin-card">
          <div className="admin-card__head">
            <p className="admin-card__eyebrow">Role</p>
            <h2 className="admin-card__title">Basics</h2>
            <p className="admin-card__desc">Code is derived from the name; you can override it.</p>
          </div>
          <div className="admin-card__body">
            <div className="admin-grid">
              <Field label="Name" htmlFor="rc-name">
                <Input id="rc-name" value={name} onChange={(e) => onNameChange(e.target.value)} required />
              </Field>
              <Field label="Code" htmlFor="rc-code" hint="[A-Z][A-Z0-9_]{1,63}">
                <Input
                  id="rc-code"
                  value={code}
                  onChange={(e) => {
                    setCodeTouched(true)
                    setCode(e.target.value.toUpperCase())
                  }}
                  required
                />
              </Field>
              <div className="admin-grid--full">
                <Field label="Description" htmlFor="rc-desc">
                  <Input
                    id="rc-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
              {selected.size} selected. Grouped by module for easier scanning.
            </p>
          </div>
          <div className="admin-card__body">
            <Field label="Filter permissions" htmlFor="rc-perm-q">
              <Input
                id="rc-perm-q"
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
                          id={`rc-${p.code}`}
                          checked={selected.has(p.code)}
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
              <Button type="submit" loading={saving}>
                Create role
              </Button>
              <Link to="/roles">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </form>
    </div>
  )
}
