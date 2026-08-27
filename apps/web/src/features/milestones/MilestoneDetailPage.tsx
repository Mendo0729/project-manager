import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { MilestoneDto, MilestoneStatus } from '@project-manager/schemas'

import { getMilestone, updateMilestone } from './milestones-api'

const statusLabels: Record<MilestoneStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  completed: 'Completado',
  canceled: 'Cancelado',
}

export function MilestoneDetailPage() {
  const { projectId, milestoneId } = useParams()
  const [milestone, setMilestone] = useState<MilestoneDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !milestoneId) {
      setLoading(false)
      return
    }

    let active = true
    getMilestone(projectId, milestoneId)
      .then((item) => {
        if (active) setMilestone(item)
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

  async function changeStatus(status: MilestoneStatus) {
    if (!projectId || !milestoneId) return

    setUpdating(true)
    setError(null)

    try {
      const updated = await updateMilestone(projectId, milestoneId, { status })
      setMilestone(updated)
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo actualizar el hito.',
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="content-loading">Cargando hito…</div>
  }

  if (!milestone || !projectId) {
    return (
      <section className="project-form-shell">
        <p className="form-error">{error ?? 'Hito no encontrado.'}</p>
        <Link className="project-back-link" to="/projects">
          ← Volver a proyectos
        </Link>
      </section>
    )
  }

  return (
    <section className="project-detail-shell">
      <div className="project-detail-header">
        <div>
          <Link className="project-back-link" to={`/projects/${projectId}`}>
            ← Proyecto
          </Link>
          <span className={`status-badge ${milestone.status}`}>
            {statusLabels[milestone.status]}
          </span>
          <h1>{milestone.name}</h1>
          <p>{milestone.description || 'Sin descripción.'}</p>
        </div>
        <Link
          className="primary-button project-action-link"
          to={`/projects/${projectId}/milestones/${milestone.id}/edit`}
        >
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
              <dd>{statusLabels[milestone.status]}</dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{milestone.weight}</dd>
            </div>
            <div>
              <dt>Fecha objetivo</dt>
              <dd>{milestone.targetDate ?? 'Sin fecha'}</dd>
            </div>
            <div>
              <dt>Posición</dt>
              <dd>{milestone.position + 1}</dd>
            </div>
            <div>
              <dt>Completado</dt>
              <dd>
                {milestone.completedAt
                  ? new Date(milestone.completedAt).toLocaleString('es-PA')
                  : 'No'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="panel project-progress-card">
          <span className="panel-label">Progreso del hito</span>
          <strong>{milestone.progress}%</strong>
          <div className="progress-track">
            <span style={{ width: `${milestone.progress}%` }} />
          </div>
          <p>
            En la Fase 4 el hito aporta 100% al completarse. En la Fase 5 su progreso podrá calcularse a partir de tareas.
          </p>
        </article>
      </section>

      <section className="panel project-status-actions">
        <div>
          <span className="panel-label">Estado del hito</span>
          <h2>Acciones</h2>
        </div>
        <div className="project-action-group">
          {milestone.status === 'completed' || milestone.status === 'canceled' ? (
            <button
              className="secondary-button"
              disabled={updating}
              onClick={() => void changeStatus('active')}
              type="button"
            >
              Reabrir
            </button>
          ) : (
            <>
              {milestone.status !== 'active' ? (
                <button
                  className="secondary-button"
                  disabled={updating}
                  onClick={() => void changeStatus('active')}
                  type="button"
                >
                  Activar
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
                Cancelar hito
              </button>
            </>
          )}
        </div>
      </section>

      <section className="project-future-grid">
        <article className="panel project-placeholder-card">
          <span className="panel-label">Tareas</span>
          <h2>Próximamente</h2>
          <p>Las tareas vinculadas a este hito se implementarán en la Fase 5.</p>
        </article>
      </section>
    </section>
  )
}
