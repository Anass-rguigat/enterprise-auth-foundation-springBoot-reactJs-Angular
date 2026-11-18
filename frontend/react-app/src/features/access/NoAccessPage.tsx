import { Link } from 'react-router-dom'
import { Button, EmptyState, PageHeader } from '../../shared/ui'

/** Shown when the signed-in user lacks permission for the current route. */
export function NoAccessPage() {
  return (
    <>
      <PageHeader title="No access" subtitle="This page is not available for your role." />
      <EmptyState
        title="Permission required"
        message="Your account does not include the permission needed to open this page. Ask an administrator if you need access."
      >
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </EmptyState>
    </>
  )
}
