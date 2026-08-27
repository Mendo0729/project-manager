import type { DatabaseConnection } from '@project-manager/database'
import type {
  CreateMilestoneInput,
  MilestoneFilters,
  ReorderMilestonesInput,
  UpdateMilestoneInput,
} from '@project-manager/schemas'

import { findProjectById } from '../projects/project.repository.js'
import { mapMilestone } from './milestone.mapper.js'
import {
  addMilestoneActivity,
  findMilestoneById,
  getNextMilestonePosition,
  insertMilestone,
  listMilestonesByProject,
  replaceMilestoneOrder,
  updateMilestoneById,
} from './milestone.repository.js'

export class MilestoneNotFoundError extends Error {}
export class MilestoneValidationError extends Error {}

async function requireOwnedProject(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
) {
  const project = await findProjectById(database, userId, projectId)

  if (!project) {
    throw new MilestoneNotFoundError('Proyecto no encontrado.')
  }

  return project
}

async function requireMilestone(
  database: DatabaseConnection,
  projectId: string,
  milestoneId: string,
) {
  const milestone = await findMilestoneById(database, projectId, milestoneId)

  if (!milestone) {
    throw new MilestoneNotFoundError('Hito no encontrado.')
  }

  return milestone
}

export async function getMilestones(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  filters: MilestoneFilters,
) {
  await requireOwnedProject(database, userId, projectId)
  const rows = await listMilestonesByProject(database, projectId, filters)
  return rows.map(mapMilestone)
}

export async function getMilestone(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  milestoneId: string,
) {
  await requireOwnedProject(database, userId, projectId)
  const milestone = await requireMilestone(database, projectId, milestoneId)
  return mapMilestone(milestone)
}

export async function createMilestone(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  input: CreateMilestoneInput,
) {
  await requireOwnedProject(database, userId, projectId)

  const status = input.status ?? 'planned'
  const position = await getNextMilestonePosition(database, projectId)
  const now = new Date()

  const milestone = await insertMilestone(database, {
    projectId,
    name: input.name,
    description: input.description ?? null,
    status,
    weight: input.weight ?? 1,
    targetDate: input.targetDate ?? null,
    position,
    completedAt: status === 'completed' ? now : null,
  })

  if (!milestone) {
    throw new Error('No se pudo crear el hito.')
  }

  await addMilestoneActivity(database, {
    userId,
    projectId,
    milestoneId: milestone.id,
    action: 'milestone.created',
    metadata: {
      status: milestone.status,
      weight: milestone.weight,
      position: milestone.position,
    },
  })

  return mapMilestone(milestone)
}

export async function updateMilestone(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
) {
  await requireOwnedProject(database, userId, projectId)
  const existing = await requireMilestone(database, projectId, milestoneId)

  const status = input.status ?? existing.status
  const now = new Date()

  const updated = await updateMilestoneById(
    database,
    projectId,
    milestoneId,
    {
      name: input.name ?? existing.name,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      status,
      weight: input.weight ?? existing.weight,
      targetDate:
        input.targetDate !== undefined ? input.targetDate : existing.targetDate,
      completedAt:
        status === 'completed' ? (existing.completedAt ?? now) : null,
      updatedAt: now,
    },
  )

  if (!updated) {
    throw new MilestoneNotFoundError('Hito no encontrado.')
  }

  let action = 'milestone.updated'

  if (existing.status !== status) {
    if (status === 'completed') {
      action = 'milestone.completed'
    } else if (status === 'canceled') {
      action = 'milestone.canceled'
    } else if (
      (existing.status === 'completed' || existing.status === 'canceled') &&
      (status === 'planned' || status === 'active')
    ) {
      action = 'milestone.reopened'
    } else {
      action = 'milestone.status_changed'
    }
  }

  await addMilestoneActivity(database, {
    userId,
    projectId,
    milestoneId,
    action,
    metadata: {
      fromStatus: existing.status,
      toStatus: updated.status,
      weight: updated.weight,
    },
  })

  return mapMilestone(updated)
}

export async function reorderMilestones(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  input: ReorderMilestonesInput,
) {
  await requireOwnedProject(database, userId, projectId)

  const existing = await listMilestonesByProject(database, projectId)
  const existingIds = new Set(existing.map((milestone) => milestone.id))

  if (
    existing.length !== input.milestoneIds.length ||
    input.milestoneIds.some((milestoneId) => !existingIds.has(milestoneId))
  ) {
    throw new MilestoneValidationError(
      'La lista de orden debe contener exactamente todos los hitos del proyecto.',
    )
  }

  const oldPositions = new Map(
    existing.map((milestone) => [milestone.id, milestone.position]),
  )

  await replaceMilestoneOrder(database, projectId, input.milestoneIds)

  for (const [position, milestoneId] of input.milestoneIds.entries()) {
    const fromPosition = oldPositions.get(milestoneId)

    if (fromPosition !== position) {
      await addMilestoneActivity(database, {
        userId,
        projectId,
        milestoneId,
        action: 'milestone.reordered',
        metadata: { fromPosition, toPosition: position },
      })
    }
  }

  const reordered = await listMilestonesByProject(database, projectId)
  return reordered.map(mapMilestone)
}
