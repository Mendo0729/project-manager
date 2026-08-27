import type { DatabaseConnection } from '@project-manager/database'
import type {
  CreateSubtaskInput,
  CreateTaskInput,
  TaskFilters,
  TaskStatus,
  UpdateSubtaskInput,
  UpdateTaskInput,
} from '@project-manager/schemas'

import {
  calculateTaskProgress,
  mapTask,
  mapTaskDetail,
} from './task.mapper.js'
import {
  listChecklistForProgress,
  listSubtasksForProgress,
} from './task-progress.repository.js'
import {
  addTaskActivity,
  findOwnedMilestoneContext,
  findOwnedProjectContext,
  findSubtaskById,
  findTaskById,
  getNextTaskPosition,
  insertTask,
  listChecklistItems,
  listSubtasks,
  listTasks,
  updateRootTaskWithInheritedContext,
  updateSubtaskById,
  type TaskRow,
  type TaskScope,
} from './task.repository.js'

export class TaskNotFoundError extends Error {}
export class TaskValidationError extends Error {}

async function requireOwnedProject(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
) {
  const project = await findOwnedProjectContext(database, userId, projectId)

  if (!project) {
    throw new TaskNotFoundError('Proyecto no encontrado.')
  }

  return project
}

async function requireOwnedMilestone(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  milestoneId: string,
) {
  const milestone = await findOwnedMilestoneContext(
    database,
    userId,
    projectId,
    milestoneId,
  )

  if (!milestone) {
    throw new TaskNotFoundError('Hito no encontrado.')
  }

  return milestone
}

async function requireTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await findTaskById(database, userId, taskId)

  if (!task) {
    throw new TaskNotFoundError('Tarea no encontrada.')
  }

  return task
}

async function requireRootTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await requireTask(database, userId, taskId)

  if (task.parentTaskId) {
    throw new TaskValidationError(
      'No se permiten subtareas dentro de otra subtarea.',
    )
  }

  return task
}

async function validateTaskContext(
  database: DatabaseConnection,
  userId: string,
  projectId: string | null,
  milestoneId: string | null,
) {
  if (!projectId && milestoneId) {
    throw new TaskValidationError(
      'Una tarea asociada a un hito también debe pertenecer a su proyecto.',
    )
  }

  if (projectId) {
    await requireOwnedProject(database, userId, projectId)
  }

  if (projectId && milestoneId) {
    await requireOwnedMilestone(database, userId, projectId, milestoneId)
  }
}

function taskStatusAction(previous: TaskStatus, next: TaskStatus) {
  if (previous === next) {
    return 'task.updated'
  }

  if (next === 'completed') {
    return 'task.completed'
  }

  if (next === 'canceled') {
    return 'task.canceled'
  }

  if (previous === 'completed' || previous === 'canceled') {
    return 'task.reopened'
  }

  return 'task.status_changed'
}

async function mapTaskRowsWithProgress(
  database: DatabaseConnection,
  userId: string,
  rows: TaskRow[],
) {
  if (rows.length === 0) return []

  const taskIds = rows.map((row) => row.id)
  const [subtasks, checklist] = await Promise.all([
    listSubtasksForProgress(database, userId, taskIds),
    listChecklistForProgress(database, userId, taskIds),
  ])

  const subtasksByParent = new Map<string, TaskRow[]>()
  for (const subtask of subtasks) {
    if (!subtask.parentTaskId) continue
    const items = subtasksByParent.get(subtask.parentTaskId) ?? []
    items.push(subtask)
    subtasksByParent.set(subtask.parentTaskId, items)
  }

  const checklistByTask = new Map<string, typeof checklist>()
  for (const item of checklist) {
    const items = checklistByTask.get(item.taskId) ?? []
    items.push(item)
    checklistByTask.set(item.taskId, items)
  }

  return rows.map((row) =>
    mapTask(
      row,
      calculateTaskProgress(
        row.status,
        subtasksByParent.get(row.id) ?? [],
        checklistByTask.get(row.id) ?? [],
      ),
    ),
  )
}

export async function getTasks(
  database: DatabaseConnection,
  userId: string,
  filters: TaskFilters = {},
) {
  if (filters.milestoneId && !filters.projectId) {
    throw new TaskValidationError(
      'Para filtrar por hito debes indicar también el proyecto.',
    )
  }

  if (filters.projectId) {
    await requireOwnedProject(database, userId, filters.projectId)
  }

  if (filters.projectId && filters.milestoneId) {
    await requireOwnedMilestone(
      database,
      userId,
      filters.projectId,
      filters.milestoneId,
    )
  }

  const rows = await listTasks(database, userId, filters)
  return mapTaskRowsWithProgress(database, userId, rows)
}

export async function getTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const task = await requireTask(database, userId, taskId)
  const [subtasks, checklist] = await Promise.all([
    listSubtasks(database, userId, task.id),
    listChecklistItems(database, userId, task.id),
  ])

  return mapTaskDetail(task, subtasks, checklist)
}

export async function createTask(
  database: DatabaseConnection,
  userId: string,
  input: CreateTaskInput,
) {
  const projectId = input.projectId ?? null
  const milestoneId = input.milestoneId ?? null

  await validateTaskContext(database, userId, projectId, milestoneId)

  const status = input.status ?? 'pending'
  const scope: TaskScope = {
    projectId,
    milestoneId,
    parentTaskId: null,
  }
  const position = await getNextTaskPosition(database, userId, scope)
  const now = new Date()

  const task = await insertTask(database, {
    userId,
    projectId,
    milestoneId,
    parentTaskId: null,
    title: input.title,
    description: input.description ?? null,
    status,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    weight: input.weight ?? 1,
    position,
    completedAt: status === 'completed' ? now : null,
  })

  if (!task) {
    throw new Error('No se pudo crear la tarea.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: task.id,
    projectId: task.projectId,
    milestoneId: task.milestoneId,
    action: 'task.created',
    metadata: {
      status: task.status,
      priority: task.priority,
      weight: task.weight,
      position: task.position,
    },
  })

  return mapTask(task)
}

function resolveUpdatedContext(existing: TaskRow, input: UpdateTaskInput) {
  const projectId =
    input.projectId !== undefined ? input.projectId : existing.projectId

  let milestoneId: string | null

  if (projectId === null) {
    milestoneId = null
  } else if (input.milestoneId !== undefined) {
    milestoneId = input.milestoneId
  } else if (
    input.projectId !== undefined &&
    input.projectId !== existing.projectId
  ) {
    milestoneId = null
  } else {
    milestoneId = existing.milestoneId
  }

  return { projectId, milestoneId }
}

export async function updateTask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const existing = await requireTask(database, userId, taskId)

  if (existing.parentTaskId) {
    throw new TaskValidationError(
      'Las subtareas deben actualizarse desde su tarea padre.',
    )
  }

  const { projectId, milestoneId } = resolveUpdatedContext(existing, input)
  await validateTaskContext(database, userId, projectId, milestoneId)

  const status = input.status ?? existing.status
  const now = new Date()
  const contextChanged =
    projectId !== existing.projectId || milestoneId !== existing.milestoneId

  const position = contextChanged
    ? await getNextTaskPosition(database, userId, {
        projectId,
        milestoneId,
        parentTaskId: null,
      })
    : existing.position

  const updated = await updateRootTaskWithInheritedContext(
    database,
    userId,
    taskId,
    {
      projectId,
      milestoneId,
      title: input.title ?? existing.title,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      status,
      priority: input.priority ?? existing.priority,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      estimatedMinutes:
        input.estimatedMinutes !== undefined
          ? input.estimatedMinutes
          : existing.estimatedMinutes,
      weight: input.weight ?? existing.weight,
      position,
      completedAt:
        status === 'completed' ? (existing.completedAt ?? now) : null,
      updatedAt: now,
    },
    contextChanged,
  )

  if (!updated) {
    throw new TaskNotFoundError('Tarea no encontrada.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: updated.id,
    projectId: updated.projectId,
    milestoneId: updated.milestoneId,
    action: taskStatusAction(existing.status, updated.status),
    metadata: {
      fromStatus: existing.status,
      toStatus: updated.status,
      fromProjectId: existing.projectId,
      toProjectId: updated.projectId,
      fromMilestoneId: existing.milestoneId,
      toMilestoneId: updated.milestoneId,
      weight: updated.weight,
    },
  })

  const [mapped] = await mapTaskRowsWithProgress(database, userId, [updated])
  return mapped!
}

export async function getSubtasks(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  await requireRootTask(database, userId, taskId)
  const rows = await listSubtasks(database, userId, taskId)
  return mapTaskRowsWithProgress(database, userId, rows)
}

export async function createSubtask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  input: CreateSubtaskInput,
) {
  const parent = await requireRootTask(database, userId, taskId)
  const status = input.status ?? 'pending'
  const scope: TaskScope = {
    projectId: parent.projectId,
    milestoneId: parent.milestoneId,
    parentTaskId: parent.id,
  }
  const position = await getNextTaskPosition(database, userId, scope)
  const now = new Date()

  const subtask = await insertTask(database, {
    userId,
    projectId: parent.projectId,
    milestoneId: parent.milestoneId,
    parentTaskId: parent.id,
    title: input.title,
    description: input.description ?? null,
    status,
    priority: input.priority ?? 'medium',
    dueDate: input.dueDate ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    weight: input.weight ?? 1,
    position,
    completedAt: status === 'completed' ? now : null,
  })

  if (!subtask) {
    throw new Error('No se pudo crear la subtarea.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: subtask.id,
    projectId: subtask.projectId,
    milestoneId: subtask.milestoneId,
    action: 'subtask.created',
    metadata: {
      parentTaskId: parent.id,
      status: subtask.status,
      priority: subtask.priority,
      position: subtask.position,
    },
  })

  return mapTask(subtask)
}

export async function updateSubtask(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  subtaskId: string,
  input: UpdateSubtaskInput,
) {
  const parent = await requireRootTask(database, userId, taskId)
  const existing = await findSubtaskById(database, userId, parent.id, subtaskId)

  if (!existing) {
    throw new TaskNotFoundError('Subtarea no encontrada.')
  }

  const status = input.status ?? existing.status
  const now = new Date()

  const updated = await updateSubtaskById(
    database,
    userId,
    parent.id,
    subtaskId,
    {
      title: input.title ?? existing.title,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      status,
      priority: input.priority ?? existing.priority,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      estimatedMinutes:
        input.estimatedMinutes !== undefined
          ? input.estimatedMinutes
          : existing.estimatedMinutes,
      weight: input.weight ?? existing.weight,
      completedAt:
        status === 'completed' ? (existing.completedAt ?? now) : null,
      updatedAt: now,
    },
  )

  if (!updated) {
    throw new TaskNotFoundError('Subtarea no encontrada.')
  }

  await addTaskActivity(database, {
    userId,
    taskId: updated.id,
    projectId: updated.projectId,
    milestoneId: updated.milestoneId,
    action: 'subtask.updated',
    metadata: {
      parentTaskId: parent.id,
      fromStatus: existing.status,
      toStatus: updated.status,
    },
  })

  const [mapped] = await mapTaskRowsWithProgress(database, userId, [updated])
  return mapped!
}
