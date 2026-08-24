import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProjectDto, ProjectStatus } from '@project-manager/schemas'

import { useAuth } from '../auth/AuthProvider'
import { listProjects } from './projects-api'

const statusLabels: Record<ProjectStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
}

const filters: Array<{ value: ProjectStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'planned', label: 'Planificados' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Completados' },
  { value: 'archived', label: 'Archivados' },
]

export function ProjectsPage() {
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const archived = status === 'archived' ? 'true' : 'false'

    listProjects({
      status: status === 'all' || status === 'archived' ? undefined : status,
      archived,
      search: search.trim() || undefined,
      sort: 'updated',
    })
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
  }, [status, search])

  const activeCount = useMemo(
    () => projects.filter((project) => project.status === 'active').length,
    [projects],
  )

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
          <Link className="nav-item" to="/">Resumen</Link>
          <Link className="nav-item active" to="/projects">Proyectos</Link>
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="profile-avatar">{user?.displayName?.slice(0, 1).toUpperCase() ?? 'U'}</span>
            <div>
              <strong>{user?.displayName}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="text-button" onClick={() => void logout()} type="button">Cerrar sesión</button>
        </div>
      </aside>

      <main className="workspace-main projects-page">
        <header className="workspace-header">
          <div>
            <span className="page-kicker">Proyectos</span>
            <h1>Tu espacio de trabajo</h1>
            <p className="header-date">{activeCount} proyectos activos en esta vista</p>
          </div>
          <Link className="primary-button project-action-link" to="/projects/new">Nuevo proyecto</Link>
        </header>

        <section className="project-toolbar" aria-label="Filtros de proyectos">
          <div className="project-filter-tabs">
            {filters.map((filter) => (
              <button
                className={filter.value === status ? 'filter-chip active' : 'filter-chip'}
                key={filter.value}
                onClick={() => setStatus(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <label className="search-field project-search">
            <span className="sr-only">Buscar proyectos</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar proyectos…"
              type="search"
              value={search}
            />
          </label>
        </section>

        {error ? <p className="form-error">{error}</p> : null}

        {loading ? (
          <p className="projects-empty">Cargando proyectos…</p>
        ) : projects.length === 0 ? (
          <section className="panel projects-empty">
            <h2>No hay proyectos en esta vista</h2>
            <p>Crea un proyecto o cambia los filtros actuales.</p>
          </section>
        ) : (
          <section className="project-card-grid">
            {projects.map((project) => (
              <Link className="project-card" key={project.id} to={`/projects/${project.id}`}>
                <div className="project-card-heading">
                  <span className="project-status">{statusLabels[project.status]}</span>
                  <span>{project.priority}</span>
                </div>
                <h2>{project.name}</h2>
                <p>{project.description || 'Sin descripción.'}</p>
                <div className="progress-row">
                  <div className="progress-track small">
                    <span style={{ width: `${project.progress}%` }} />
                  </div>
                  <strong>{project.progress}%</strong>
                </div>
                <small>
                  {project.targetDate ? `Objetivo: ${project.targetDate}` : 'Sin fecha objetivo'}
                </small>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
