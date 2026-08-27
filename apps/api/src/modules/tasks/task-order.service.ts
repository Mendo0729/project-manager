import type { DatabaseConnection } from '@project-manager/database'
import type { ReorderTasksInput } from '@project-manager/schemas'

import {
  addTaskActivity,
  findTaskById,
  listTasksByScope,
  replaceTaskOrder,
  type TaskScope,
} from './task.repository.js'

export class TaskOrderNotFoundError extends Error {}
export class TaskOrderValidationError extends Error {}

function sameScope(
  task: {
    projectId: string | null
    milestoneId: string | null
    parentTaskId: string | null
  },
  scope: TaskScope,
) {
  return (
    task.projectId === scope.projectId &&
    task.milestoneId === scope.milestoneId &&
    task.parentTaskId === scope.parentTaskId
  )
}

export async function reorderTasks(
  database: DatabaseConnection,
  userId: string,
  input: ReorderTasksInput,
) {
  const firstTaskId = input.taskIds[0]
  if (!firstTaskId) {
    throw new TaskOrderValidationError('Debes enviar al menos una tarea.')
  }

  const firstTask = await findTaskById(database, userId, firstTaskId)
  if (!firstTask) {
    throw new TaskOrderNotFoundError('Tarea no encontrada.')
  }

  if (firstTask.parentTaskId) {
    throw new TaskOrderValidationError(
      'Las subtareas deben ordenarse desde su tarea padre.',
    )
  }

  const scope: TaskScope = {
    projectId: firstTask.projectId,
    milestoneId: firstTask.milestoneId,
    parentTaskId: null,
  }

  for (const taskId of input.taskIds) {
    const task = await findTaskById(database, userId, taskId)

    if (!task) {
      throw new TaskOrderNotFoundError('Tarea no encontrada.')
    }

    if (!sameScope(task, scope)) {
      throw new TaskOrderValidationError(
        'Todas las tareas del nuevo orden deben pertenecer al mismo contexto.',
      )
    }
  }

  const current = await listTasksByScope(database, userId, scope)
  const currentIds = new Set(current.map((task) => task.id))
  const isExactSet =
    current.length === input.taskIds.length &&
    input.taskIds.every((taskId) => currentIds.has(taskId))

  if (!isExactSet) {
    throw new TaskOrderValidationError(
      'El nuevo orden debe incluir exactamente todas las tareas del contexto.',
    )
  }

  await replaceTaskOrder(database, userId, scope, input.taskIds)

  await addTaskActivity(database, {
    userId,
    taskId: firstTask.id,
    projectId: firstTask.projectId,
    milestoneId: firstTask.milestoneId,
    action: 'task.reordered',
    metadata: {
      taskIds: input.taskIds,
      projectId: scope.projectId,
      milestoneId: scope.milestoneId,
    },
  })

  return input.taskIds
}
