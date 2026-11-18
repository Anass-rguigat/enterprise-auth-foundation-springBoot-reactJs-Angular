import { Link, Outlet } from 'react-router-dom'
import { useTheme } from '../core/theme/ThemeProvider'
import { Button } from '../shared/ui'
import './layout.css'

export function AuthShellLayout() {
  const theme = useTheme()

  return (
    <div className="auth-shell">
      <header className="auth-shell__bar">
        <Link to="/dashboard" className="auth-shell__brand">
          Enterprise Auth
        </Link>
        <Button variant="ghost" type="button" onClick={theme.toggle}>
          {theme.mode === 'dark' ? 'Light' : 'Dark'} theme
        </Button>
      </header>
      <main className="auth-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
