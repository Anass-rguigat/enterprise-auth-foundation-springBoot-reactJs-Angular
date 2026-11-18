import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import type { AuditEventType, AuditLog } from '../../core/api/page.types'
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
import { auditApi } from './audit.api'
import '../feature-pages.css'

const PAGE_SIZE = 50

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function outcomeClass(outcome: string): string {
  const upper = (outcome || '').toUpperCase()
  if (upper === 'SUCCESS' || upper === 'OK') return 'admin-status admin-status--ok'
  if (upper === 'FAILURE' || upper === 'DENIED' || upper === 'ERROR') {
    return 'admin-status admin-status--danger'
  }
  return 'admin-status admin-status--warn'
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

export function AuditPage() {
  const auth = useAuth()
  const [eventTypes, setEventTypes] = useState<AuditEventType[]>([])
  const [eventType, setEventType] = useState('')
  const [actor, setActor] = useState('')
  const [debouncedActor, setDebouncedActor] = useState('')
  const [rows, setRows] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  useEffect(() => {
    void auditApi
      .eventTypes()
      .then(setEventTypes)
      .catch(() => setEventTypes([]))
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedActor(actor)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [actor])

  useEffect(() => {
    setPage(0)
  }, [eventType])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await auditApi.search({
        eventType: eventType || undefined,
        actor: debouncedActor.trim() || undefined,
        page,
        size: PAGE_SIZE,
      })
      setRows(result.content)
      setTotalPages(Math.max(result.totalPages, 1))
      setTotalElements(result.totalElements)
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load activity'))
    } finally {
      setLoading(false)
    }
  }, [auth, debouncedActor, eventType, page])

  useEffect(() => {
    void reload()
  }, [reload])

  const eventOptions = [
    { value: '', label: 'All activities' },
    ...eventTypes.map((t) => ({ value: t.code, label: `${t.title} (${t.category})` })),
  ]

  return (
    <div className="admin-page">
      <PageHeader
        title="Activity log"
        subtitle="Plain-language record of sign-ins, account changes, and security actions."
      />

      <section className="admin-card">
        <div className="admin-card__head">
          <p className="admin-card__eyebrow">Security</p>
          <h2 className="admin-card__title">What happened</h2>
          <p className="admin-card__desc">
            Filter by activity or person. Open an event to see who did what, and from where.
          </p>
        </div>
        <div className="admin-card__body">
          <div className="fp-filters">
            <Field label="Activity" htmlFor="audit-event">
              <Select
                id="audit-event"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                options={eventOptions}
              />
            </Field>
            <Field label="Person (name or email)" htmlFor="audit-actor">
              <Input
                id="audit-actor"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Who performed the action"
              />
            </Field>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="Could not load activity" message={error}>
              <Button variant="secondary" type="button" onClick={() => void reload()}>
                Retry
              </Button>
            </ErrorState>
          ) : !rows.length ? (
            <EmptyState title="No matching activity" />
          ) : (
            <>
              <Table>
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>What happened</th>
                      <th>Result</th>
                      <th>Who</th>
                      <th>Affected user</th>
                      <th>Where</th>
                      <th className="admin-actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.createdAt)}</td>
                        <td>
                          <strong>{row.actionTitle || row.eventType}</strong>
                          <div className="fp-muted" style={{ fontSize: '0.75rem' }}>
                            {row.category}
                          </div>
                        </td>
                        <td>
                          <span className={outcomeClass(row.outcome)}>
                            {row.outcomeLabel || row.outcome}
                          </span>
                        </td>
                        <td>{row.actorDisplayName || row.actorEmail || '—'}</td>
                        <td>{row.targetDisplayName || row.targetEmail || '—'}</td>
                        <td>{row.locationSummary || row.country || '—'}</td>
                        <td>
                          <div className="admin-actions">
                            <Link
                              className="admin-action"
                              to={`/audit/${row.id}`}
                              title="View details"
                              aria-label="View details"
                            >
                              <EyeIcon />
                            </Link>
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
