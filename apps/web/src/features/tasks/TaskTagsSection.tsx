import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import type { TagDto } from '@project-manager/schemas'

import {
  assignTaskTag,
  createTag,
  listTags,
  listTaskTags,
  removeTaskTag,
} from './tasks-api'
import './tags.css'

function sortTags(tags: TagDto[]) {
  return [...tags].sort((left, right) =>
    left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
  )
}

export function TaskTagsSection() {
  const { taskId } = useParams()
  const [allTags, setAllTags] = useState<TagDto[]>([])
  const [assignedTags, setAssignedTags] = useState<TagDto[]>([])
  const [selectedTagId, setSelectedTagId] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3d4fc7')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    Promise.all([listTags(), listTaskTags(taskId)])
      .then(([catalog, assigned]) => {
        if (!active) return
        setAllTags(sortTags(catalog))
        setAssignedTags(sortTags(assigned))
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudieron cargar las etiquetas.',
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

  const assignedIds = useMemo(
    () => new Set(assignedTags.map((tag) => tag.id)),
    [assignedTags],
  )
  const availableTags = useMemo(
    () => allTags.filter((tag) => !assignedIds.has(tag.id)),
    [allTags, assignedIds],
  )

  useEffect(() => {
    if (!availableTags.some((tag) => tag.id === selectedTagId)) {
      setSelectedTagId(availableTags[0]?.id ?? '')
    }
  }, [availableTags, selectedTagId])

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newTagName.trim() || busy) return

    setBusy(true)
    setError(null)

    try {
      const tag = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      })
      setAllTags((current) => sortTags([...current, tag]))
      setSelectedTagId(tag.id)
      setNewTagName('')
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'No se pudo crear la etiqueta.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleAssign() {
    if (!taskId || !selectedTagId || busy) return

    setBusy(true)
    setError(null)

    try {
      const tag = await assignTaskTag(taskId, selectedTagId)
      setAssignedTags((current) =>
        current.some((item) => item.id === tag.id)
          ? current
          : sortTags([...current, tag]),
      )
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : 'No se pudo asignar la etiqueta.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(tag: TagDto) {
    if (!taskId || busy) return

    setBusy(true)
    setError(null)

    try {
      await removeTaskTag(taskId, tag.id)
      setAssignedTags((current) =>
        current.filter((assigned) => assigned.id !== tag.id),
      )
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'No se pudo quitar la etiqueta.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="project-detail-shell task-tags-shell">
      <section className="panel task-tags-section">
        <div className="task-section-header tags-header">
          <div>
            <span className="panel-label">Etiquetas</span>
            <h2>Clasificación rápida</h2>
            <p className="task-section-description">
              Reutiliza etiquetas personales para identificar el tipo o contexto del trabajo.
            </p>
          </div>
          <span className="task-count">{assignedTags.length}</span>
        </div>

        {error ? <p className="form-error tags-error">{error}</p> : null}

        {loading ? (
          <div className="content-loading tags-loading">Cargando etiquetas…</div>
        ) : (
          <>
            <div className="assigned-tags" aria-label="Etiquetas asignadas">
              {assignedTags.length === 0 ? (
                <span className="tags-empty-copy">Esta tarea no tiene etiquetas.</span>
              ) : (
                assignedTags.map((tag) => (
                  <span className="task-tag-chip" key={tag.id}>
                    <span
                      aria-hidden="true"
                      className="task-tag-dot"
                      style={{ backgroundColor: tag.color ?? 'var(--slate)' }}
                    />
                    <span>{tag.name}</span>
                    <button
                      aria-label={`Quitar etiqueta ${tag.name}`}
                      disabled={busy}
                      onClick={() => void handleRemove(tag)}
                      title="Quitar etiqueta"
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="tag-management-grid">
              <div className="tag-assignment-box">
                <span className="tag-box-label">Asignar existente</span>
                <div className="tag-assignment-controls">
                  <select
                    aria-label="Etiqueta disponible"
                    disabled={busy || availableTags.length === 0}
                    onChange={(event) => setSelectedTagId(event.target.value)}
                    value={selectedTagId}
                  >
                    {availableTags.length === 0 ? (
                      <option value="">No hay etiquetas disponibles</option>
                    ) : (
                      availableTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    className="secondary-button"
                    disabled={busy || !selectedTagId}
                    onClick={() => void handleAssign()}
                    type="button"
                  >
                    Asignar
                  </button>
                </div>
                <span className="tag-catalog-count">
                  {allTags.length} {allTags.length === 1 ? 'etiqueta' : 'etiquetas'} en tu catálogo
                </span>
              </div>

              <form className="tag-create-box" onSubmit={handleCreateTag}>
                <span className="tag-box-label">Crear etiqueta</span>
                <div className="tag-create-controls">
                  <input
                    className="tag-name-input"
                    maxLength={80}
                    onChange={(event) => setNewTagName(event.target.value)}
                    placeholder="Ej. Backend, Urgente, Estudio"
                    value={newTagName}
                  />
                  <label className="tag-color-control">
                    <span className="sr-only">Color de la etiqueta</span>
                    <input
                      aria-label="Color de la etiqueta"
                      onChange={(event) => setNewTagColor(event.target.value)}
                      type="color"
                      value={newTagColor}
                    />
                  </label>
                  <button
                    className="primary-button"
                    disabled={busy || !newTagName.trim()}
                    type="submit"
                  >
                    Crear
                  </button>
                </div>
                <span className="tag-catalog-count">
                  Crear no asigna automáticamente; luego puedes usarla en cualquier tarea.
                </span>
              </form>
            </div>
          </>
        )}
      </section>
    </section>
  )
}
