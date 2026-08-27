import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useParams } from 'react-router-dom'
import type { ChecklistItemDto } from '@project-manager/schemas'

import {
  createChecklistItem,
  deleteChecklistItem,
  listChecklist,
  updateChecklistItem,
} from './tasks-api'
import './checklists.css'

interface ChecklistSectionProps {
  onTaskChanged: () => void
}

export function ChecklistSection({ onTaskChanged }: ChecklistSectionProps) {
  const { taskId } = useParams()
  const [items, setItems] = useState<ChecklistItemDto[]>([])
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    listChecklist(taskId)
      .then((checklist) => {
        if (active) setItems(checklist)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el checklist.',
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

  const completedCount = useMemo(
    () => items.filter((item) => item.isCompleted).length,
    [items],
  )
  const progress =
    items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskId || !title.trim() || busyItemId) return

    setCreating(true)
    setError(null)

    try {
      const item = await createChecklistItem(taskId, { title: title.trim() })
      setItems((current) => [...current, item])
      setTitle('')
      onTaskChanged()
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear el elemento.',
      )
    } finally {
      setCreating(false)
    }
  }

  function beginEdit(item: ChecklistItemDto) {
    setEditingId(item.id)
    setEditingTitle(item.title)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!taskId || !editingId || !editingTitle.trim()) return

    setBusyItemId(editingId)
    setError(null)

    try {
      const updated = await updateChecklistItem(taskId, editingId, {
        title: editingTitle.trim(),
      })
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      cancelEdit()
      onTaskChanged()
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo editar el elemento.',
      )
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleToggle(item: ChecklistItemDto, isCompleted: boolean) {
    if (!taskId || busyItemId) return

    const previous = items
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, isCompleted }
          : currentItem,
      ),
    )
    setBusyItemId(item.id)
    setError(null)

    try {
      const updated = await updateChecklistItem(taskId, item.id, {
        isCompleted,
      })
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updated.id ? updated : currentItem,
        ),
      )
      onTaskChanged()
    } catch (toggleError) {
      setItems(previous)
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'No se pudo actualizar el elemento.',
      )
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleDelete(item: ChecklistItemDto) {
    if (!taskId || busyItemId) return

    const confirmed = window.confirm(
      `¿Eliminar “${item.title}” del checklist? Esta acción no se puede deshacer.`,
    )
    if (!confirmed) return

    setBusyItemId(item.id)
    setError(null)

    try {
      await deleteChecklistItem(taskId, item.id)
      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      )
      if (editingId === item.id) cancelEdit()
      onTaskChanged()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el elemento.',
      )
    } finally {
      setBusyItemId(null)
    }
  }

  return (
    <section className="project-detail-shell task-checklist-shell">
      <section className="panel task-checklist-section">
        <div className="task-section-header checklist-header">
          <div>
            <span className="panel-label">Checklist</span>
            <h2>Pasos verificables</h2>
            <p className="task-section-description">
              Marca avances puntuales sin convertirlos en subtareas completas.
            </p>
          </div>
          <div className="checklist-summary">
            <strong>{progress}%</strong>
            <span>
              {completedCount}/{items.length} completados
            </span>
          </div>
        </div>

        <div
          aria-label={`Progreso del checklist ${progress}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="checklist-progress-track"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <form className="task-inline-create checklist-create" onSubmit={handleCreate}>
          <input
            className="task-inline-input"
            maxLength={240}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Agregar elemento al checklist…"
            value={title}
          />
          <button
            className="primary-button"
            disabled={creating || busyItemId !== null || !title.trim()}
            type="submit"
          >
            {creating ? 'Agregando…' : 'Agregar'}
          </button>
        </form>

        {error ? <p className="form-error checklist-error">{error}</p> : null}

        {loading ? (
          <div className="content-loading checklist-loading">Cargando checklist…</div>
        ) : items.length === 0 ? (
          <div className="task-section-empty checklist-empty">
            <strong>No hay elementos todavía.</strong>
            <span>Agrega el primero usando el campo de arriba.</span>
          </div>
        ) : (
          <div className="checklist-list">
            {items.map((item) => (
              <article
                className={`checklist-row ${item.isCompleted ? 'is-completed' : ''}`}
                key={item.id}
              >
                <label className="checklist-toggle">
                  <span className="sr-only">
                    {item.isCompleted
                      ? `Marcar ${item.title} como pendiente`
                      : `Completar ${item.title}`}
                  </span>
                  <input
                    checked={item.isCompleted}
                    disabled={busyItemId !== null}
                    onChange={(event) =>
                      void handleToggle(item, event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>

                <div className="checklist-copy">
                  {editingId === item.id ? (
                    <form className="checklist-edit-form" onSubmit={handleSave}>
                      <input
                        autoFocus
                        className="checklist-edit-input"
                        maxLength={240}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') cancelEdit()
                        }}
                        value={editingTitle}
                      />
                      <div className="checklist-edit-actions">
                        <button
                          className="checklist-action-button"
                          disabled={busyItemId === item.id || !editingTitle.trim()}
                          type="submit"
                        >
                          Guardar
                        </button>
                        <button
                          className="checklist-action-button"
                          disabled={busyItemId === item.id}
                          onClick={cancelEdit}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <strong>{item.title}</strong>
                  )}
                </div>

                <div className="checklist-actions">
                  {editingId !== item.id ? (
                    <button
                      className="checklist-action-button"
                      disabled={busyItemId !== null}
                      onClick={() => beginEdit(item)}
                      type="button"
                    >
                      Editar
                    </button>
                  ) : null}
                  <button
                    className="checklist-action-button danger"
                    disabled={busyItemId !== null}
                    onClick={() => void handleDelete(item)}
                    type="button"
                  >
                    {busyItemId === item.id ? 'Procesando…' : 'Eliminar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
