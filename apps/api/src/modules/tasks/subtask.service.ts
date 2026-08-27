import type { DatabaseConnection } from '@project-manager/database'
import type { ReorderSubtasksInput } from '@project-manager/schemas'

import { mapTask } from './task.mapper.js'
import {
  addTaskActivity,
  findSubtaskById,
  findTaskById,
  listSubtasks,
} from './task.repository.js'
import {
  deleteOwnedSubtask,
  replaceOwnedSubtaskOrder,
} from './subtask.repository.js'

export class SubtaskNotFoundError extends Error {}
export class SubtaskValidationError extends Error {}

async function requireRootTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await findTaskById(database, userId, taskId)

  if (!task) {
    throw new SubtaskNotFoundError('Tarea no encontrada.')
  }

  if (task.parentTaskId) {
    throw new SubtaskValidationError(
      'No se permiten subtareas dentro de otra subtarea.',
    )
  }

  return task
}

export async function deleteSubtask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  subtaskId: string,
) {
  const parent = await requireRootTask(database, userId, taskId)
  const existing = await findSubtaskById(
    database,
    userId,
    parent.id,
    subtaskId,
  )

  if (!existing) {
    throw new SubtaskNotFoundError('Subtarea no encontrada.')
  }

  const deleted = await deleteOwnedSubtask(
    database,
    userId,
    parent.id,
    existing.id,
  )

  if (!deleted) {
    throw new SubtaskNotFoundError('Subtarea no encontrada.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: parent.id,
    projectId: parent.projectId,
    milestoneId: parent.milestoneId,
    action: 'subtask.deleted',
    metadata: {
      subtaskId: deleted.id,
      title: deleted.title,
      status: deleted.status,
    },
  })

  return deleted.id
}

export async function reorderSubtasks(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  input: ReorderSubtasksInput,
) {
  const parent = await requireRootTask(database, userId, taskId)
  const current = await listSubtasks(database, userId, parent.id)
  const currentIds = new Set(current.map((subtask) => subtask.id))

  const isExactSet =
    current.length === input.subtaskIds.length &&
    input.subtaskIds.every((subtaskId) => currentIds.has(subtaskId))

  if (!isExactSet) {
    throw new SubtaskValidationError(
      'El nuevo orden debe incluir exactamente todas las subtareas de la tarea.',
    )
  }

  const reordered = await replaceOwnedSubtaskOrder(
    database,
    userId,
    parent.id,
    input.subtaskIds,
  )

  await addTaskActivity(database, {
    userId,
    taskId: parent.id,
    projectId: parent.projectId,
    milestoneId: parent.milestoneId,
    action: 'subtask.reordered',
    metadata: {
      subtaskIds: input.subtaskIds,
    },
  })

  return reordered.map((subtask) => mapTask(subtask))
}
