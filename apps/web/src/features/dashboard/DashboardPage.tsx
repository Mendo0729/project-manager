import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProjectDto } from '@project-manager/schemas'

import { useAuth } from '../auth/AuthProvider'
import { listProjects } from '../projects/projects-api'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    listProjects({ archived: 'false', sort: 'updated' })
      .then((items) => {
        if (active) setProjects(items)
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los proyectos.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('es-PA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date()),
    [],
  )

  const activeProjects = projects.filter((project) => project.status === 'active')
  const completedProjects = projects.filter((project) => project.status === 'completed')
  const plannedProjects = projects.filter((project) => project.status === 'planned')
  const nearestDeadline = [...projects]
    .filter((project) => project.targetDate && project.status !== 'completed')
    .sort((left, right) => (left.targetDate ?? '').localeCompare(right.targetDate ?? ''))[0]

  return (
    <div className="workspace-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">PM</span>
          <div>
            <strong>Project Manager</strong>
            <span>Gestión de proyectos</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Navegación principal">
          <Link className="nav-item active" to="/">Resumen</Link>
          <Link className="nav-item" to="/projects">Proyectos</Link>
          <span className="nav-item nav-item-disabled">Esta semana</span>
          <span className="nav-item nav-item-disabled">Hoy</span>
          <span className="nav-item nav-item-disabled">Historial</span>
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="profile-avatar">
              {user?.displayName?.slice(0, 1).toUpperCase() ?? 'U'}
            </span>
            <div>
              <strong>{user?.displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="text-button" onClick={() => void logout()} type="button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div>
            <span className="page-kicker">Resumen</span>
            <h1>Hola, {user?.displayName?.split(' ')[0]}.</h1>
            <p className="header-date">{currentDate}</p>
          </div>

          <div className="header-actions">
            <Link className="secondary-button project-action-link" to="/projects">Ver proyectos</Link>
            <Link className="primary-button project-action-link" to="/projects/new">Nuevo proyecto</Link>
          </div>
        </header>

        {error ? <p className="form-error dashboard-error">{error}</p> : null}

        <section className="metrics-grid" aria-label="Resumen general">
          <article className="metric-card">
            <span>Proyectos activos</span>
            <strong>{loading ? '—' : activeProjects.length}</strong>
            <small>Datos reales de tu cuenta</small>
          </article>
          <article className="metric-card">
            <span>Planificados</span>
            <strong>{loading ? '—' : plannedProjects.length}</strong>
            <small>Pendientes de iniciar</small>
          </article>
          <article className="metric-card">
            <span>Completados</span>
            <strong>{loading ? '—' : completedProjects.length}</strong>
            <small>Proyectos terminados</small>
          </article>
          <article className="metric-card">
            <span>Total visible</span>
            <strong>{loading ? '—' : projects.length}</strong>
            <small>Sin contar archivados</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-column dashboard-column-main">
            <article className="panel">
              <div className="panel-heading compact">
                <div>
                  <span className="panel-label">Proyectos</span>
                  <h2>Actualizados recientemente</h2>
                </div>
                <Link className="link-button" to="/projects">Ver todos</Link>
              </div>

              {loading ? (
                <p className="projects-empty">Cargando…</p>
              ) : projects.length === 0 ? (
                <div className="projects-empty">
                  <p>Aún no tienes proyectos.</p>
                  <Link className="link-button" to="/projects/new">Crear el primero</Link>
                </div>
              ) : (
                <div className="project-list">
                  {projects.slice(0, 4).map((project) => (
                    <Link className="project-row project-row-link" key={project.id} to={`/projects/${project.id}`}>
                      <div className="project-icon" aria-hidden="true">{project.name.slice(0, 1)}</div>
                      <div className="project-info">
                        <div className="project-title-row">
                          <div>
                            <strong>{project.name}</strong>
                            <span>{project.status} · {project.priority}</span>
                          </div>
                          <span className="project-status">{project.progress}%</span>
                        </div>
                        <div className="progress-track small">
                          <span style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>

          <div className="dashboard-column">
            <article className="panel deadline-panel">
              <span className="panel-label">Próximo vencimiento</span>
              {nearestDeadline ? (
                <>
                  <div className="deadline-date">
                    <strong>{nearestDeadline.targetDate?.slice(8, 10)}</strong>
                    <span>{nearestDeadline.targetDate?.slice(5, 7)}</span>
                  </div>
                  <div>
                    <h2>{nearestDeadline.name}</h2>
                    <p>{nearestDeadline.targetDate}</p>
                  </div>
                </>
              ) : (
                <div>
                  <h2>Sin vencimientos</h2>
                  <p>No hay proyectos pendientes con fecha objetivo.</p>
                </div>
              )}
            </article>

            <article className="panel project-placeholder-card">
              <span className="panel-label">Próximas fases</span>
              <h2>Tareas y planificación</h2>
              <p>Se habilitarán cuando completemos los módulos correspondientes.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
