import { z } from 'zod'

import { projectPrioritySchema } from './projects.js'

export const taskStatusSchema = z.enum([
  'backlog',
  'pending',
  'in_progress',
  'blocked',
  'completed',
  'canceled',
])

const uuidSchema = z.string().uuid('Identificador inválido.')
const nullableUuidSchema = uuidSchema.nullable()
const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato YYYY-MM-DD')
  .nullable()

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(240),
  description: z.string().trim().max(5000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  dueDate: nullableDateSchema.optional(),
  estimatedMinutes: z
    .number()
    .int()
    .min(0, 'El tiempo estimado no puede ser negativo.')
    .max(525_600, 'El tiempo estimado es demasiado grande.')
    .nullable()
    .optional(),
  weight: z
    .number()
    .int()
    .min(1, 'El peso debe ser mayor que cero.')
    .max(1000)
    .optional(),
})

const taskContextSchema = z.object({
  projectId: nullableUuidSchema.optional(),
  milestoneId: nullableUuidSchema.optional(),
})

export const createTaskSchema = taskFieldsSchema
  .merge(taskContextSchema)
  .superRefine((data, context) => {
    if (data.milestoneId && !data.projectId) {
      context.addIssue({
        code: 'custom',
        path: ['milestoneId'],
        message: 'Una tarea asociada a un hito también debe indicar su proyecto.',
      })
    }
  })

export const updateTaskSchema = taskFieldsSchema
  .merge(taskContextSchema)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  })
  .superRefine((data, context) => {
    if (data.projectId === null && data.milestoneId) {
      context.addIssue({
        code: 'custom',
        path: ['milestoneId'],
        message: 'Una tarea sin proyecto no puede conservar un hito.',
      })
    }
  })

export const createSubtaskSchema = taskFieldsSchema

export const updateSubtaskSchema = taskFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  })

export const taskFiltersSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  projectId: uuidSchema.optional(),
  milestoneId: uuidSchema.optional(),
  parentTaskId: uuidSchema.optional(),
  personal: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(240).optional(),
  sort: z.enum(['updated', 'dueDate', 'priority', 'position', 'title']).optional(),
})

export const taskParamsSchema = z.object({
  taskId: z.string().uuid('Identificador de tarea inválido.'),
})

export const projectTasksParamsSchema = z.object({
  projectId: z.string().uuid('Identificador de proyecto inválido.'),
})

export const milestoneTasksParamsSchema = z.object({
  projectId: z.string().uuid('Identificador de proyecto inválido.'),
  milestoneId: z.string().uuid('Identificador de hito inválido.'),
})

export const subtaskParamsSchema = z.object({
  taskId: z.string().uuid('Identificador de tarea inválido.'),
  subtaskId: z.string().uuid('Identificador de subtarea inválido.'),
})

export const reorderTasksSchema = z
  .object({
    taskIds: z
      .array(z.string().uuid('Identificador de tarea inválido.'))
      .min(1, 'Debes enviar al menos una tarea.'),
  })
  .refine(({ taskIds }) => new Set(taskIds).size === taskIds.length, {
    path: ['taskIds'],
    message: 'La lista de tareas no puede contener identificadores duplicados.',
  })

export const createChecklistItemSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(240),
})

export const updateChecklistItemSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio.').max(240).optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  })

export const checklistItemParamsSchema = z.object({
  taskId: z.string().uuid('Identificador de tarea inválido.'),
  itemId: z.string().uuid('Identificador de checklist inválido.'),
})

export const reorderChecklistSchema = z
  .object({
    itemIds: z
      .array(z.string().uuid('Identificador de checklist inválido.'))
      .min(1, 'Debes enviar al menos un elemento.'),
  })
  .refine(({ itemIds }) => new Set(itemIds).size === itemIds.length, {
    path: ['itemIds'],
    message: 'La lista del checklist no puede contener identificadores duplicados.',
  })

export type TaskStatus = z.infer<typeof taskStatusSchema>
export type TaskPriority = z.infer<typeof projectPrioritySchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>
export type TaskFilters = z.infer<typeof taskFiltersSchema>
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>
export type ReorderChecklistInput = z.infer<typeof reorderChecklistSchema>

export interface ChecklistItemDto {
  id: string
  taskId: string
  title: string
  isCompleted: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface TaskDto {
  id: string
  projectId: string | null
  milestoneId: string | null
  parentTaskId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  estimatedMinutes: number | null
  weight: number
  position: number
  progress: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskDetailDto extends TaskDto {
  subtasks: TaskDto[]
  checklist: ChecklistItemDto[]
}
