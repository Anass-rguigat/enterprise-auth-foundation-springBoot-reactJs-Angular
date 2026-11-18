import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './layout.css'

export function ShellLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()
  const fullWidth = ['/profile', '/users', '/roles', '/permissions', '/audit'].some((p) =>
    location.pathname.startsWith(p),
  )

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className={`shell${navOpen ? ' shell--nav-open' : ''}`}>
      <div className="shell__sidebar">
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </div>
      {navOpen ? (
        <button
          type="button"
          className="shell__scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <div className="shell__main">
        <Topbar onMenuToggle={() => setNavOpen((v) => !v)} />
        <main className={`shell__content${fullWidth ? ' shell__content--full' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
