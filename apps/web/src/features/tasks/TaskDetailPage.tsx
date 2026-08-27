import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  TaskDetailDto,
  TaskDto,
  TaskStatus,
} from '@project-manager/schemas'

import {
  createSubtask,
  deleteSubtask,
  getTask,
  reorderSubtasks,
  updateSubtask,
  updateTask,
} from './tasks-api'
import './subtasks.css'

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  pending: 'Pendiente',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  completed: 'Completada',
  canceled: 'Cancelada',
}

export function TaskDetailPage() {
  const { taskId } = useParams()
  const [task, setTask] = useState<TaskDetailDto | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!taskId) return
    const item = await getTask(taskId)
    setTask(item)
  }, [taskId])

  useEffect(() => {
    if (!taskId) {
      setLoading(false)
      return
    }

    let active = true
    getTask(taskId)
      .then((item) => {
        if (active) setTask(item)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la tarea.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [taskId])

  async function changeStatus(status: TaskStatus) {
    if (!taskId) return
    setUpdating(true)
    setError(null)

    try {
      await updateTask(taskId, { status })
      await refresh()
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo actualizar la tarea.',
      )
    } finally {
      setUpdating(false)
    }
  }

  async function handleCreateSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskId || !subtaskTitle.trim()) return

    setUpdating(true)
    setError(null)

    try {
      await createSubtask(taskId, {
        title: subtaskTitle.trim(),
        status: 'pending',
        priority: 'medium',
      })
      setSubtaskTitle('')
      await refresh()
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear la subtarea.',
      )
    } finally {
      setUpdating(false)
    }
  }

  async function changeSubtaskStatus(subtaskId: string, status: TaskStatus) {
    if (!taskId) return
    setUpdating(true)
    setError(null)

    try {
      await updateSubtask(taskId, subtaskId, { status })
      await refresh()
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo actualizar la subtarea.',
      )
    } finally {
      setUpdating(false)
    }
  }

  function beginSubtaskEdit(subtask: TaskDto) {
    setEditingSubtaskId(subtask.id)
    setEditingSubtaskTitle(subtask.title)
    setError(null)
  }

  function cancelSubtaskEdit() {
    setEditingSubtaskId(null)
    setEditingSubtaskTitle('')
  }

  async function handleSaveSubtaskTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskId || !editingSubtaskId || !editingSubtaskTitle.trim()) return

    setUpdating(true)
    setError(null)

    try {
      await updateSubtask(taskId, editingSubtaskId, {
        title: editingSubtaskTitle.trim(),
      })
      cancelSubtaskEdit()
      await refresh()
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo editar la subtarea.',
      )
    } finally {
      setUpdating(false)
    }
  }

  async function handleDeleteSubtask(subtask: TaskDto) {
    if (!taskId) return

    const confirmed = window.confirm(
      `¿Eliminar la subtarea “${subtask.title}”? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setDeletingSubtaskId(subtask.id)
    setError(null)

    try {
      await deleteSubtask(taskId, subtask.id)
      if (editingSubtaskId === subtask.id) cancelSubtaskEdit()
      await refresh()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar la subtarea.',
      )
    } finally {
      setDeletingSubtaskId(null)
    }
  }

  async function moveSubtask(index: number, offset: -1 | 1) {
    if (!taskId || !task || reordering) return

    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= task.subtasks.length) return

    const previous = task.subtasks
    const next = [...previous]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)

    setTask({ ...task, subtasks: next })
    setReordering(true)
    setError(null)

    try {
      const reordered = await reorderSubtasks(
        taskId,
        next.map((subtask) => subtask.id),
      )
      setTask((current) =>
        current ? { ...current, subtasks: reordered } : current,
      )
    } catch (reorderError) {
      setTask((current) =>
        current ? { ...current, subtasks: previous } : current,
      )
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo guardar el orden de las subtareas.',
      )
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return <div className="content-loading">Cargando tarea…</div>
  }

  if (!task) {
    return (
      <section className="project-form-shell">
        <p className="form-error">{error ?? 'Tarea no encontrada.'}</p>
        <Link className="project-back-link" to="/tasks">
          ← Volver a tareas
        </Link>
      </section>
    )
  }

  return (
    <section className="project-detail-shell task-detail-shell">
      <div className="project-detail-header task-detail-header">
        <div>
          <Link className="project-back-link" to="/tasks">
            ← Tareas
          </Link>
          <span className={`task-status-badge ${task.status}`}>
            {statusLabels[task.status]}
          </span>
          <h1>{task.title}</h1>
          <p>{task.description || 'Sin descripción.'}</p>
        </div>
        <Link className="primary-button" to={`/tasks/${task.id}/edit`}>
          Editar
        </Link>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="project-detail-grid">
        <article className="panel project-detail-card">
          <span className="panel-label">Información</span>
          <dl className="project-data-list">
            <div>
              <dt>Estado</dt>
              <dd>{statusLabels[task.status]}</dd>
            </div>
            <div>
              <dt>Prioridad</dt>
              <dd>{task.priority}</dd>
            </div>
            <div>
              <dt>Contexto</dt>
              <dd>
                {!task.projectId
                  ? 'Personal'
                  : task.milestoneId
                    ? 'Hito'
                    : 'Proyecto'}
              </dd>
            </div>
            <div>
              <dt>Fecha límite</dt>
              <dd>{task.dueDate ?? 'Sin fecha'}</dd>
            </div>
            <div>
              <dt>Tiempo estimado</dt>
              <dd>
                {task.estimatedMinutes != null
                  ? `${task.estimatedMinutes} min`
                  : 'Sin estimación'}
              </dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{task.weight}</dd>
            </div>
          </dl>

          {task.projectId ? (
            <div className="task-context-links">
              <Link to={`/projects/${task.projectId}`}>Ver proyecto</Link>
              {task.milestoneId ? (
                <Link
                  to={`/projects/${task.projectId}/milestones/${task.milestoneId}`}
                >
                  Ver hito
                </Link>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="panel project-progress-card task-progress-card">
          <span className="panel-label">Progreso</span>
          <strong>{task.progress}%</strong>
          <div
            aria-label={`Progreso ${task.progress}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={task.progress}
            className="task-detail-progress-track"
            role="progressbar"
          >
            <span style={{ width: `${task.progress}%` }} />
          </div>
          <p>
            Se calcula con subtareas; si no existen, usa el checklist. Completar la tarea fuerza 100%.
          </p>
        </article>
      </section>

      <section className="panel project-status-actions task-status-actions">
        <div>
          <span className="panel-label">Estado de la tarea</span>
          <h2>Acciones</h2>
        </div>
        <div className="project-action-group">
          {task.status === 'completed' || task.status === 'canceled' ? (
            <button
              className="secondary-button"
              disabled={updating}
              onClick={() => void changeStatus('in_progress')}
              type="button"
            >
              Reabrir
            </button>
          ) : (
            <>
              {task.status !== 'in_progress' ? (
                <button
                  className="secondary-button"
                  disabled={updating}
                  onClick={() => void changeStatus('in_progress')}
                  type="button"
                >
                  Iniciar
                </button>
              ) : null}
              {task.status !== 'blocked' ? (
                <button
                  className="secondary-button"
                  disabled={updating}
                  onClick={() => void changeStatus('blocked')}
                  type="button"
                >
                  Bloquear
                </button>
              ) : null}
              <button
                className="secondary-button"
                disabled={updating}
                onClick={() => void changeStatus('completed')}
                type="button"
              >
                Completar
              </button>
              <button
                className="secondary-button"
                disabled={updating}
                onClick={() => void changeStatus('canceled')}
                type="button"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </section>

      <section className="panel task-subtasks-section">
        <div className="task-section-header">
          <div>
            <span className="panel-label">Subtareas</span>
            <h2>Desglose del trabajo</h2>
            <p className="task-section-description">
              Crea, completa, edita, elimina y ordena los pasos de esta tarea.
            </p>
          </div>
          <span className="task-count">{task.subtasks.length}</span>
        </div>

        <form className="task-inline-create" onSubmit={handleCreateSubtask}>
          <input
            className="task-inline-input"
            maxLength={240}
            onChange={(event) => setSubtaskTitle(event.target.value)}
            placeholder="Escribe una nueva subtarea…"
            value={subtaskTitle}
          />
          <button
            className="primary-button"
            disabled={updating || !subtaskTitle.trim()}
            type="submit"
          >
            Agregar
          </button>
        </form>

        {task.subtasks.length === 0 ? (
          <div className="task-section-empty task-subtask-empty">
            <strong>No hay subtareas todavía.</strong>
            <span>Agrega la primera usando el campo de arriba.</span>
          </div>
        ) : (
          <div className="subtask-list">
            {task.subtasks.map((subtask, index) => (
              <article
                className={`subtask-row status-${subtask.status}`}
                key={subtask.id}
              >
                <label className="subtask-completion">
                  <span className="sr-only">
                    {subtask.status === 'completed'
                      ? `Reabrir ${subtask.title}`
                      : `Completar ${subtask.title}`}
                  </span>
                  <input
                    checked={subtask.status === 'completed'}
                    disabled={updating || deletingSubtaskId === subtask.id}
                    onChange={(event) =>
                      void changeSubtaskStatus(
                        subtask.id,
                        event.target.checked ? 'completed' : 'pending',
                      )
                    }
                    type="checkbox"
                  />
                </label>

                <div className="subtask-main">
                  <span className="subtask-index">{index + 1}</span>
                  <div
                    className={`subtask-copy ${
                      subtask.status === 'completed' ? 'is-completed' : ''
                    }`}
                  >
                    {editingSubtaskId === subtask.id ? (
                      <form
                        className="subtask-edit-form"
                        onSubmit={handleSaveSubtaskTitle}
                      >
                        <input
                          autoFocus
                          className="subtask-edit-input"
                          maxLength={240}
                          onChange={(event) =>
                            setEditingSubtaskTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') cancelSubtaskEdit()
                          }}
                          value={editingSubtaskTitle}
                        />
                        <button
                          className="subtask-action-button subtask-save-button"
                          disabled={updating || !editingSubtaskTitle.trim()}
                          type="submit"
                        >
                          Guardar
                        </button>
                        <button
                          className="subtask-action-button"
                          disabled={updating}
                          onClick={cancelSubtaskEdit}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <>
                        <strong>{subtask.title}</strong>
                        <div className="subtask-meta">
                          <span className={`task-status-badge ${subtask.status}`}>
                            {statusLabels[subtask.status]}
                          </span>
                          <span>{subtask.progress}% completado</span>
                          {subtask.dueDate ? (
                            <span>Vence {subtask.dueDate}</span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="subtask-actions">
                  <div className="subtask-order-controls">
                    <button
                      aria-label={`Mover ${subtask.title} hacia arriba`}
                      className="subtask-action-button subtask-order-button"
                      disabled={reordering || index === 0}
                      onClick={() => void moveSubtask(index, -1)}
                      title="Mover arriba"
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Mover ${subtask.title} hacia abajo`}
                      className="subtask-action-button subtask-order-button"
                      disabled={
                        reordering || index === task.subtasks.length - 1
                      }
                      onClick={() => void moveSubtask(index, 1)}
                      title="Mover abajo"
                      type="button"
                    >
                      ↓
                    </button>
                  </div>

                  {editingSubtaskId !== subtask.id ? (
                    <button
                      className="subtask-action-button"
                      disabled={updating || reordering}
                      onClick={() => beginSubtaskEdit(subtask)}
                      type="button"
                    >
                      Editar
                    </button>
                  ) : null}

                  <button
                    className="subtask-action-button danger"
                    disabled={
                      updating ||
                      reordering ||
                      deletingSubtaskId === subtask.id
                    }
                    onClick={() => void handleDeleteSubtask(subtask)}
                    type="button"
                  >
                    {deletingSubtaskId === subtask.id
                      ? 'Eliminando…'
                      : 'Eliminar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel task-checklist-preview">
        <span className="panel-label">Checklist</span>
        <h2>
          {task.checklist.length > 0
            ? `${task.checklist.length} elementos`
            : 'Siguiente paso'}
        </h2>
        <p>
          {task.checklist.length > 0
            ? 'Los elementos existentes ya participan en el cálculo del progreso.'
            : 'La gestión visual del checklist se habilitará en el paso 5.7.'}
        </p>
      </section>
    </section>
  )
}
