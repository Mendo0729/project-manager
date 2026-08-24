import type { FastifyReply, FastifyRequest } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'

import { SESSION_COOKIE_NAME, getSessionUser } from '../../modules/auth/session.js'

export function createRequireAuth(database: DatabaseConnection) {
  return async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
    const user = await getSessionUser(
      database,
      request.cookies[SESSION_COOKIE_NAME],
    )

    if (!user) {
      return reply.code(401).send({
        error: 'unauthenticated',
        message: 'Debes iniciar sesión para continuar.',
      })
    }

    request.authUser = user
  }
}
