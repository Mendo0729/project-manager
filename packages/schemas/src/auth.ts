import { z } from 'zod'

const normalizedEmail = z
  .string()
  .trim()
  .email('Correo inválido')
  .max(320)
  .transform((value) => value.toLowerCase())

const accountPassword = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres')
  .max(256)

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, 'La contraseña es obligatoria').max(256),
})

export const registerSchema = z.object({
  email: normalizedEmail,
  password: accountPassword,
  displayName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
})

export const initialUserSchema = registerSchema

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
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
