import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type {
  MilestoneDto,
  ProjectDto,
  TaskPriority,
  TaskStatus,
} from '@project-manager/schemas'

import { listMilestones } from '../milestones/milestones-api'
import { listProjects } from '../projects/projects-api'
import { createTask, getTask, updateTask } from './tasks-api'

export function TaskFormPage() {
  const { taskId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editing = Boolean(taskId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [projectId, setProjectId] = useState(searchParams.get('projectId') ?? '')
  const [milestoneId, setMilestoneId] = useState(searchParams.get('milestoneId') ?? '')
  const [dueDate, setDueDate] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [weight, setWeight] = useState('1')
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [loading, setLoading] = useState(editing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    listProjects({ archived: 'false' })
      .then((items) => {
        if (active) setProjects(items)
      })
      .catch(() => {
        if (active) setProjects([])
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!taskId) return

    let active = true
    getTask(taskId)
      .then((task) => {
        if (!active) return
        setTitle(task.title)
        setDescription(task.description ?? '')
        setStatus(task.status)
        setPriority(task.priority)
        setProjectId(task.projectId ?? '')
        setMilestoneId(task.milestoneId ?? '')
        setDueDate(task.dueDate ?? '')
        setEstimatedMinutes(
          task.estimatedMinutes != null ? String(task.estimatedMinutes) : '',
        )
        setWeight(String(task.weight))
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

  useEffect(() => {
    if (!projectId) {
      setMilestones([])
      setMilestoneId('')
      return
    }

    let active = true
    listMilestones(projectId)
      .then((items) => {
        if (!active) return
        setMilestones(items)
        setMilestoneId((current) =>
          current && items.some((item) => item.id === current) ? current : '',
        )
      })
      .catch(() => {
        if (active) {
          setMilestones([])
          setMilestoneId('')
        }
      })

    return () => {
      active = false
    }
  }, [projectId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      title,
      description: description.trim() || null,
      status,
      priority,
      projectId: projectId || null,
      milestoneId: projectId && milestoneId ? milestoneId : null,
      dueDate: dueDate || null,
      estimatedMinutes:
        estimatedMinutes === '' ? null : Number.parseInt(estimatedMinutes, 10),
      weight: Number.parseInt(weight || '1', 10),
    }

    try {
      const task = taskId
        ? await updateTask(taskId, payload)
        : await createTask(payload)
      navigate(`/tasks/${task.id}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar la tarea.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="content-loading">Cargando tarea…</div>
  }

  const backTo = taskId
    ? `/tasks/${taskId}`
    : milestoneId && projectId
      ? `/projects/${projectId}/milestones/${milestoneId}`
      : projectId
        ? `/projects/${projectId}`
        : '/tasks'

  return (
    <section className="project-form-shell task-form-shell">
      <div className="project-form-header">
        <div>
          <Link className="project-back-link" to={backTo}>
            ← Volver
          </Link>
          <span className="page-kicker">
            {editing ? 'Editar tarea' : 'Nueva tarea'}
          </span>
          <h1>{editing ? 'Actualiza la tarea' : 'Crea una tarea'}</h1>
        </div>
      </div>

      <form className="panel project-form task-form" onSubmit={handleSubmit}>
        <label>
          Título
          <input
            maxLength={240}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>

        <label>
          Descripción
          <textarea
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            value={description}
          />
        </label>

        <div className="project-form-grid">
          <label>
            Estado
            <select
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              value={status}
            >
              <option value="backlog">Backlog</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En progreso</option>
              <option value="blocked">Bloqueada</option>
              <option value="completed">Completada</option>
              <option value="canceled">Cancelada</option>
            </select>
          </label>

          <label>
            Prioridad
            <select
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              value={priority}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </label>

          <label>
            Proyecto
            <select
              onChange={(event) => setProjectId(event.target.value)}
              value={projectId}
            >
              <option value="">Tarea personal</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hito
            <select
              disabled={!projectId}
              onChange={(event) => setMilestoneId(event.target.value)}
              value={milestoneId}
            >
              <option value="">Sin hito</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Fecha límite
            <input
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>

          <label>
            Tiempo estimado (min)
            <input
              min={0}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              type="number"
              value={estimatedMinutes}
            />
          </label>

          <label>
            Peso
            <input
              max={1000}
              min={1}
              onChange={(event) => setWeight(event.target.value)}
              required
              type="number"
              value={weight}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="project-form-actions">
          <Link className="secondary-button project-action-link" to={backTo}>
            Cancelar
          </Link>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </section>
  )
}
