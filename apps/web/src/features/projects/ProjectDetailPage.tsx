import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  MilestoneDto,
  MilestoneStatus,
  ProjectDto,
  ProjectStatus,
} from '@project-manager/schemas'

import {
  listMilestones,
  reorderMilestones,
} from '../milestones/milestones-api'
import { getProject, updateProject } from './projects-api'

const statusLabels: Record<ProjectStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
}

const milestoneStatusLabels: Record<MilestoneStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  completed: 'Completado',
  canceled: 'Cancelado',
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    let active = true

    Promise.all([getProject(projectId), listMilestones(projectId)])
      .then(([projectItem, milestoneItems]) => {
        if (!active) return
        setProject(projectItem)
        setMilestones(milestoneItems)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar el proyecto.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId])

  async function changeStatus(status: ProjectStatus) {
    if (!projectId) return
    setUpdating(true)
    setError(null)

    try {
      const updated = await updateProject(projectId, { status })
      setProject(updated)
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'No se pudo actualizar el proyecto.',
      )
    } finally {
      setUpdating(false)
    }
  }

  async function moveMilestone(index: number, direction: -1 | 1) {
    if (!projectId) return

    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= milestones.length) return

    const next = [...milestones]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)

    setReordering(true)
    setError(null)

    try {
      const reordered = await reorderMilestones(projectId, {
        milestoneIds: next.map((milestone) => milestone.id),
      })
      setMilestones(reordered)
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : 'No se pudo reordenar los hitos.',
      )
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return <div className="content-loading">Cargando proyecto…</div>
  }

  if (!project) {
    return (
      <section className="project-form-shell">
        <p className="form-error">{error ?? 'Proyecto no encontrado.'}</p>
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
          <Link className="project-back-link" to="/projects">
            ← Proyectos
          </Link>
          <span className={`status-badge ${project.status}`}>
            {statusLabels[project.status]}
          </span>
          <h1>{project.name}</h1>
          <p>{project.description || 'Sin descripción.'}</p>
        </div>
        <Link
          className="primary-button project-action-link"
          to={`/projects/${project.id}/edit`}
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
              <dd>{statusLabels[project.status]}</dd>
            </div>
            <div>
              <dt>Prioridad</dt>
              <dd>{project.priority}</dd>
            </div>
            <div>
              <dt>Inicio</dt>
              <dd>{project.startDate ?? 'Sin fecha'}</dd>
            </div>
            <div>
              <dt>Objetivo</dt>
              <dd>{project.targetDate ?? 'Sin fecha'}</dd>
            </div>
            <div>
              <dt>Modo de progreso</dt>
              <dd>{project.progressMode === 'manual' ? 'Manual' : 'Automático'}</dd>
            </div>
          </dl>
        </article>

        <article className="panel project-progress-card">
          <span className="panel-label">Progreso</span>
          <strong>{project.progress}%</strong>
          <div className="progress-track">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          {project.progressMode === 'automatic' ? (
            <p>Calculado automáticamente según los hitos no cancelados y su peso.</p>
          ) : (
            <p>Este proyecto utiliza progreso manual.</p>
          )}
        </article>
      </section>

      <section className="panel project-status-actions">
        <div>
          <span className="panel-label">Estado del proyecto</span>
          <h2>Acciones</h2>
        </div>
        <div className="project-action-group">
          {project.status === 'archived' ? (
            <button
              className="secondary-button"
              disabled={updating}
              onClick={() => void changeStatus('active')}
              type="button"
            >
              Restaurar
            </button>
          ) : (
            <>
              <button
                className="secondary-button"
                disabled={updating}
                onClick={() => void changeStatus('active')}
                type="button"
              >
                Activar
              </button>
              <button
                className="secondary-button"
                disabled={updating}
                onClick={() => void changeStatus('paused')}
                type="button"
              >
                Pausar
              </button>
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
                onClick={() => void changeStatus('archived')}
                type="button"
              >
                Archivar
              </button>
            </>
          )}
        </div>
      </section>

      <section className="panel milestone-section">
        <div className="milestone-section-header">
          <div>
            <span className="panel-label">Hitos</span>
            <h2>Objetivos del proyecto</h2>
          </div>
          <Link
            className="primary-button project-action-link"
            to={`/projects/${project.id}/milestones/new`}
          >
            + Nuevo hito
          </Link>
        </div>

        {milestones.length === 0 ? (
          <div className="milestone-empty">
            <strong>Aún no hay hitos.</strong>
            <span>
              Crea el primero para estructurar el proyecto y calcular su progreso automático.
            </span>
          </div>
        ) : (
          <div className="milestone-list">
            {milestones.map((milestone, index) => (
              <div className="milestone-row" key={milestone.id}>
                <Link
                  className="milestone-main-link"
                  to={`/projects/${project.id}/milestones/${milestone.id}`}
                >
                  <span className="milestone-position">{index + 1}</span>
                  <div className="milestone-row-content">
                    <div className="milestone-title-row">
                      <div>
                        <strong>{milestone.name}</strong>
                        <span>
                          Peso {milestone.weight}
                          {milestone.targetDate ? ` · Objetivo ${milestone.targetDate}` : ''}
                        </span>
                      </div>
                      <span className={`milestone-status ${milestone.status}`}>
                        {milestoneStatusLabels[milestone.status]}
                      </span>
                    </div>
                    <div className="milestone-progress-row">
                      <div className="progress-track">
                        <span style={{ width: `${milestone.progress}%` }} />
                      </div>
                      <strong>{milestone.progress}%</strong>
                    </div>
                  </div>
                </Link>

                <div className="milestone-order-actions">
                  <button
                    aria-label={`Subir ${milestone.name}`}
                    className="secondary-button milestone-order-button"
                    disabled={reordering || index === 0}
                    onClick={() => void moveMilestone(index, -1)}
                    type="button"
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Bajar ${milestone.name}`}
                    className="secondary-button milestone-order-button"
                    disabled={reordering || index === milestones.length - 1}
                    onClick={() => void moveMilestone(index, 1)}
                    type="button"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="project-future-grid">
        <article className="panel project-placeholder-card">
          <span className="panel-label">Tareas</span>
          <h2>Próximamente</h2>
          <p>Las tareas se conectarán en la Fase 5.</p>
        </article>
      </section>
    </section>
  )
}
