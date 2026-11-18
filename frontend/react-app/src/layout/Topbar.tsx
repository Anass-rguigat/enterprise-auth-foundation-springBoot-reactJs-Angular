import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../core/auth/AuthContext'
import { useTheme } from '../core/theme/ThemeProvider'
import { Button } from '../shared/ui'

type Props = {
  onMenuToggle: () => void
}

export function Topbar({ onMenuToggle }: Props) {
  const theme = useTheme()
  const auth = useAuth()
  const [busy, setBusy] = useState(false)

  async function onLogout() {
    setBusy(true)
    try {
      await auth.logout()
    } finally {
      setBusy(false)
    }
  }

  const initials = (() => {
    const name = auth.displayName || auth.user?.email || '?'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  })()

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="topbar__menu"
          aria-label="Open navigation"
          onClick={onMenuToggle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <div className="topbar__context">
          <p className="topbar__title">Workspace</p>
          {auth.user ? (
            <p className="topbar__hint">
              {auth.displayName}
              {!auth.user.emailVerified ? (
                <span className="topbar__badge">Email unverified</span>
              ) : null}
            </p>
          ) : (
            <p className="topbar__hint">Session ready</p>
          )}
        </div>
      </div>
      <div className="topbar__actions">
        <Button variant="ghost" type="button" onClick={theme.toggle} aria-label="Toggle theme">
          {theme.mode === 'dark' ? 'Light' : 'Dark'}
        </Button>
        {auth.isAuthenticated ? (
          <>
            <Link to="/profile" className="topbar__user" title="Open profile">
              <span className="topbar__avatar" aria-hidden>
                {initials}
              </span>
              <span className="topbar__user-text">
                <span className="topbar__user-name">{auth.displayName}</span>
                <span className="topbar__user-email">{auth.user?.email}</span>
              </span>
            </Link>
            <Button variant="secondary" type="button" loading={busy} onClick={() => void onLogout()}>
              Sign out
            </Button>
          </>
        ) : (
          <Link to="/login" className="topbar__link">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
