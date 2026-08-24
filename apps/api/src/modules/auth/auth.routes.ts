import { verify } from 'argon2'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'

import type { DatabaseConnection } from '@project-manager/database'
import { users } from '@project-manager/database'
import { loginSchema } from '@project-manager/schemas'

import {
  SESSION_COOKIE_NAME,
  createSession,
  getSessionUser,
  revokeSession,
  sessionCookieOptions,
} from './session.js'

export async function registerAuthRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
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

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
      },
    }
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
