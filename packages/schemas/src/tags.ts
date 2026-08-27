import { z } from 'zod'

const uuidSchema = z.string().uuid('Identificador inválido.')

export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe usar formato hexadecimal #RRGGBB.')

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(80),
  color: tagColorSchema.nullable().optional(),
})

export const tagParamsSchema = z.object({
  tagId: uuidSchema,
})

export const taskTagParamsSchema = z.object({
  taskId: z.string().uuid('Identificador de tarea inválido.'),
  tagId: z.string().uuid('Identificador de etiqueta inválido.'),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export interface TagDto {
  id: string
  name: string
  color: string | null
  createdAt: string
  updatedAt: string
}
