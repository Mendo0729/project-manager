import type { AuthUser } from '@project-manager/schemas'

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null
  }
}
