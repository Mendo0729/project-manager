import { argon2id, hash, verify } from 'argon2'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { users } from '@project-manager/database'
import { loginSchema, registerSchema } from '@project-manager/schemas'

import {
  SESSION_COOKIE_NAME,
  createSession,
  getSessionUser,
  revokeSession,
  sessionCookieOptions,
} from './session.js'

function serializeUser(user: {
  id: string
  email: string
  displayName: string
  timezone: string
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
  }
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: parsed.error.issues[0]?.message ?? 'Datos de registro inválidos.',
      })
    }

    const [existingUser] = await database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)

    if (existingUser) {
      return reply.code(409).send({
        error: 'email_in_use',
        message: 'Ya existe una cuenta con ese correo.',
      })
    }

    const passwordHash = await hash(parsed.data.password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    })

    const [user] = await database.db
      .insert(users)
      .values({
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        timezone: users.timezone,
      })

    if (!user) {
      return reply.code(500).send({
        error: 'registration_failed',
        message: 'No se pudo crear la cuenta.',
      })
    }

    const session = await createSession(database, user.id)

    reply
      .header('Cache-Control', 'no-store')
      .setCookie(
        SESSION_COOKIE_NAME,
        session.token,
        sessionCookieOptions(session.expiresAt),
      )

    return reply.code(201).send({ user: serializeUser(user) })
  })

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'Correo y contraseña son obligatorios.',
      })
    }

    const [user] = await database.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
        timezone: users.timezone,
      })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1)

    const validPassword =
      user?.passwordHash != null &&
      (await verify(user.passwordHash, parsed.data.password))

    if (!user || !validPassword) {
      return reply.code(401).send({
        error: 'invalid_credentials',
        message: 'Correo o contraseña incorrectos.',
      })
    }

    const session = await createSession(database, user.id)

    reply
      .header('Cache-Control', 'no-store')
      .setCookie(
        SESSION_COOKIE_NAME,
        session.token,
        sessionCookieOptions(session.expiresAt),
      )

    return { user: serializeUser(user) }
  })

  app.post('/logout', async (request, reply) => {
    await revokeSession(database, request.cookies[SESSION_COOKIE_NAME])

    reply
      .header('Cache-Control', 'no-store')
      .clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions())

    return reply.code(204).send()
  })

  app.get('/me', async (request, reply) => {
    const user = await getSessionUser(
      database,
      request.cookies[SESSION_COOKIE_NAME],
    )

    reply.header('Cache-Control', 'no-store')

    if (!user) {
      return reply.code(401).send({
        error: 'unauthenticated',
        message: 'No hay una sesión activa.',
      })
    }

    return { user }
  })
}
