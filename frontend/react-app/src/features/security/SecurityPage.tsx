import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../core/auth/AuthContext'
import type { SecurityOverview, SessionSummary } from '../../core/api/page.types'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Table,
  useToast,
} from '../../shared/ui'
import { securityApi } from './security.api'
import '../feature-pages.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function SecurityPage() {
  const auth = useAuth()
  const toast = useToast()
  const [overview, setOverview] = useState<SecurityOverview | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, s] = await Promise.all([securityApi.overview(), securityApi.sessions()])
      setOverview(o)
      setSessions(s)
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load security data'))
    } finally {
      setLoading(false)
    }
  }, [auth])

  useEffect(() => {
    void reload()
  }, [reload])

  async function revoke(familyId: string) {
    setBusyId(familyId)
    try {
      await securityApi.revokeSession(familyId)
      toast.success('Session revoked')
      await reload()
    } catch (err) {
      toast.danger(auth.problemMessage(err, 'Could not revoke session'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Security"
        subtitle="Self-service sessions and security overview — any signed-in user."
      >
        <Button variant="secondary" type="button" onClick={() => void reload()}>
          Refresh
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Failed to load security data" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : (
        <>
          {overview ? (
            <section className="fp-panel">
              <h2>Overview</h2>
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>Email verified</dt>
                  <dd>{overview.emailVerified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Pending email</dt>
                  <dd>{overview.pendingEmail || '—'}</dd>
                </div>
                <div>
                  <dt>MFA enabled</dt>
                  <dd>{overview.mfaEnabled ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Must change password</dt>
                  <dd>{overview.mustChangePassword ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Active sessions</dt>
                  <dd>{overview.activeSessionCount}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="fp-panel">
            <h2>Sessions</h2>
            {!sessions.length ? (
              <EmptyState title="No active sessions" />
            ) : (
              <Table>
                <table>
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Created</th>
                      <th>Last used</th>
                      <th>Current</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.familyId}>
                        <td>{s.label || s.familyId}</td>
                        <td>{formatDate(s.createdAt)}</td>
                        <td>{formatDate(s.lastUsedAt)}</td>
                        <td>{s.current ? 'Yes' : 'No'}</td>
                        <td>
                          {!s.current ? (
                            <Button
                              variant="danger"
                              type="button"
                              loading={busyId === s.familyId}
                              onClick={() => void revoke(s.familyId)}
                            >
                              Revoke
                            </Button>
                          ) : (
                            <span className="fp-muted">Use Sign out</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Table>
            )}
          </section>
        </>
      )}
    </>
  )
}
