import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  ProjectPriority,
  ProjectProgressMode,
  ProjectStatus,
} from '@project-manager/schemas'

import { createProject, getProject, updateProject } from './projects-api'

export function ProjectFormPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(projectId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('planned')
  const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [progressMode, setProgressMode] = useState<ProjectProgressMode>('automatic')
  const [manualProgress, setManualProgress] = useState('0')
  const [loading, setLoading] = useState(editing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    let active = true
    getProject(projectId)
      .then((project) => {
        if (!active) return
        setName(project.name)
        setDescription(project.description ?? '')
        setStatus(project.status)
        setPriority(project.priority)
        setStartDate(project.startDate ?? '')
        setTargetDate(project.targetDate ?? '')
        setProgressMode(project.progressMode)
        setManualProgress(String(project.manualProgress ?? 0))
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el proyecto.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = {
      name,
      description: description.trim() || null,
      status,
      priority,
      startDate: startDate || null,
      targetDate: targetDate || null,
      progressMode,
      manualProgress:
        progressMode === 'manual'
          ? Number.parseInt(manualProgress || '0', 10)
          : null,
    }

    try {
      const project = projectId
        ? await updateProject(projectId, payload)
        : await createProject(payload)
      navigate(`/projects/${project.id}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el proyecto.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className="auth-loading">Cargando proyecto…</main>
  }

  return (
    <main className="project-form-shell">
      <div className="project-form-header">
        <div>
          <span className="page-kicker">{editing ? 'Editar proyecto' : 'Nuevo proyecto'}</span>
          <h1>{editing ? 'Actualiza el proyecto' : 'Crea un proyecto'}</h1>
        </div>
        <Link className="text-button project-back-link" to={projectId ? `/projects/${projectId}` : '/projects'}>
          Volver
        </Link>
      </div>

      <form className="panel project-form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input maxLength={180} onChange={(event) => setName(event.target.value)} required value={name} />
        </label>

        <label>
          Descripción
          <textarea maxLength={5000} onChange={(event) => setDescription(event.target.value)} rows={5} value={description} />
        </label>

        <div className="project-form-grid">
          <label>
            Estado
            <select onChange={(event) => setStatus(event.target.value as ProjectStatus)} value={status}>
              <option value="planned">Planificado</option>
              <option value="active">Activo</option>
              <option value="paused">Pausado</option>
              <option value="completed">Completado</option>
              <option value="archived">Archivado</option>
            </select>
          </label>

          <label>
            Prioridad
            <select onChange={(event) => setPriority(event.target.value as ProjectPriority)} value={priority}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </label>

          <label>
            Fecha de inicio
            <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>

          <label>
            Fecha objetivo
            <input onChange={(event) => setTargetDate(event.target.value)} type="date" value={targetDate} />
          </label>

          <label>
            Progreso
            <select
              onChange={(event) => setProgressMode(event.target.value as ProjectProgressMode)}
              value={progressMode}
            >
              <option value="automatic">Automático</option>
              <option value="manual">Manual</option>
            </select>
          </label>

          {progressMode === 'manual' ? (
            <label>
              Porcentaje
              <input
                max={100}
                min={0}
                onChange={(event) => setManualProgress(event.target.value)}
                type="number"
                value={manualProgress}
              />
            </label>
          ) : (
            <div className="automatic-progress-note">
              El progreso automático permanecerá en 0% hasta conectar tareas e hitos.
            </div>
          )}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="project-form-actions">
          <Link className="secondary-button project-action-link" to={projectId ? `/projects/${projectId}` : '/projects'}>
            Cancelar
          </Link>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </main>
  )
}
