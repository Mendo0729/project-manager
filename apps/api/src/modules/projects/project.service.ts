import type {
  CreateProjectInput,
  ProjectFilters,
  UpdateProjectInput,
} from '@project-manager/schemas'
import type { DatabaseConnection } from '@project-manager/database'

import { mapProject } from './project.mapper.js'
import {
  addProjectActivity,
  findProjectById,
  insertProject,
  listProjects,
  updateProjectById,
} from './project.repository.js'

export class ProjectNotFoundError extends Error {}
export class ProjectValidationError extends Error {}

function validateDates(startDate: string | null, targetDate: string | null) {
  if (startDate && targetDate && targetDate < startDate) {
    throw new ProjectValidationError(
      'La fecha objetivo no puede ser anterior a la fecha de inicio.',
    )
  }
}

export async function getProjects(
  database: DatabaseConnection,
  userId: string,
  filters: ProjectFilters,
) {
  const rows = await listProjects(database, userId, filters)
  return rows.map(mapProject)
}

export async function getProject(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
) {
  const project = await findProjectById(database, userId, projectId)

  if (!project) {
    throw new ProjectNotFoundError('Proyecto no encontrado.')
  }

  return mapProject(project)
}

export async function createProject(
  database: DatabaseConnection,
  userId: string,
  input: CreateProjectInput,
) {
  const status = input.status ?? 'planned'
  const progressMode = input.progressMode ?? 'automatic'
  const startDate = input.startDate ?? null
  const targetDate = input.targetDate ?? null

  validateDates(startDate, targetDate)

  const now = new Date()
  const project = await insertProject(database, {
    userId,
    name: input.name,
    description: input.description ?? null,
    status,
    priority: input.priority ?? 'medium',
    startDate,
    targetDate,
    progressMode,
    manualProgress:
      progressMode === 'manual' ? (input.manualProgress ?? 0) : null,
    completedAt: status === 'completed' ? now : null,
    archivedAt: status === 'archived' ? now : null,
  })

  if (!project) {
    throw new Error('No se pudo crear el proyecto.')
  }

  await addProjectActivity(database, {
    userId,
    projectId: project.id,
    action: 'project.created',
    metadata: {
      status: project.status,
      priority: project.priority,
    },
  })

  return mapProject(project)
}

export async function updateProject(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  const existing = await findProjectById(database, userId, projectId)

  if (!existing) {
    throw new ProjectNotFoundError('Proyecto no encontrado.')
  }

  const status = input.status ?? existing.status
  const progressMode = input.progressMode ?? existing.progressMode
  const startDate =
    input.startDate !== undefined ? input.startDate : existing.startDate
  const targetDate =
    input.targetDate !== undefined ? input.targetDate : existing.targetDate

  validateDates(startDate, targetDate)

  const manualProgress =
    progressMode === 'automatic'
      ? null
      : input.manualProgress !== undefined
        ? input.manualProgress
        : existing.progressMode === 'manual'
          ? (existing.manualProgress ?? 0)
          : 0

  const now = new Date()
  const updated = await updateProjectById(database, userId, projectId, {
    name: input.name ?? existing.name,
    description:
      input.description !== undefined
        ? input.description
        : existing.description,
    status,
    priority: input.priority ?? existing.priority,
    startDate,
    targetDate,
    progressMode,
    manualProgress,
    completedAt:
      status === 'completed' ? (existing.completedAt ?? now) : null,
    archivedAt:
      status === 'archived' ? (existing.archivedAt ?? now) : null,
    updatedAt: now,
  })

  if (!updated) {
    throw new ProjectNotFoundError('Proyecto no encontrado.')
  }

  let action = 'project.updated'
  if (existing.status !== status) {
    if (status === 'archived') {
      action = 'project.archived'
    } else if (existing.status === 'archived') {
      action = 'project.restored'
    } else {
      action = 'project.status_changed'
    }
  }

  await addProjectActivity(database, {
    userId,
    projectId,
    action,
    metadata: {
      fromStatus: existing.status,
      toStatus: updated.status,
    },
  })

  return mapProject(updated)
}
