import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  ProjectDto,
  ProjectPriority,
  ProjectStatus,
} from '@project-manager/schemas'

import { listProjects } from './projects-api'

const statusLabels: Record<ProjectStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
}

const priorityLabels: Record<ProjectPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
}

const filters: Array<{ value: ProjectStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'planned', label: 'Planificados' },
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Completados' },
  { value: 'archived', label: 'Archivados' },
]

function formatDate(date: string | null) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short' }).format(
    new Date(`${date}T12:00:00`),
  )
}

export function ProjectsPage() {
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
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar los proyectos.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [status, search])

  return (
    <section className="projects-page">
      <header className="page-head">
        <div>
          <h2>Proyectos</h2>
          <p className="page-subtitle">
            {loading ? 'Cargando…' : `${projects.length} proyecto${projects.length === 1 ? '' : 's'} en esta vista`}
          </p>
        </div>
        <Link className="btn" to="/projects/new">
          + Nuevo proyecto
        </Link>
      </header>

      <section className="project-toolbar" aria-label="Filtros de proyectos">
        <div className="project-filter-tabs">
          {filters.map((filter) => (
            <button
              className={filter.value === status ? 'chip active' : 'chip'}
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="sober-search">
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
        <div className="panel empty-state">Cargando proyectos…</div>
      ) : projects.length === 0 ? (
        <section className="panel empty-state">
          <h3>No hay proyectos en esta vista</h3>
          <p>Crea un proyecto o cambia los filtros actuales.</p>
        </section>
      ) : (
        <section className="project-grid projects-catalog-grid">
          {projects.map((project) => (
            <Link
              className={`sober-card st-${project.status}`}
              key={project.id}
              to={`/projects/${project.id}`}
            >
              <div className="sober-card-top">
                <h4>{project.name}</h4>
                <span className={`status-badge ${project.status}`}>
                  {statusLabels[project.status]}
                </span>
              </div>
              <p className="sober-card-desc">{project.description || 'Sin descripción.'}</p>
              <div className="sober-progress-row">
                <div className="sober-progress-track">
                  <span
                    className={`sober-progress-fill priority-${project.priority}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="sober-progress-number">{project.progress}%</span>
              </div>
              <div className="sober-card-meta">
                <span>
                  <span className={`priority-dot priority-${project.priority}`} />
                  Prioridad {priorityLabels[project.priority].toLowerCase()}
                </span>
                <span>Obj. {formatDate(project.targetDate)}</span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </section>
  )
}
