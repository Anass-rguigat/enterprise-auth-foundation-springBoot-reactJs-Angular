import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV_GROUPS, SHELL_NAV } from '../core/nav/nav.config'
import { usePermissions } from '../core/permissions/PermissionContext'

type Props = {
  onNavigate?: () => void
}

const ICONS: Record<string, ReactNode> = {
  '/dashboard': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  '/profile': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 19c1.5-3.2 4-4.8 7-4.8s5.5 1.6 7 4.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  '/users': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c1.2-2.8 3.2-4.2 5.5-4.2S13.3 16.2 14.5 19" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 19c.6-1.7 1.7-2.8 3.2-3.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  '/roles': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  '/permissions': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 6.5v5.2c0 4.1 2.8 7.8 7 8.8 4.2-1 7-4.7 7-8.8V6.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  '/audit': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h9a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9h6M10 12h6M10 15h4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
}

export function Sidebar({ onNavigate }: Props) {
  const permissions = usePermissions()

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden />
        <div>
          <p className="sidebar__product">Enterprise Auth</p>
          <p className="sidebar__edition">Control plane</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => {
          const items = SHELL_NAV.filter(
            (item) => item.group === group.id && permissions.hasAny(item.permissions),
          )
          if (!items.length) return null
          return (
            <div key={group.id} className="sidebar__section">
              <p className="sidebar__group">{group.label}</p>
              <ul className="sidebar__list">
                {items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                      }
                      onClick={onNavigate}
                    >
                      <span className="sidebar__icon">{ICONS[item.path] ?? null}</span>
                      <span className="sidebar__label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
