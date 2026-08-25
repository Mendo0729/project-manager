import { and, asc, eq, max } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { activityLogs, milestones } from '@project-manager/database'
import type { MilestoneFilters } from '@project-manager/schemas'

export type MilestoneRow = typeof milestones.$inferSelect
export type NewMilestoneRow = typeof milestones.$inferInsert
export type MilestoneUpdateRow = Partial<typeof milestones.$inferInsert>

export async function listMilestonesByProject(
  database: DatabaseConnection,
  projectId: string,
  filters: MilestoneFilters = {},
) {
  const conditions = [eq(milestones.projectId, projectId)]

  if (filters.status) {
    conditions.push(eq(milestones.status, filters.status))
  }

  return database.db
    .select()
    .from(milestones)
    .where(and(...conditions))
    .orderBy(asc(milestones.position), asc(milestones.createdAt))
}

export async function findMilestoneById(
  database: DatabaseConnection,
  projectId: string,
  milestoneId: string,
) {
  const [milestone] = await database.db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
      ),
    )
    .limit(1)

  return milestone ?? null
}

export async function getNextMilestonePosition(
  database: DatabaseConnection,
  projectId: string,
) {
  const [result] = await database.db
    .select({ position: max(milestones.position) })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))

  return (result?.position ?? -1) + 1
}

export async function insertMilestone(
  database: DatabaseConnection,
  values: NewMilestoneRow,
) {
  const [milestone] = await database.db
    .insert(milestones)
    .values(values)
    .returning()

  return milestone ?? null
}

export async function updateMilestoneById(
  database: DatabaseConnection,
  projectId: string,
  milestoneId: string,
  values: MilestoneUpdateRow,
) {
  const [milestone] = await database.db
    .update(milestones)
    .set(values)
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
      ),
    )
    .returning()

  return milestone ?? null
}

export async function replaceMilestoneOrder(
  database: DatabaseConnection,
  projectId: string,
  milestoneIds: string[],
) {
  await database.db.transaction(async (transaction) => {
    for (const [position, milestoneId] of milestoneIds.entries()) {
      await transaction
        .update(milestones)
        .set({ position, updatedAt: new Date() })
        .where(
          and(
            eq(milestones.id, milestoneId),
            eq(milestones.projectId, projectId),
          ),
        )
    }
  })
}

export async function addMilestoneActivity(
  database: DatabaseConnection,
  input: {
    userId: string
    projectId: string
    milestoneId: string
    action: string
    metadata?: Record<string, unknown>
  },
) {
  await database.db.insert(activityLogs).values({
    userId: input.userId,
    entityType: 'milestone',
    entityId: input.milestoneId,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    action: input.action,
    metadata: input.metadata ?? {},
  })
}
