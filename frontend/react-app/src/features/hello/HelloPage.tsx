import { useCallback, useEffect, useState } from 'react'
import { apiBaseUrl } from '../../core/config'
import { Button, ErrorState, LoadingState, PageHeader } from '../../shared/ui'
import './HelloPage.css'

type MetaInfo = {
  application: string
  status: string
  phase: string
}

export function HelloPage() {
  const [meta, setMeta] = useState<MetaInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`${apiBaseUrl}/api/v1/meta/info`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as MetaInfo
      })
      .then((body) => {
        setMeta(body)
        setLoading(false)
      })
      .catch(() => {
        setError(
          `Could not reach ${apiBaseUrl}/api/v1/meta/info. Start the backend, then refresh.`,
        )
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <>
      <PageHeader
        title="API status"
        subtitle="Live check against GET /api/v1/meta/info (Phase marker)."
      >
        <Button variant="secondary" type="button" onClick={reload}>
          Refresh
        </Button>
      </PageHeader>

      {loading ? <LoadingState label="Contacting backend…" /> : null}
      {error ? (
        <ErrorState title="Backend unreachable" message={error}>
          <Button variant="secondary" type="button" onClick={reload}>
            Retry
          </Button>
        </ErrorState>
      ) : null}
      {meta && !loading && !error ? (
        <dl className="meta">
          <div>
            <dt>Application</dt>
            <dd>{meta.application}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{meta.status}</dd>
          </div>
          <div>
            <dt>Phase</dt>
            <dd>{meta.phase}</dd>
          </div>
          <div>
            <dt>API base</dt>
            <dd>{apiBaseUrl}</dd>
          </div>
        </dl>
      ) : null}
    </>
  )
}
