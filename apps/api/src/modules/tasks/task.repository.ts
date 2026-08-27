import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import {
  activityLogs,
  milestones,
  projects,
  taskChecklists,
  tasks,
} from '@project-manager/database'
import type { TaskFilters } from '@project-manager/schemas'

export type TaskRow = typeof tasks.$inferSelect
export type NewTaskRow = typeof tasks.$inferInsert
export type TaskUpdateRow = Partial<typeof tasks.$inferInsert>
export type ChecklistRow = typeof taskChecklists.$inferSelect
export type NewChecklistRow = typeof taskChecklists.$inferInsert
export type ChecklistUpdateRow = Partial<typeof taskChecklists.$inferInsert>

export interface TaskScope {
  projectId: string | null
  milestoneId: string | null
  parentTaskId: string | null
}

function taskScopeConditions(userId: string, scope: TaskScope): SQL[] {
  return [
    eq(tasks.userId, userId),
    scope.projectId === null
      ? isNull(tasks.projectId)
      : eq(tasks.projectId, scope.projectId),
    scope.milestoneId === null
      ? isNull(tasks.milestoneId)
      : eq(tasks.milestoneId, scope.milestoneId),
    scope.parentTaskId === null
      ? isNull(tasks.parentTaskId)
      : eq(tasks.parentTaskId, scope.parentTaskId),
  ]
}

function ownedTaskIds(database: DatabaseConnection, userId: string) {
  return database.db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userId, userId))
}

export async function listTasks(
  database: DatabaseConnection,
  userId: string,
  filters: TaskFilters = {},
) {
  const conditions: SQL[] = [eq(tasks.userId, userId)]

  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status))
  }

  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority))
  }

  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId))
  }

  if (filters.milestoneId) {
    conditions.push(eq(tasks.milestoneId, filters.milestoneId))
  }

  if (filters.parentTaskId) {
    conditions.push(eq(tasks.parentTaskId, filters.parentTaskId))
  } else {
    conditions.push(isNull(tasks.parentTaskId))
  }

  if (filters.personal === 'true') {
    conditions.push(isNull(tasks.projectId))
  } else if (filters.personal === 'false') {
    conditions.push(isNotNull(tasks.projectId))
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`
    const searchCondition = or(
      ilike(tasks.title, pattern),
      ilike(tasks.description, pattern),
    )

    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  const priorityOrder = sql<number>`case ${tasks.priority}
    when 'critical' then 4
    when 'high' then 3
    when 'medium' then 2
    when 'low' then 1
    else 0
  end`

  const orderBy =
    filters.sort === 'title'
      ? [asc(tasks.title)]
      : filters.sort === 'dueDate'
        ? [asc(tasks.dueDate), asc(tasks.position), desc(tasks.updatedAt)]
        : filters.sort === 'priority'
          ? [desc(priorityOrder), asc(tasks.position), desc(tasks.updatedAt)]
          : filters.sort === 'position'
            ? [asc(tasks.position), asc(tasks.createdAt)]
            : [desc(tasks.updatedAt)]

  return database.db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(...orderBy)
}

export async function listTasksByScope(
  database: DatabaseConnection,
  userId: string,
  scope: TaskScope,
) {
  return database.db
    .select()
    .from(tasks)
    .where(and(...taskScopeConditions(userId, scope)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
}

export async function listSubtasks(
  database: DatabaseConnection,
  userId: string,
  parentTaskId: string,
) {
  return database.db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.parentTaskId, parentTaskId)))
    .orderBy(asc(tasks.position), asc(tasks.createdAt))
}

export async function findTaskById(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const [task] = await database.db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)

  return task ?? null
}

export async function findSubtaskById(
  database: DatabaseConnection,
  userId: string,
  parentTaskId: string,
  subtaskId: string,
) {
  const [task] = await database.db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, subtaskId),
        eq(tasks.userId, userId),
        eq(tasks.parentTaskId, parentTaskId),
      ),
    )
    .limit(1)

  return task ?? null
}

export async function findOwnedProjectContext(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
) {
  const [project] = await database.db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  return project ?? null
}

export async function findOwnedMilestoneContext(
  database: DatabaseConnection,
  userId: string,
  projectId: string,
  milestoneId: string,
) {
  const [milestone] = await database.db
    .select({
      id: milestones.id,
      projectId: milestones.projectId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(milestones.projectId, projectId),
        eq(projects.userId, userId),
      ),
    )
    .limit(1)

  return milestone ?? null
}

export async function getNextTaskPosition(
  database: DatabaseConnection,
  userId: string,
  scope: TaskScope,
) {
  const [result] = await database.db
    .select({ position: max(tasks.position) })
    .from(tasks)
    .where(and(...taskScopeConditions(userId, scope)))

  return (result?.position ?? -1) + 1
}

export async function insertTask(
  database: DatabaseConnection,
  values: NewTaskRow,
) {
  const [task] = await database.db.insert(tasks).values(values).returning()
  return task ?? null
}

export async function updateTaskById(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  values: TaskUpdateRow,
) {
  const [task] = await database.db
    .update(tasks)
    .set(values)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()

  return task ?? null
}

export async function updateRootTaskWithInheritedContext(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  values: TaskUpdateRow,
  contextChanged: boolean,
) {
  return database.db.transaction(async (transaction) => {
    const [task] = await transaction
      .update(tasks)
      .set(values)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId),
          isNull(tasks.parentTaskId),
        ),
      )
      .returning()

    if (!task) {
      return null
    }

    if (contextChanged) {
      await transaction
        .update(tasks)
        .set({
          projectId: task.projectId,
          milestoneId: task.milestoneId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.parentTaskId, task.id),
          ),
        )
    }

    return task
  })
}

export async function updateSubtaskById(
  database: DatabaseConnection,
  userId: string,
  parentTaskId: string,
  subtaskId: string,
  values: TaskUpdateRow,
) {
  const [task] = await database.db
    .update(tasks)
    .set(values)
    .where(
      and(
        eq(tasks.id, subtaskId),
        eq(tasks.userId, userId),
        eq(tasks.parentTaskId, parentTaskId),
      ),
    )
    .returning()

  return task ?? null
}

export async function replaceTaskOrder(
  database: DatabaseConnection,
  userId: string,
  scope: TaskScope,
  taskIds: string[],
) {
  await database.db.transaction(async (transaction) => {
    for (const [position, taskId] of taskIds.entries()) {
      await transaction
        .update(tasks)
        .set({ position, updatedAt: new Date() })
        .where(
          and(
            eq(tasks.id, taskId),
            ...taskScopeConditions(userId, scope),
          ),
        )
    }
  })
}

export async function listChecklistItems(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
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
    .where(and(eq(taskChecklists.taskId, taskId), eq(tasks.userId, userId)))
    .orderBy(asc(taskChecklists.position), asc(taskChecklists.createdAt))
}

export async function findChecklistItemById(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemId: string,
) {
  const [item] = await database.db
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
        eq(taskChecklists.id, itemId),
        eq(taskChecklists.taskId, taskId),
        eq(tasks.userId, userId),
      ),
    )
    .limit(1)

  return item ?? null
}

export async function getNextChecklistPosition(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
) {
  const [result] = await database.db
    .select({ position: max(taskChecklists.position) })
    .from(taskChecklists)
    .innerJoin(tasks, eq(taskChecklists.taskId, tasks.id))
    .where(and(eq(taskChecklists.taskId, taskId), eq(tasks.userId, userId)))

  return (result?.position ?? -1) + 1
}

export async function insertChecklistItem(
  database: DatabaseConnection,
  values: NewChecklistRow,
) {
  const [item] = await database.db
    .insert(taskChecklists)
    .values(values)
    .returning()

  return item ?? null
}

export async function updateChecklistItemById(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemId: string,
  values: ChecklistUpdateRow,
) {
  const [item] = await database.db
    .update(taskChecklists)
    .set(values)
    .where(
      and(
        eq(taskChecklists.id, itemId),
        eq(taskChecklists.taskId, taskId),
        inArray(taskChecklists.taskId, ownedTaskIds(database, userId)),
      ),
    )
    .returning()

  return item ?? null
}

export async function deleteChecklistItemById(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemId: string,
) {
  const [item] = await database.db
    .delete(taskChecklists)
    .where(
      and(
        eq(taskChecklists.id, itemId),
        eq(taskChecklists.taskId, taskId),
        inArray(taskChecklists.taskId, ownedTaskIds(database, userId)),
      ),
    )
    .returning()

  return item ?? null
}

export async function replaceChecklistOrder(
  database: DatabaseConnection,
  userId: string,
  taskId: string,
  itemIds: string[],
) {
  const userTaskIds = ownedTaskIds(database, userId)

  await database.db.transaction(async (transaction) => {
    for (const [position, itemId] of itemIds.entries()) {
      await transaction
        .update(taskChecklists)
        .set({ position, updatedAt: new Date() })
        .where(
          and(
            eq(taskChecklists.id, itemId),
            eq(taskChecklists.taskId, taskId),
            inArray(taskChecklists.taskId, userTaskIds),
          ),
        )
    }
  })
}

export async function addTaskActivity(
  database: DatabaseConnection,
  input: {
    userId: string
    taskId: string
    projectId?: string | null
    milestoneId?: string | null
    action: string
    metadata?: Record<string, unknown>
  },
) {
  await database.db.insert(activityLogs).values({
    userId: input.userId,
    entityType: 'task',
    entityId: input.taskId,
    projectId: input.projectId ?? null,
    milestoneId: input.milestoneId ?? null,
    taskId: input.taskId,
    action: input.action,
    metadata: input.metadata ?? {},
  })
}
