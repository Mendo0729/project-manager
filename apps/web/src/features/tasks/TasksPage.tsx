import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TaskDto, TaskStatus } from '@project-manager/schemas'

import { listTasks } from './tasks-api'

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  pending: 'Pendiente',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  completed: 'Completada',
  canceled: 'Cancelada',
}

const filterOptions: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'blocked', label: 'Bloqueadas' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'completed', label: 'Completadas' },
  { value: 'canceled', label: 'Canceladas' },
]

function taskContext(task: TaskDto) {
  if (!task.projectId) return 'Personal'
  if (task.milestoneId) return 'Hito'
  return 'Proyecto'
}

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      listTasks({
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined,
      })
        .then((items) => {
          if (active) setTasks(items)
        })
        .catch((loadError) => {
          if (active) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'No se pudieron cargar las tareas.',
            )
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 180)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [status, search])

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) => task.status === 'in_progress').length,
      blocked: tasks.filter((task) => task.status === 'blocked').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    }
  }, [tasks])

  return (
    <section className="tasks-page">
      <div className="page-head task-page-head">
        <div>
          <span className="page-kicker">Trabajo</span>
          <h2>Tareas</h2>
          <p className="page-subtitle">
            Tareas personales y trabajo vinculado a proyectos e hitos.
          </p>
        </div>
        <Link className="primary-button task-new-button" to="/tasks/new">
          + Nueva tarea
        </Link>
      </div>

      <section className="task-stat-grid" aria-label="Resumen de tareas">
        <article className="panel task-mini-stat">
          <span>Total visible</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="panel task-mini-stat">
          <span>En progreso</span>
          <strong>{stats.active}</strong>
        </article>
        <article className="panel task-mini-stat">
          <span>Bloqueadas</span>
          <strong>{stats.blocked}</strong>
        </article>
        <article className="panel task-mini-stat">
          <span>Completadas</span>
          <strong>{stats.completed}</strong>
        </article>
      </section>

      <div className="task-toolbar">
        <div
          className="project-filter-tabs task-filter-tabs"
          role="tablist"
          aria-label="Filtrar tareas"
        >
          {filterOptions.map((option) => (
            <button
              aria-selected={status === option.value}
              className={`chip${status === option.value ? ' active' : ''}`}
              key={option.value}
              onClick={() => setStatus(option.value)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="task-search-wrap">
          <span className="sr-only">Buscar tareas</span>
          <input
            aria-label="Buscar tareas"
            className="task-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título o descripción"
            type="search"
            value={search}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div className="content-loading">Cargando tareas…</div>
      ) : tasks.length === 0 ? (
        <section className="panel task-empty-state">
          <span className="panel-label">Sin resultados</span>
          <h3>No hay tareas para este filtro.</h3>
          <p>Crea una tarea personal o agrega trabajo desde un proyecto o hito.</p>
        </section>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <Link
              className={`task-row status-${task.status}`}
              key={task.id}
              to={`/tasks/${task.id}`}
            >
              <div className="task-row-main">
                <div className="task-title-line">
                  <strong>{task.title}</strong>
                  <span className={`task-status-badge ${task.status}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                <p>{task.description || 'Sin descripción.'}</p>
                <div className="task-meta-line">
                  <span>{taskContext(task)}</span>
                  <span>Prioridad {task.priority}</span>
                  <span>Peso {task.weight}</span>
                  {task.dueDate ? <span>Vence {task.dueDate}</span> : null}
                  {task.estimatedMinutes != null ? (
                    <span>{task.estimatedMinutes} min estimados</span>
                  ) : null}
                </div>
              </div>

              <div className="task-progress-cell">
                <strong>{task.progress}%</strong>
                <div className="progress-track">
                  <span style={{ width: `${task.progress}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
