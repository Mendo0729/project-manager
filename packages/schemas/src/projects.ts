import { z } from 'zod'

export const projectStatusSchema = z.enum([
  'planned',
  'active',
  'paused',
  'completed',
  'archived',
])

export const projectPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
])

export const projectProgressModeSchema = z.enum(['automatic', 'manual'])

const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato YYYY-MM-DD')
  .nullable()

const projectBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  startDate: nullableDateSchema.optional(),
  targetDate: nullableDateSchema.optional(),
  progressMode: projectProgressModeSchema.optional(),
  manualProgress: z.number().int().min(0).max(100).nullable().optional(),
})

function validateProjectDates(
  data: { startDate?: string | null; targetDate?: string | null },
  context: z.RefinementCtx,
) {
  if (data.startDate && data.targetDate && data.targetDate < data.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['targetDate'],
      message: 'La fecha objetivo no puede ser anterior a la fecha de inicio.',
    })
  }
}

function validateManualProgress(
  data: { progressMode?: 'automatic' | 'manual'; manualProgress?: number | null },
  context: z.RefinementCtx,
) {
  if (data.progressMode === 'automatic' && data.manualProgress != null) {
    context.addIssue({
      code: 'custom',
      path: ['manualProgress'],
      message: 'El progreso manual no se puede usar en modo automático.',
    })
  }
}

export const createProjectSchema = projectBaseSchema.superRefine((data, context) => {
  validateProjectDates(data, context)
  validateManualProgress(data, context)
})

export const updateProjectSchema = projectBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  })
  .superRefine((data, context) => {
    validateProjectDates(data, context)
    validateManualProgress(data, context)
  })

export const projectFiltersSchema = z.object({
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  archived: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(180).optional(),
  sort: z.enum(['updated', 'targetDate', 'name']).optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectFilters = z.infer<typeof projectFiltersSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type ProjectPriority = z.infer<typeof projectPrioritySchema>
export type ProjectProgressMode = z.infer<typeof projectProgressModeSchema>

export interface ProjectDto {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  startDate: string | null
  targetDate: string | null
  progressMode: ProjectProgressMode
  progress: number
  manualProgress: number | null
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}
