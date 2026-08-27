import { and, eq, inArray } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { taskChecklists, tasks } from '@project-manager/database'

export async function listSubtasksForProgress(
  database: DatabaseConnection,
  userId: string,
  taskIds: string[],
) {
  if (taskIds.length === 0) return []

  return database.db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(tasks.parentTaskId, taskIds),
      ),
    )
}

export async function listChecklistForProgress(
  database: DatabaseConnection,
  userId: string,
  taskIds: string[],
) {
  if (taskIds.length === 0) return []

  return database.db
    .select({
      id: taskChecklists.id,
      taskId: taskChecklists.taskId,
      title: taskChecklists.title,
      isCompleted: taskChecklists.isCompleted,
      position: taskChecklists.position,
      createdAt: taskChecklists.createdAt,
      updatedAt: taskChecklists.updatedAt,
    })
    .from(taskChecklists)
    .innerJoin(tasks, eq(taskChecklists.taskId, tasks.id))
    .where(
      and(
        eq(tasks.userId, userId),
        inArray(taskChecklists.taskId, taskIds),
      ),
    )
}
