import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
} from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { activityLogs, milestones, projects } from '@project-manager/database'
import type { ProjectFilters } from '@project-manager/schemas'

export type ProjectRow = typeof projects.$inferSelect
export type NewProjectRow = typeof projects.$inferInsert
export type ProjectUpdateRow = Partial<typeof projects.$inferInsert>

export async function listProjects(
  database: DatabaseConnection,
  userId: string,
  filters: ProjectFilters,
) {
  const conditions = [eq(projects.userId, userId)]

  if (filters.status) {
    conditions.push(eq(projects.status, filters.status))
  }

  if (filters.priority) {
    conditions.push(eq(projects.priority, filters.priority))
  }

  if (filters.archived === 'true') {
    conditions.push(eq(projects.status, 'archived'))
  } else if (filters.archived !== undefined) {
    conditions.push(ne(projects.status, 'archived'))
  } else if (!filters.status) {
    conditions.push(ne(projects.status, 'archived'))
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`
    const searchCondition = or(
      ilike(projects.name, pattern),
      ilike(projects.description, pattern),
    )

    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  const orderBy =
    filters.sort === 'name'
      ? [asc(projects.name)]
      : filters.sort === 'targetDate'
        ? [asc(projects.targetDate), desc(projects.updatedAt)]
        : [desc(projects.updatedAt)]

  return database.db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(...orderBy)
}

export async function findProjectById(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
) {
  const [project] = await database.db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  return project ?? null
}

export async function listProjectMilestoneProgressRows(
  database: DatabaseConnection,
  projectIds: string[],
) {
  if (projectIds.length === 0) {
    return []
  }

  return database.db
    .select({
      projectId: milestones.projectId,
      status: milestones.status,
      weight: milestones.weight,
    })
    .from(milestones)
    .where(inArray(milestones.projectId, projectIds))
}

export async function insertProject(
  database: DatabaseConnection,
  values: NewProjectRow,
) {
  const [project] = await database.db
    .insert(projects)
    .values(values)
    .returning()

  return project ?? null
}

export async function updateProjectById(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  values: ProjectUpdateRow,
) {
  const [project] = await database.db
    .update(projects)
    .set(values)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  return project ?? null
}

export async function addProjectActivity(
  database: DatabaseConnection,
  input: {
    userId: string
    projectId: string
    action: string
    metadata?: Record<string, unknown>
  },
) {
  await database.db.insert(activityLogs).values({
    userId: input.userId,
    entityType: 'project',
    entityId: input.projectId,
    projectId: input.projectId,
    action: input.action,
    metadata: input.metadata ?? {},
  })
}
