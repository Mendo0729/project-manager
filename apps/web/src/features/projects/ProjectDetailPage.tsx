import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ProjectDto, ProjectStatus } from '@project-manager/schemas'

import { getProject, updateProject } from './projects-api'

const statusLabels: Record<ProjectStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Completado',
  archived: 'Archivado',
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return

    let active = true
    getProject(projectId)
      .then((item) => {
        if (active) setProject(item)
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

  async function changeStatus(status: ProjectStatus) {
    if (!projectId) return
    setUpdating(true)
    setError(null)

    try {
      const updated = await updateProject(projectId, { status })
      setProject(updated)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'No se pudo actualizar el proyecto.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <main className="auth-loading">Cargando proyecto…</main>
  }

  if (!project) {
    return (
      <main className="project-form-shell">
        <p className="form-error">{error ?? 'Proyecto no encontrado.'}</p>
        <Link className="text-button project-back-link" to="/projects">Volver a proyectos</Link>
      </main>
    )
  }

  return (
    <main className="project-detail-shell">
      <div className="project-detail-header">
        <div>
          <Link className="text-button project-back-link" to="/projects">← Proyectos</Link>
          <span className="page-kicker">{statusLabels[project.status]}</span>
          <h1>{project.name}</h1>
          <p>{project.description || 'Sin descripción.'}</p>
        </div>
        <Link className="primary-button project-action-link" to={`/projects/${project.id}/edit`}>
          Editar
        </Link>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="project-detail-grid">
        <article className="panel project-detail-card">
          <span className="panel-label">Información</span>
          <dl className="project-data-list">
            <div><dt>Estado</dt><dd>{statusLabels[project.status]}</dd></div>
            <div><dt>Prioridad</dt><dd>{project.priority}</dd></div>
            <div><dt>Inicio</dt><dd>{project.startDate ?? 'Sin fecha'}</dd></div>
            <div><dt>Objetivo</dt><dd>{project.targetDate ?? 'Sin fecha'}</dd></div>
            <div><dt>Modo de progreso</dt><dd>{project.progressMode === 'manual' ? 'Manual' : 'Automático'}</dd></div>
          </dl>
        </article>

        <article className="panel project-progress-card">
          <span className="panel-label">Progreso</span>
          <strong>{project.progress}%</strong>
          <div className="progress-track">
            <span style={{ width: `${project.progress}%` }} />
          </div>
          {project.progressMode === 'automatic' ? (
            <p>Se calculará automáticamente cuando conectemos tareas e hitos.</p>
          ) : null}
        </article>
      </section>

      <section className="panel project-status-actions">
        <div>
          <span className="panel-label">Estado del proyecto</span>
          <h2>Acciones</h2>
        </div>
        <div className="project-action-group">
          {project.status === 'archived' ? (
            <button className="secondary-button" disabled={updating} onClick={() => void changeStatus('active')} type="button">
              Restaurar
            </button>
          ) : (
            <>
              <button className="secondary-button" disabled={updating} onClick={() => void changeStatus('active')} type="button">Activar</button>
              <button className="secondary-button" disabled={updating} onClick={() => void changeStatus('paused')} type="button">Pausar</button>
              <button className="secondary-button" disabled={updating} onClick={() => void changeStatus('completed')} type="button">Completar</button>
              <button className="secondary-button" disabled={updating} onClick={() => void changeStatus('archived')} type="button">Archivar</button>
            </>
          )}
        </div>
      </section>

      <section className="project-future-grid">
        <article className="panel project-placeholder-card">
          <span className="panel-label">Hitos</span>
          <h2>Próximamente</h2>
          <p>Se conectará en la Fase 4.</p>
        </article>
        <article className="panel project-placeholder-card">
          <span className="panel-label">Tareas</span>
          <h2>Próximamente</h2>
          <p>Se conectará en la Fase 5.</p>
        </article>
      </section>
    </main>
  )
}
