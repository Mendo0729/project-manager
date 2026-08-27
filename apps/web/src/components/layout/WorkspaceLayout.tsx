import { useMemo, useState, type CSSProperties } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../../features/auth/AuthProvider'
import './workspace.css'

function getInitialTheme() {
  if (typeof window === 'undefined') return false

  const stored = window.localStorage.getItem('project-manager-theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function WorkspaceLayout() {
  const { user, logout } = useAuth()
  const [dark, setDark] = useState(getInitialTheme)

  const stars = useMemo(
    () =>
      Array.from({ length: 72 }, (_, index) => ({
        id: index,
        left: `${(index * 37 + 11) % 100}%`,
        top: `${(index * 61 + 7) % 100}%`,
        size: `${0.7 + ((index * 13) % 14) / 10}px`,
        duration: `${2.8 + ((index * 17) % 28) / 10}s`,
        delay: `${((index * 19) % 35) / 10}s`,
        tint: index % 17 === 0 ? 'indigo' : index % 23 === 0 ? 'teal' : 'plain',
      })),
    [],
  )

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    window.localStorage.setItem('project-manager-theme', next ? 'dark' : 'light')
  }

  return (
    <>
      <div className="stars" aria-hidden="true">
        {stars.map((star) => (
          <span
            className={`star${star.tint === 'plain' ? '' : ` tint-${star.tint}`}`}
            key={star.id}
            style={
              {
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                '--star-duration': star.duration,
                '--star-delay': star.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="app-brand">
            <h1>Project Manager</h1>
            <span>planificación · proyectos · tareas</span>
          </div>

          <nav className="app-nav" aria-label="Navegación principal">
            <span className="nav-section-label">Vista</span>
            <NavLink
              className={({ isActive }) => `app-nav-item${isActive ? ' active' : ''}`}
              end
              to="/"
            >
              <span className="nav-tab" />
              Panel general
            </NavLink>
            <NavLink
              className={({ isActive }) => `app-nav-item${isActive ? ' active' : ''}`}
              to="/projects"
            >
              <span className="nav-tab" />
              Proyectos
            </NavLink>
            <span className="app-nav-item disabled">
              <span className="nav-tab" />
              Planificación semanal
            </span>
            <span className="app-nav-item disabled">
              <span className="nav-tab" />
              Tareas de hoy
            </span>

            <span className="nav-section-label account-label">Cuenta</span>
            <span className="app-nav-item disabled">
              <span className="nav-tab" />
              Ajustes
            </span>
          </nav>

          <div className="theme-control">
            <span className="theme-label">
              <span aria-hidden="true">{dark ? '☾' : '☀'}</span>
              Modo oscuro
            </span>
            <button
              aria-label="Alternar modo oscuro"
              aria-pressed={dark}
              className="theme-switch"
              onClick={toggleTheme}
              type="button"
            />
          </div>

          <div className="sidebar-profile">
            <span className="sidebar-avatar">
              {user?.displayName
                ?.split(' ')
                .slice(0, 2)
                .map((part) => part.slice(0, 1).toUpperCase())
                .join('') || 'U'}
            </span>
            <div className="sidebar-profile-copy">
              <strong>{user?.displayName}</strong>
              <span>{user?.timezone}</span>
            </div>
            <button className="sidebar-logout" onClick={() => void logout()} type="button">
              Salir
            </button>
          </div>
        </aside>

        <nav className="mobile-tabbar" aria-label="Navegación móvil">
          <NavLink className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`} end to="/">
            <span className="mobile-dot" />
            Panel
          </NavLink>
          <NavLink className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`} to="/projects">
            <span className="mobile-dot" />
            Proyectos
          </NavLink>
          <span className="mobile-tab disabled">
            <span className="mobile-dot" />
            Semana
          </span>
          <span className="mobile-tab disabled">
            <span className="mobile-dot" />
            Tareas
          </span>
        </nav>

        <main className="app-main">
          <Outlet />
          <footer className="app-footer">
            <span>Project Manager</span>
            <span>PostgreSQL 17 · Drizzle</span>
          </footer>
        </main>
      </div>
    </>
  )
}
