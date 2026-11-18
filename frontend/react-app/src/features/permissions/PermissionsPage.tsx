import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../core/auth/AuthContext'
import type { CatalogPermission } from '../../core/api/page.types'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Table,
} from '../../shared/ui'
import { permissionsApi } from './permissions.api'
import '../feature-pages.css'

export function PermissionsPage() {
  const auth = useAuth()
  const [items, setItems] = useState<CatalogPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await permissionsApi.list())
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load permissions'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="admin-page">
      <PageHeader
        title="Permissions"
        subtitle="Read-only catalog gated by PERMISSION_READ. Codes are owned by the backend."
      />

      <section className="admin-card">
        <div className="admin-card__head">
          <p className="admin-card__eyebrow">Authorization</p>
          <h2 className="admin-card__title">Permission catalog</h2>
          <p className="admin-card__desc">
            Executable permission codes synced from the server. Use roles to attach these to users.
          </p>
        </div>
        <div className="admin-card__body">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="Failed to load permissions" message={error}>
              <Button variant="secondary" type="button" onClick={() => void reload()}>
                Retry
              </Button>
            </ErrorState>
          ) : !items.length ? (
            <EmptyState title="No permissions in catalog" />
          ) : (
            <Table>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Module</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.code}>
                      <td>
                        <code>{p.code}</code>
                      </td>
                      <td>
                        <span className="admin-status">{p.module}</span>
                      </td>
                      <td>{p.description || '—'}</td>
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
