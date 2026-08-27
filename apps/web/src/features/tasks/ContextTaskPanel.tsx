import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TaskDto, TaskStatus } from '@project-manager/schemas'

import {
  listMilestoneTasks,
  listProjectTasks,
  reorderTasks,
} from './tasks-api'
import './ordering.css'

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  pending: 'Pendiente',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  completed: 'Completada',
  canceled: 'Cancelada',
}

interface ContextTaskPanelProps {
  projectId: string
  milestoneId?: string
  title?: string
}

export function ContextTaskPanel({
  projectId,
  milestoneId,
  title = 'Trabajo del proyecto',
}: ContextTaskPanelProps) {
  const [tasks, setTasks] = useState<TaskDto[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const request = milestoneId
      ? listMilestoneTasks(projectId, milestoneId, { sort: 'position' })
      : listProjectTasks(projectId, { sort: 'position' })

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

    return () => {
      active = false
    }
  }, [projectId, milestoneId])

  const directTasks = useMemo(
    () => tasks.filter((task) => task.milestoneId === null),
    [tasks],
  )
  const linkedMilestoneTasks = useMemo(
    () => tasks.filter((task) => task.milestoneId !== null),
    [tasks],
  )
  const displayedTasks = milestoneId
    ? tasks
    : [...directTasks, ...linkedMilestoneTasks]

  const newTaskUrl = milestoneId
    ? `/tasks/new?projectId=${encodeURIComponent(projectId)}&milestoneId=${encodeURIComponent(milestoneId)}`
    : `/tasks/new?projectId=${encodeURIComponent(projectId)}`

  async function moveTask(task: TaskDto, offset: -1 | 1) {
    if (reordering) return

    const scopeTasks = milestoneId ? tasks : directTasks
    const index = scopeTasks.findIndex((item) => item.id === task.id)
    const targetIndex = index + offset

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= scopeTasks.length
    ) {
      return
    }

    const previous = tasks
    const nextScope = [...scopeTasks]
    const [moved] = nextScope.splice(index, 1)
    if (!moved) return
    nextScope.splice(targetIndex, 0, moved)

    const nextTasks = milestoneId
      ? nextScope
      : [...nextScope, ...linkedMilestoneTasks]

    setTasks(nextTasks)
    setReordering(true)
    setError(null)

    try {
      await reorderTasks(nextScope.map((item) => item.id))
    } catch (reorderError) {
      setTasks(previous)
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo guardar el orden de las tareas.',
      )
    } finally {
      setReordering(false)
    }
  }

  return (
    <section className="panel milestone-section task-context-panel">
      <div className="milestone-section-header">
        <div>
          <span className="panel-label">Tareas</span>
          <h2>{title}</h2>
          <p className="task-order-note">
            {milestoneId
              ? 'El orden se guarda dentro de este hito.'
              : 'Las tareas directas del proyecto se ordenan aquí; las vinculadas a hitos conservan el orden de su hito.'}
          </p>
        </div>
        <div className="task-section-actions">
          <Link className="secondary-button" to="/tasks">
            Ver todas
          </Link>
          <Link className="primary-button" to={newTaskUrl}>
            + Nueva tarea
          </Link>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div className="task-section-empty">Cargando tareas…</div>
      ) : tasks.length === 0 ? (
        <div className="milestone-empty">
          <strong>Aún no hay tareas.</strong>
          <span>
            {milestoneId
              ? 'Crea una tarea para empezar a ejecutar este hito.'
              : 'Crea una tarea para empezar a ejecutar el proyecto.'}
          </span>
        </div>
      ) : (
        <div className="task-compact-list">
          {displayedTasks.map((task) => {
            const scopeTasks = milestoneId ? tasks : directTasks
            const orderIndex = scopeTasks.findIndex((item) => item.id === task.id)
            const canOrder = milestoneId ? true : task.milestoneId === null

            return (
              <div className="task-compact-item" key={task.id}>
                <Link
                  className="task-compact-row"
                  to={`/tasks/${task.id}`}
                >
                  <div className="task-compact-copy">
                    <strong>{task.title}</strong>
                    <span>
                      {statusLabels[task.status]} · {task.priority}
                      {task.dueDate ? ` · vence ${task.dueDate}` : ''}
                      {!milestoneId && task.milestoneId
                        ? ' · vinculada a hito'
                        : ''}
                    </span>
                  </div>
                  <span className="task-compact-progress">{task.progress}%</span>
                </Link>

                {canOrder ? (
                  <div className="task-order-controls">
                    <button
                      aria-label={`Mover ${task.title} hacia arriba`}
                      className="task-order-button"
                      disabled={reordering || orderIndex <= 0}
                      onClick={() => void moveTask(task, -1)}
                      title="Mover arriba"
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Mover ${task.title} hacia abajo`}
                      className="task-order-button"
                      disabled={
                        reordering || orderIndex === scopeTasks.length - 1
                      }
                      onClick={() => void moveTask(task, 1)}
                      title="Mover abajo"
                      type="button"
                    >
                      ↓
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
