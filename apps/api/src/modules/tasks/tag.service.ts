import type { DatabaseConnection } from '@project-manager/database'
import type { CreateTagInput, TagDto } from '@project-manager/schemas'

import { addTaskActivity, findTaskById } from './task.repository.js'
import {
  deleteTaskTag,
  findOwnedTagById,
  findTaskTag,
  insertTag,
  insertTaskTag,
  listOwnedTags,
  listOwnedTaskTags,
  type TagRow,
} from './tag.repository.js'

export class TagNotFoundError extends Error {}
export class TagConflictError extends Error {}

function mapTag(tag: TagRow): TagDto {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  }
}

function isUniqueViolation(error: unknown) {
  const candidate = error as {
    code?: unknown
    cause?: { code?: unknown }
  }

  return candidate?.code === '23505' || candidate?.cause?.code === '23505'
}

async function requireTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await findTaskById(database, userId, taskId)

  if (!task) {
    throw new TagNotFoundError('Tarea no encontrada.')
  }

  return task
}

async function requireTag(
  database: DatabaseConnection,
  userId: string,
  tagId: string,
) {
  const tag = await findOwnedTagById(database, userId, tagId)

  if (!tag) {
    throw new TagNotFoundError('Etiqueta no encontrada.')
  }

  return tag
}

export async function getTags(
  database: DatabaseConnection,
  userId: string,
) {
  const rows = await listOwnedTags(database, userId)
  return rows.map(mapTag)
}

export async function createTag(
  database: DatabaseConnection,
  userId: string,
  input: CreateTagInput,
) {
  try {
    const tag = await insertTag(database, {
      userId,
      name: input.name,
      color: input.color ?? null,
    })

    if (!tag) {
      throw new Error('No se pudo crear la etiqueta.')
    }

    return mapTag(tag)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TagConflictError('Ya existe una etiqueta con ese nombre.')
    }

    throw error
  }
}

export async function getTaskTags(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  await requireTask(database, userId, taskId)
  const rows = await listOwnedTaskTags(database, userId, taskId)
  return rows.map(mapTag)
}

export async function assignTaskTag(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  tagId: string,
) {
  const task = await requireTask(database, userId, taskId)
  const tag = await requireTag(database, userId, tagId)
  const existing = await findTaskTag(database, task.id, tag.id)

  if (existing) {
    return { tag: mapTag(tag), added: false }
  }

  const inserted = await insertTaskTag(database, task.id, tag.id)

  if (!inserted) {
    return { tag: mapTag(tag), added: false }
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'task.tag_added',
    metadata: {
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
    },
  })

  return { tag: mapTag(tag), added: true }
}

export async function removeTaskTag(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  tagId: string,
) {
  const task = await requireTask(database, userId, taskId)
  const tag = await requireTag(database, userId, tagId)
  const existing = await findTaskTag(database, task.id, tag.id)

  if (!existing) {
    throw new TagNotFoundError('La etiqueta no está asignada a esta tarea.')
  }

  const deleted = await deleteTaskTag(database, task.id, tag.id)

  if (!deleted) {
    throw new TagNotFoundError('La etiqueta no está asignada a esta tarea.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'task.tag_removed',
    metadata: {
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
    },
  })

  return tag.id
}
