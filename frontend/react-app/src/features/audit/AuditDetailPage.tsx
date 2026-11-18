import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../core/auth/AuthContext'
import type { AuditLog } from '../../core/api/page.types'
import { Button, ErrorState, LoadingState } from '../../shared/ui'
import { auditApi } from './audit.api'
import '../feature-pages.css'

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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

export function AuditDetailPage() {
  const { id = '' } = useParams()
  const auth = useAuth()
  const [row, setRow] = useState<AuditLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRow(await auditApi.getById(id))
    } catch (err) {
      setError(auth.problemMessage(err, 'Failed to load activity'))
    } finally {
      setLoading(false)
    }
  }, [auth, id])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <div className="admin-page">
      <p className="fp-back">
        <Link className="fp-link" to="/audit">
          ← Activity log
        </Link>
      </p>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Activity not available" message={error}>
          <Button variant="secondary" type="button" onClick={() => void reload()}>
            Retry
          </Button>
        </ErrorState>
      ) : row ? (
        <>
          <section className="admin-card">
            <div className="admin-card__body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
                <div>
                  <p className="admin-card__eyebrow">{row.category || 'Activity'}</p>
                  <h1 style={{ margin: '0.2rem 0', font: '600 1.35rem/1.25 var(--font-display)' }}>
                    {row.actionTitle || row.eventType}
                  </h1>
                  <p className="fp-muted" style={{ margin: '0.5rem 0 0', maxWidth: '40rem' }}>
                    {row.actionSummary}
                  </p>
                </div>
                <span className={outcomeClass(row.outcome)}>{row.outcomeLabel || row.outcome}</span>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Action</p>
              <h2 className="admin-card__title">What happened</h2>
            </div>
            <div className="admin-card__body">
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>When</dt>
                  <dd>{formatDate(row.createdAt)}</dd>
                </div>
                <div>
                  <dt>Activity</dt>
                  <dd>{row.actionTitle}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{row.category || '—'}</dd>
                </div>
                <div>
                  <dt>Result</dt>
                  <dd>
                    <span className={outcomeClass(row.outcome)}>
                      {row.outcomeLabel || row.outcome}
                    </span>
                  </dd>
                </div>
                <div className="admin-grid--full">
                  <dt>In plain words</dt>
                  <dd>{row.actionSummary}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">People</p>
              <h2 className="admin-card__title">Who was involved</h2>
            </div>
            <div className="admin-card__body">
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>Performed by</dt>
                  <dd>{row.actorDisplayName || 'Unknown / system'}</dd>
                </div>
                <div>
                  <dt>Their email</dt>
                  <dd>{row.actorEmail || '—'}</dd>
                </div>
                <div>
                  <dt>Affected user</dt>
                  <dd>{row.targetDisplayName || '—'}</dd>
                </div>
                <div>
                  <dt>Affected email</dt>
                  <dd>{row.targetEmail || '—'}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <p className="admin-card__eyebrow">Location &amp; device</p>
              <h2 className="admin-card__title">Where it came from</h2>
              <p className="admin-card__desc">
                Network and device details from the request. MAC address is not available for
                browser sessions.
              </p>
            </div>
            <div className="admin-card__body">
              <dl className="fp-dl fp-dl--cols">
                <div>
                  <dt>Country</dt>
                  <dd>{row.country || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>City</dt>
                  <dd>{row.city || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{row.locationSummary || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>IP address</dt>
                  <dd>{row.clientIp || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>MAC address</dt>
                  <dd>{row.macAddress || 'Not available for web sessions'}</dd>
                </div>
                <div>
                  <dt>Device</dt>
                  <dd>{row.deviceSummary || 'Unknown device'}</dd>
                </div>
                <div className="admin-grid--full">
                  <dt>Browser details</dt>
                  <dd style={{ wordBreak: 'break-word' }}>{row.userAgent || 'Not recorded'}</dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
