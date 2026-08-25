import { z } from 'zod'

export const milestoneStatusSchema = z.enum([
  'planned',
  'active',
  'completed',
  'canceled',
])

const nullableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato YYYY-MM-DD')
  .nullable()

const milestoneBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  status: milestoneStatusSchema.optional(),
  weight: z.number().int().min(1, 'El peso debe ser mayor que cero').max(1000).optional(),
  targetDate: nullableDateSchema.optional(),
})

export const createMilestoneSchema = milestoneBaseSchema

export const updateMilestoneSchema = milestoneBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  })

export const milestoneFiltersSchema = z.object({
  status: milestoneStatusSchema.optional(),
})

export const projectMilestonesParamsSchema = z.object({
  projectId: z.string().uuid('Identificador de proyecto inválido.'),
})

export const milestoneParamsSchema = z.object({
  projectId: z.string().uuid('Identificador de proyecto inválido.'),
  milestoneId: z.string().uuid('Identificador de hito inválido.'),
})

export const reorderMilestonesSchema = z
  .object({
    milestoneIds: z
      .array(z.string().uuid('Identificador de hito inválido.'))
      .min(1, 'Debes enviar al menos un hito.'),
  })
  .refine(
    ({ milestoneIds }) => new Set(milestoneIds).size === milestoneIds.length,
    {
      path: ['milestoneIds'],
      message: 'La lista de hitos no puede contener identificadores duplicados.',
    },
  )

export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
export type MilestoneFilters = z.infer<typeof milestoneFiltersSchema>
export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>

export interface MilestoneDto {
  id: string
  projectId: string
  name: string
  description: string | null
  status: MilestoneStatus
  weight: number
  targetDate: string | null
  position: number
  progress: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}
