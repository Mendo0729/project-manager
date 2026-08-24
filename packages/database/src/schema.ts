import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const projectStatusEnum = pgEnum('project_status', [
  'planned',
  'active',
  'paused',
  'completed',
  'archived',
])

export const priorityEnum = pgEnum('priority', [
  'low',
  'medium',
  'high',
  'critical',
])

export const progressModeEnum = pgEnum('progress_mode', [
  'automatic',
  'manual',
])

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'planned',
  'active',
  'completed',
  'canceled',
])

export const taskStatusEnum = pgEnum('task_status', [
  'backlog',
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'canceled',
])

export const activityEntityEnum = pgEnum('activity_entity', [
  'project',
  'milestone',
  'task',
  'weekly_plan',
  'daily_plan',
  'tag',
  'system',
])

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash'),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/Panama'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
  ],
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description'),
    status: projectStatusEnum('status').notNull().default('planned'),
    priority: priorityEnum('priority').notNull().default('medium'),
    startDate: date('start_date'),
    targetDate: date('target_date'),
    progressMode: progressModeEnum('progress_mode').notNull().default('automatic'),
    manualProgress: smallint('manual_progress'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_user_status_idx').on(table.userId, table.status),
    index('projects_target_date_idx').on(table.targetDate),
    check(
      'projects_manual_progress_range',
      sql`${table.manualProgress} is null or (${table.manualProgress} >= 0 and ${table.manualProgress} <= 100)`,
    ),
    check(
      'projects_target_after_start',
      sql`${table.startDate} is null or ${table.targetDate} is null or ${table.targetDate} >= ${table.startDate}`,
    ),
  ],
)

export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 180 }).notNull(),
    description: text('description'),
    status: milestoneStatusEnum('status').notNull().default('planned'),
    weight: integer('weight').notNull().default(1),
    targetDate: date('target_date'),
    position: integer('position').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('milestones_project_position_idx').on(table.projectId, table.position),
    check('milestones_weight_positive', sql`${table.weight} > 0`),
    check('milestones_position_nonnegative', sql`${table.position} >= 0`),
  ],
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    parentTaskId: uuid('parent_task_id'),
    title: varchar('title', { length: 240 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('pending'),
    priority: priorityEnum('priority').notNull().default('medium'),
    plannedWeek: date('planned_week'),
    scheduledDate: date('scheduled_date'),
    dueDate: date('due_date'),
    estimatedMinutes: integer('estimated_minutes'),
    actualMinutes: integer('actual_minutes'),
    weight: integer('weight').notNull().default(1),
    position: integer('position').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('tasks_user_status_idx').on(table.userId, table.status),
    index('tasks_user_scheduled_date_idx').on(table.userId, table.scheduledDate),
    index('tasks_user_planned_week_idx').on(table.userId, table.plannedWeek),
    index('tasks_project_idx').on(table.projectId),
    index('tasks_milestone_idx').on(table.milestoneId),
    index('tasks_due_date_idx').on(table.dueDate),
    check(
      'tasks_estimated_minutes_nonnegative',
      sql`${table.estimatedMinutes} is null or ${table.estimatedMinutes} >= 0`,
    ),
    check(
      'tasks_actual_minutes_nonnegative',
      sql`${table.actualMinutes} is null or ${table.actualMinutes} >= 0`,
    ),
    check('tasks_weight_positive', sql`${table.weight} > 0`),
    check('tasks_position_nonnegative', sql`${table.position} >= 0`),
  ],
)

export const taskChecklists = pgTable(
  'task_checklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 240 }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('task_checklists_task_position_idx').on(table.taskId, table.position),
    check('task_checklists_position_nonnegative', sql`${table.position} >= 0`),
  ],
)

export const weeklyPlans = pgTable(
  'weekly_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    mainGoal: varchar('main_goal', { length: 300 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('weekly_plans_user_week_unique').on(table.userId, table.weekStart),
  ],
)

export const dailyPlans = pgTable(
  'daily_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    mainGoal: varchar('main_goal', { length: 300 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('daily_plans_user_date_unique').on(table.userId, table.date),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    color: varchar('color', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tags_user_name_unique').on(table.userId, table.name),
  ],
)

export const taskTags = pgTable(
  'task_tags',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.tagId], name: 'task_tags_pk' }),
    index('task_tags_tag_idx').on(table.tagId),
  ],
)

export const projectTags = pgTable(
  'project_tags',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.tagId], name: 'project_tags_pk' }),
    index('project_tags_tag_idx').on(table.tagId),
  ],
)

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityType: activityEntityEnum('entity_type').notNull(),
    entityId: uuid('entity_id'),
    action: varchar('action', { length: 120 }).notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activity_logs_user_created_idx').on(table.userId, table.createdAt),
    index('activity_logs_project_idx').on(table.projectId),
    index('activity_logs_task_idx').on(table.taskId),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  weeklyPlans: many(weeklyPlans),
  dailyPlans: many(dailyPlans),
  tags: many(tags),
  activityLogs: many(activityLogs),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  milestones: many(milestones),
  tasks: many(tasks),
  projectTags: many(projectTags),
  activityLogs: many(activityLogs),
}))

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, { fields: [milestones.projectId], references: [projects.id] }),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [tasks.milestoneId], references: [milestones.id] }),
  parent: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'task_children',
  }),
  children: many(tasks, { relationName: 'task_children' }),
  checklist: many(taskChecklists),
  taskTags: many(taskTags),
  activityLogs: many(activityLogs),
}))

export const taskChecklistsRelations = relations(taskChecklists, ({ one }) => ({
  task: one(tasks, { fields: [taskChecklists.taskId], references: [tasks.id] }),
}))

export const weeklyPlansRelations = relations(weeklyPlans, ({ one }) => ({
  user: one(users, { fields: [weeklyPlans.userId], references: [users.id] }),
}))

export const dailyPlansRelations = relations(dailyPlans, ({ one }) => ({
  user: one(users, { fields: [dailyPlans.userId], references: [users.id] }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  taskTags: many(taskTags),
  projectTags: many(projectTags),
}))

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, { fields: [taskTags.taskId], references: [tasks.id] }),
  tag: one(tags, { fields: [taskTags.tagId], references: [tags.id] }),
}))

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
  project: one(projects, { fields: [projectTags.projectId], references: [projects.id] }),
  tag: one(tags, { fields: [projectTags.tagId], references: [tags.id] }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
  project: one(projects, { fields: [activityLogs.projectId], references: [projects.id] }),
  milestone: one(milestones, { fields: [activityLogs.milestoneId], references: [milestones.id] }),
  task: one(tasks, { fields: [activityLogs.taskId], references: [tasks.id] }),
}))
