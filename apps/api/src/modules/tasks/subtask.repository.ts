import { and, asc, eq } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { tasks } from '@project-manager/database'

export async function deleteOwnedSubtask(
  database: DatabaseConnection,
  userId: string,
  parentTaskId: string,
  subtaskId: string,
) {
  return database.db.transaction(async (transaction) => {
    const [deleted] = await transaction
      .delete(tasks)
      .where(
        and(
          eq(tasks.id, subtaskId),
          eq(tasks.userId, userId),
          eq(tasks.parentTaskId, parentTaskId),
        ),
      )
      .returning()

    if (!deleted) {
      return null
    }

    const remaining = await transaction
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.parentTaskId, parentTaskId),
        ),
      )
      .orderBy(asc(tasks.position), asc(tasks.createdAt))

    const now = new Date()
    for (const [position, row] of remaining.entries()) {
      await transaction
        .update(tasks)
        .set({ position, updatedAt: now })
        .where(
          and(
            eq(tasks.id, row.id),
            eq(tasks.userId, userId),
            eq(tasks.parentTaskId, parentTaskId),
          ),
        )
    }

    return deleted
  })
}

export async function replaceOwnedSubtaskOrder(
  database: DatabaseConnection,
  userId: string,
  parentTaskId: string,
  subtaskIds: string[],
) {
  return database.db.transaction(async (transaction) => {
    const now = new Date()

    for (const [position, subtaskId] of subtaskIds.entries()) {
      await transaction
        .update(tasks)
        .set({ position, updatedAt: now })
        .where(
          and(
            eq(tasks.id, subtaskId),
            eq(tasks.userId, userId),
            eq(tasks.parentTaskId, parentTaskId),
          ),
        )
    }

    return transaction
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.parentTaskId, parentTaskId),
        ),
      )
      .orderBy(asc(tasks.position), asc(tasks.createdAt))
  })
}
