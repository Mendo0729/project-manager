import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TaskDto, TaskStatus } from '@project-manager/schemas'

import { listMilestoneTasks, listProjectTasks } from './tasks-api'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const request = milestoneId
      ? listMilestoneTasks(projectId, milestoneId)
      : listProjectTasks(projectId)

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

  const newTaskUrl = milestoneId
    ? `/tasks/new?projectId=${encodeURIComponent(projectId)}&milestoneId=${encodeURIComponent(milestoneId)}`
    : `/tasks/new?projectId=${encodeURIComponent(projectId)}`

  return (
    <section className="panel milestone-section task-context-panel">
      <div className="milestone-section-header">
        <div>
          <span className="panel-label">Tareas</span>
          <h2>{title}</h2>
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
          {tasks.map((task) => (
            <Link className="task-compact-row" key={task.id} to={`/tasks/${task.id}`}>
              <div className="task-compact-copy">
                <strong>{task.title}</strong>
                <span>
                  {statusLabels[task.status]} · {task.priority}
                  {task.dueDate ? ` · vence ${task.dueDate}` : ''}
                  {!milestoneId && task.milestoneId ? ' · vinculada a hito' : ''}
                </span>
              </div>
              <span className="task-compact-progress">{task.progress}%</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
