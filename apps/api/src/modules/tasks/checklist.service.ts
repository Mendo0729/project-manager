import type { DatabaseConnection } from '@project-manager/database'
import type {
  CreateChecklistItemInput,
  ReorderChecklistInput,
  UpdateChecklistItemInput,
} from '@project-manager/schemas'

import { mapChecklistItem } from './task.mapper.js'
import {
  addTaskActivity,
  deleteChecklistItemById,
  findChecklistItemById,
  findTaskById,
  getNextChecklistPosition,
  insertChecklistItem,
  listChecklistItems,
  replaceChecklistOrder,
  updateChecklistItemById,
} from './task.repository.js'

export class ChecklistNotFoundError extends Error {}
export class ChecklistValidationError extends Error {}

async function requireTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await findTaskById(database, userId, taskId)

  if (!task) {
    throw new ChecklistNotFoundError('Tarea no encontrada.')
  }

  return task
}

export async function getChecklist(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  await requireTask(database, userId, taskId)
  const items = await listChecklistItems(database, userId, taskId)
  return items.map(mapChecklistItem)
}

export async function createChecklistItem(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  input: CreateChecklistItemInput,
) {
  const task = await requireTask(database, userId, taskId)
  const position = await getNextChecklistPosition(database, userId, task.id)

  const item = await insertChecklistItem(database, {
    taskId: task.id,
    title: input.title,
    isCompleted: false,
    position,
  })

  if (!item) {
    throw new Error('No se pudo crear el elemento del checklist.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'checklist.created',
    metadata: {
      checklistItemId: item.id,
      title: item.title,
      position: item.position,
    },
  })

  return mapChecklistItem(item)
}

export async function updateChecklistItem(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemId: string,
  input: UpdateChecklistItemInput,
) {
  const task = await requireTask(database, userId, taskId)
  const existing = await findChecklistItemById(
    database,
    userId,
    task.id,
    itemId,
  )

  if (!existing) {
    throw new ChecklistNotFoundError('Elemento de checklist no encontrado.')
  }

  const updated = await updateChecklistItemById(
    database,
    userId,
    task.id,
    itemId,
    {
      title: input.title ?? existing.title,
      isCompleted: input.isCompleted ?? existing.isCompleted,
      updatedAt: new Date(),
    },
  )

  if (!updated) {
    throw new ChecklistNotFoundError('Elemento de checklist no encontrado.')
  }

  let action = 'checklist.updated'
  if (updated.isCompleted !== existing.isCompleted) {
    action = updated.isCompleted ? 'checklist.completed' : 'checklist.reopened'
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action,
    metadata: {
      checklistItemId: updated.id,
      fromCompleted: existing.isCompleted,
      toCompleted: updated.isCompleted,
      fromTitle: existing.title,
      toTitle: updated.title,
    },
  })

  return mapChecklistItem(updated)
}

export async function deleteChecklistItem(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemId: string,
) {
  const task = await requireTask(database, userId, taskId)
  const existing = await findChecklistItemById(
    database,
    userId,
    task.id,
    itemId,
  )

  if (!existing) {
    throw new ChecklistNotFoundError('Elemento de checklist no encontrado.')
  }

  const deleted = await deleteChecklistItemById(
    database,
    userId,
    task.id,
    itemId,
  )

  if (!deleted) {
    throw new ChecklistNotFoundError('Elemento de checklist no encontrado.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'checklist.deleted',
    metadata: {
      checklistItemId: deleted.id,
      title: deleted.title,
      wasCompleted: deleted.isCompleted,
    },
  })

  return deleted.id
}

export async function reorderChecklist(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  input: ReorderChecklistInput,
) {
  const task = await requireTask(database, userId, taskId)

  for (const itemId of input.itemIds) {
    const item = await findChecklistItemById(
      database,
      userId,
      task.id,
      itemId,
    )

    if (!item) {
      throw new ChecklistNotFoundError('Elemento de checklist no encontrado.')
    }
  }

  const current = await listChecklistItems(database, userId, task.id)
  const currentIds = new Set(current.map((item) => item.id))
  const isExactSet =
    current.length === input.itemIds.length &&
    input.itemIds.every((itemId) => currentIds.has(itemId))

  if (!isExactSet) {
    throw new ChecklistValidationError(
      'El nuevo orden debe incluir exactamente todos los elementos del checklist.',
    )
  }

  await replaceChecklistOrder(database, userId, task.id, input.itemIds)

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'checklist.reordered',
    metadata: {
      itemIds: input.itemIds,
    },
  })

  const reordered = await listChecklistItems(database, userId, task.id)
  return reordered.map(mapChecklistItem)
}
