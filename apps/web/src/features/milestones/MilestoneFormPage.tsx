import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { MilestoneStatus } from '@project-manager/schemas'

import {
  createMilestone,
  getMilestone,
  updateMilestone,
} from './milestones-api'

export function MilestoneFormPage() {
  const { projectId, milestoneId } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(milestoneId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<MilestoneStatus>('planned')
  const [weight, setWeight] = useState('1')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(editing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !milestoneId) return

    let active = true
    getMilestone(projectId, milestoneId)
      .then((milestone) => {
        if (!active) return
        setName(milestone.name)
        setDescription(milestone.description ?? '')
        setStatus(milestone.status)
        setWeight(String(milestone.weight))
        setTargetDate(milestone.targetDate ?? '')
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el hito.',
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!projectId) {
      setError('Proyecto inválido.')
      return
    }

    setError(null)
    setSubmitting(true)

    const payload = {
      name,
      description: description.trim() || null,
      status,
      weight: Number.parseInt(weight || '1', 10),
      targetDate: targetDate || null,
    }

    try {
      const milestone = milestoneId
        ? await updateMilestone(projectId, milestoneId, payload)
        : await createMilestone(projectId, payload)

      navigate(`/projects/${projectId}/milestones/${milestone.id}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo guardar el hito.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="content-loading">Cargando hito…</div>
  }

  const cancelTo =
    projectId && milestoneId
      ? `/projects/${projectId}/milestones/${milestoneId}`
      : projectId
        ? `/projects/${projectId}`
        : '/projects'

  return (
    <section className="project-form-shell">
      <div className="project-form-header">
        <div>
          <Link className="project-back-link" to={cancelTo}>
            ← Volver
          </Link>
          <span className="page-kicker">{editing ? 'Editar hito' : 'Nuevo hito'}</span>
          <h1>{editing ? 'Actualiza el hito' : 'Crea un hito'}</h1>
        </div>
      </div>

      <form className="panel project-form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            maxLength={180}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
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
              onChange={(event) => setStatus(event.target.value as MilestoneStatus)}
              value={status}
            >
              <option value="planned">Planificado</option>
              <option value="active">Activo</option>
              {editing ? <option value="completed">Completado</option> : null}
              {editing ? <option value="canceled">Cancelado</option> : null}
            </select>
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

          <label>
            Fecha objetivo
            <input
              onChange={(event) => setTargetDate(event.target.value)}
              type="date"
              value={targetDate}
            />
          </label>
        </div>

        <div className="automatic-progress-note">
          Un hito completado aporta 100% de su peso al progreso automático del proyecto. Los hitos cancelados no se contabilizan.
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="project-form-actions">
          <Link className="secondary-button project-action-link" to={cancelTo}>
            Cancelar
          </Link>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting
              ? 'Guardando…'
              : editing
                ? 'Guardar cambios'
                : 'Crear hito'}
          </button>
        </div>
      </form>
    </section>
  )
}
