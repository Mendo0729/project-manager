import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TaskDto, TaskStatus } from '@project-manager/schemas'

import { listTasks, reorderTasks } from './tasks-api'
import './ordering.css'

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
  const [manualOrder, setManualOrder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      const request = manualOrder
        ? listTasks({ personal: 'true', sort: 'position' })
        : listTasks({
            status: status === 'all' ? undefined : status,
            search: search.trim() || undefined,
          })

      request
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
  }, [status, search, manualOrder])

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) => task.status === 'in_progress').length,
      blocked: tasks.filter((task) => task.status === 'blocked').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    }
  }, [tasks])

  async function movePersonalTask(index: number, offset: -1 | 1) {
    if (!manualOrder || reordering) return

    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= tasks.length) return

    const previous = tasks
    const next = [...previous]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)

    setTasks(next)
    setReordering(true)
    setError(null)

    try {
      await reorderTasks(next.map((task) => task.id))
    } catch (reorderError) {
      setTasks(previous)
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo guardar el orden de las tareas personales.',
      )
    } finally {
      setReordering(false)
    }
  }

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
              aria-selected={!manualOrder && status === option.value}
              className={`chip${!manualOrder && status === option.value ? ' active' : ''}`}
              disabled={manualOrder}
              key={option.value}
              onClick={() => setStatus(option.value)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
          <button
            aria-pressed={manualOrder}
            className={`chip personal-order-toggle${manualOrder ? ' active' : ''}`}
            onClick={() => setManualOrder((current) => !current)}
            type="button"
          >
            Orden personal
          </button>
        </div>

        <label className="task-search-wrap">
          <span className="sr-only">Buscar tareas</span>
          <input
            aria-label="Buscar tareas"
            className="task-search"
            disabled={manualOrder}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              manualOrder
                ? 'Desactiva Orden personal para buscar'
                : 'Buscar por título o descripción'
            }
            type="search"
            value={search}
          />
        </label>
      </div>

      {manualOrder ? (
        <p className="task-order-note">
          Modo de orden manual: solo se muestran tareas personales. Usa las flechas para guardar su posición.
        </p>
      ) : null}

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
          {tasks.map((task, index) => {
            const row = (
              <Link
                className={`task-row status-${task.status}`}
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
            )

            if (!manualOrder) {
              return <div key={task.id}>{row}</div>
            }

            return (
              <div className="task-row-with-order" key={task.id}>
                {row}
                <div className="task-list-order-controls">
                  <button
                    aria-label={`Mover ${task.title} hacia arriba`}
                    className="task-order-button"
                    disabled={reordering || index === 0}
                    onClick={() => void movePersonalTask(index, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Mover ${task.title} hacia abajo`}
                    className="task-order-button"
                    disabled={reordering || index === tasks.length - 1}
                    onClick={() => void movePersonalTask(index, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
