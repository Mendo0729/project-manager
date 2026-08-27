import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import { reorderTasksSchema } from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  TaskOrderNotFoundError,
  TaskOrderValidationError,
  reorderTasks,
} from './task-order.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof TaskOrderNotFoundError) {
    return reply.code(404).send({
      error: 'task_not_found',
      message: error.message,
    })
  }

  if (error instanceof TaskOrderValidationError) {
    return reply.code(400).send({
      error: 'invalid_task_order',
      message: error.message,
    })
  }

  throw error
}

export async function registerTaskOrderRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.put('/order', { preHandler: requireAuth }, async (request, reply) => {
    const parsedBody = reorderTasksSchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: 'invalid_task_order',
        message:
          parsedBody.error.issues[0]?.message ?? 'Orden de tareas inválido.',
      })
    }

    try {
      const taskIds = await reorderTasks(
        database,
        request.authUser!.id,
        parsedBody.data,
      )
      return { taskIds }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })
}
