import { and, asc, eq } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { tags, taskTags, tasks } from '@project-manager/database'

export type TagRow = typeof tags.$inferSelect
export type NewTagRow = typeof tags.$inferInsert

export async function listOwnedTags(
  database: DatabaseConnection,
  userId: string,
) {
  return database.db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name), asc(tags.createdAt))
}

export async function findOwnedTagById(
  database: DatabaseConnection,
  userId: string,
  tagId: string,
) {
  const [tag] = await database.db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1)

  return tag ?? null
}

export async function insertTag(
  database: DatabaseConnection,
  values: NewTagRow,
) {
  const [tag] = await database.db.insert(tags).values(values).returning()
  return tag ?? null
}

export async function listOwnedTaskTags(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  return database.db
    .select({
      id: tags.id,
      userId: tags.userId,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(taskTags)
    .innerJoin(tags, eq(taskTags.tagId, tags.id))
    .innerJoin(tasks, eq(taskTags.taskId, tasks.id))
    .where(
      and(
        eq(taskTags.taskId, taskId),
        eq(tasks.userId, userId),
        eq(tags.userId, userId),
      ),
    )
    .orderBy(asc(tags.name), asc(tags.createdAt))
}

export async function findTaskTag(
  database: DatabaseConnection,
  taskId: string,
  tagId: string,
) {
  const [relation] = await database.db
    .select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
    .from(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
    .limit(1)

  return relation ?? null
}

export async function insertTaskTag(
  database: DatabaseConnection,
  taskId: string,
  tagId: string,
) {
  const [relation] = await database.db
    .insert(taskTags)
    .values({ taskId, tagId })
    .onConflictDoNothing()
    .returning()

  return relation ?? null
}

export async function deleteTaskTag(
  database: DatabaseConnection,
  taskId: string,
  tagId: string,
) {
  const [relation] = await database.db
    .delete(taskTags)
    .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
    .returning()

  return relation ?? null
}
