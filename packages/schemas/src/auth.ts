import { z } from 'zod'

const normalizedEmail = z
  .string()
  .trim()
  .email('Correo inválido')
  .max(320)
  .transform((value) => value.toLowerCase())

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, 'La contraseña es obligatoria').max(256),
})

export const initialUserSchema = z.object({
  email: normalizedEmail,
  password: z
    .string()
    .min(12, 'La contraseña inicial debe tener al menos 12 caracteres')
    .max(256),
  displayName: z.string().trim().min(2).max(120),
})

export type LoginInput = z.infer<typeof loginSchema>
export type InitialUserInput = z.infer<typeof initialUserSchema>

export interface AuthUser {
  id: string
  email: string
  displayName: string
  timezone: string
}

export interface AuthResponse {
  user: AuthUser
}
