import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ProjectDto, ProjectPriority, ProjectStatus } from '@project-manager/schemas'

import { useAuth } from '../auth/AuthProvider'
import { listProjects } from '../projects/projects-api'

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

function formatDate(date: string | null) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short' }).format(
    new Date(`${date}T12:00:00`),
  )
}

export function DashboardPage() {
  const { user } = useAuth()
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
  const averageProgress =
    projects.length > 0
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdueProjects = projects.filter(
    (project) =>
      Boolean(project.targetDate) &&
      project.targetDate! < today &&
      project.status !== 'completed',
  )
  const nearestDeadline = [...projects]
    .filter((project) => project.targetDate && project.status !== 'completed')
    .sort((left, right) => (left.targetDate ?? '').localeCompare(right.targetDate ?? ''))[0]

  return (
    <section className="dashboard-page">
      <header className="page-head">
        <div>
          <h2>Buenas tardes, {user?.displayName?.split(' ')[0]}</h2>
          <p className="page-subtitle">
            {currentDate} · {projects.length} proyecto{projects.length === 1 ? '' : 's'} en seguimiento
          </p>
        </div>
        <Link className="btn" to="/projects/new">
          + Nuevo proyecto
        </Link>
      </header>

      {error ? <p className="form-error dashboard-error">{error}</p> : null}

      <section className="stat-grid" aria-label="Resumen general">
        <article className="stat">
          <span className="stat-key">Proyectos activos</span>
          <span className="stat-value">{loading ? '—' : activeProjects.length}</span>
          <span className="stat-underline" />
        </article>
        <article className="stat stat-teal">
          <span className="stat-key">Completados</span>
          <span className="stat-value">{loading ? '—' : completedProjects.length}</span>
          <span className="stat-underline" />
        </article>
        <article className="stat stat-amber">
          <span className="stat-key">Progreso promedio</span>
          <span className="stat-value">
            {loading ? '—' : averageProgress}
            {!loading ? <small>%</small> : null}
          </span>
          <span className="stat-underline" />
        </article>
        <article className="stat stat-crimson">
          <span className="stat-key">Vencidos</span>
          <span className="stat-value">{loading ? '—' : overdueProjects.length}</span>
          <span className="stat-underline" />
        </article>
      </section>

      <div className="dashboard-two-column">
        <section>
          <div className="section-head">
            <h3>Proyectos recientes</h3>
            <Link className="section-link" to="/projects">
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="panel empty-state">Cargando proyectos…</div>
          ) : projects.length === 0 ? (
            <div className="panel empty-state">
              <h3>Aún no tienes proyectos</h3>
              <p>Crea el primero para comenzar a organizar tu trabajo.</p>
              <Link className="btn" to="/projects/new">
                Crear proyecto
              </Link>
            </div>
          ) : (
            <div className="project-grid sober-project-grid">
              {projects.slice(0, 4).map((project) => (
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
            </div>
          )}
        </section>

        <aside className="dashboard-side-stack">
          <section>
            <div className="section-head">
              <h3>Próximo vencimiento</h3>
            </div>
            <div className="panel sober-side-panel">
              {nearestDeadline ? (
                <>
                  <span className="panel-eyebrow">Fecha objetivo</span>
                  <strong className="deadline-project-name">{nearestDeadline.name}</strong>
                  <span className="deadline-project-date">
                    {new Intl.DateTimeFormat('es-PA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(new Date(`${nearestDeadline.targetDate}T12:00:00`))}
                  </span>
                  <Link className="section-link" to={`/projects/${nearestDeadline.id}`}>
                    Abrir proyecto →
                  </Link>
                </>
              ) : (
                <>
                  <span className="panel-eyebrow">Agenda</span>
                  <strong className="deadline-project-name">Sin vencimientos pendientes</strong>
                  <span className="deadline-project-date">
                    No hay proyectos abiertos con fecha objetivo.
                  </span>
                </>
              )}
            </div>
          </section>

          <section>
            <div className="section-head">
              <h3>Estado del sistema</h3>
            </div>
            <div className="panel phase-panel">
              <div className="phase-row">
                <span>Proyectos</span>
                <span className="status-badge completed">Disponible</span>
              </div>
              <div className="phase-row">
                <span>Hitos</span>
                <span className="status-badge active">En desarrollo</span>
              </div>
              <div className="phase-row muted">
                <span>Tareas</span>
                <span>Próxima fase</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
