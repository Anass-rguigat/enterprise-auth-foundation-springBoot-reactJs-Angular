import { Link, useLocation } from 'react-router-dom'
import { Button, EmptyState, PageHeader } from '../../shared/ui'

export type FeaturePlaceholderData = {
  title: string
  subtitle?: string
  phase?: number
  apiHints?: string[]
}

const PLACEHOLDERS: Record<string, FeaturePlaceholderData> = {
  '/login': {
    title: 'Sign in',
    subtitle: 'Credentialed login against POST /auth/login.',
    phase: 24,
    apiHints: ['GET /auth/csrf', 'POST /auth/login', 'GET /auth/me'],
  },
  '/mfa': {
    title: 'MFA challenge',
    subtitle: 'TOTP or recovery after login returns mfaRequired.',
    phase: 24,
    apiHints: ['POST /auth/mfa/verify', 'POST /auth/mfa/recover'],
  },
  '/forgot-password': {
    title: 'Forgot password',
    phase: 24,
    apiHints: ['POST /auth/forgot-password'],
  },
  '/reset-password': {
    title: 'Reset password',
    phase: 24,
    apiHints: ['POST /auth/reset-password'],
  },
  '/change-password': {
    title: 'Change password',
    subtitle: 'Also used for must-change-password gate.',
    phase: 24,
    apiHints: ['POST /me/password', '403 PASSWORD_CHANGE_REQUIRED'],
  },
  '/verify-email': {
    title: 'Verify email',
    phase: 24,
    apiHints: ['POST /auth/verify-email'],
  },
  '/invite/accept': {
    title: 'Accept invitation',
    phase: 25,
    apiHints: ['POST /invitations/accept'],
  },
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Overview shell composed from authenticated session context.',
    phase: 25,
    apiHints: ['GET /auth/me'],
  },
  '/profile': {
    title: 'Profile',
    subtitle: 'Self-service profile — any signed-in user (not PROFILE_UPDATE).',
    phase: 25,
    apiHints: ['GET /me/profile', 'PATCH /me/profile'],
  },
  '/settings/email': {
    title: 'Change email',
    phase: 24,
    apiHints: ['POST /me/email-change'],
  },
  '/settings/mfa': {
    title: 'MFA settings',
    subtitle: 'Self-service MFA — any signed-in user (not MFA_MANAGE).',
    phase: 25,
    apiHints: ['POST /me/mfa/enroll', 'POST /me/mfa/confirm', 'DELETE /me/mfa'],
  },
  '/security': {
    title: 'Security',
    subtitle: 'Sessions and security overview for the current user.',
    phase: 25,
    apiHints: ['GET /me/security/sessions', 'DELETE /me/security/sessions/{id}'],
  },
  '/users': {
    title: 'Users',
    phase: 25,
    apiHints: ['GET /admin/users', 'POST /admin/users/invitations'],
  },
  '/roles': {
    title: 'Roles',
    phase: 25,
    apiHints: ['GET /admin/roles', 'POST /admin/roles'],
  },
  '/permissions': {
    title: 'Permission catalog',
    phase: 25,
    apiHints: ['GET /admin/permissions (PERMISSION_READ)'],
  },
  '/audit': {
    title: 'Audit logs',
    phase: 25,
    apiHints: ['GET /admin/audit-logs (AUDIT_READ)'],
  },
  '/notes': {
    title: 'Demo notes',
    phase: 25,
    apiHints: ['GET/POST/PATCH/DELETE /demo/notes (NOTE_*)'],
  },
}

function resolveData(pathname: string): FeaturePlaceholderData {
  if (PLACEHOLDERS[pathname]) return PLACEHOLDERS[pathname]
  if (pathname.startsWith('/users/')) {
    return {
      title: 'User detail',
      phase: 25,
      apiHints: ['GET /admin/users/{id}', 'POST /admin/users/{id}/roles'],
    }
  }
  if (pathname.startsWith('/roles/')) {
    return {
      title: 'Role detail',
      phase: 25,
      apiHints: [
        'GET /admin/roles/{roleCode}',
        'POST /admin/roles/{roleCode}/permissions',
      ],
    }
  }
  return { title: 'Feature', phase: 24 }
}

export function FeaturePlaceholderPage() {
  const { pathname } = useLocation()
  const data = resolveData(pathname)

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle={data.subtitle || `Placeholder for Phase ${data.phase ?? '24+'} feature work.`}
      />
      <EmptyState
        title="Route scaffold ready"
        message={`Implemented in Phase ${data.phase ?? '24+'}. This page is a Phase 23 placeholder for functional equivalence coverage.`}
      >
        <Link to="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </EmptyState>
      {data.apiHints?.length ? (
        <section
          style={{
            marginTop: 'var(--space-6)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <h2 style={{ margin: '0 0 var(--space-3)', font: '600 0.9rem/1.3 var(--font-sans)' }}>
            Planned API surface
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {data.apiHints.map((hint) => (
              <li key={hint}>
                <code style={{ color: 'var(--color-text)', fontSize: '0.8rem' }}>{hint}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
