import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import {
  reorderSubtasksSchema,
  subtaskParamsSchema,
  taskParamsSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  SubtaskNotFoundError,
  SubtaskValidationError,
  deleteSubtask,
  reorderSubtasks,
} from './subtask.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof SubtaskNotFoundError) {
    return reply.code(404).send({
      error: 'subtask_not_found',
      message: error.message,
    })
  }

  if (error instanceof SubtaskValidationError) {
    return reply.code(400).send({
      error: 'invalid_subtask',
      message: error.message,
    })
  }

  throw error
}

function sendValidationError(
  reply: FastifyReply,
  error: string,
  message: string,
) {
  return reply.code(400).send({ error, message })
}

export async function registerSubtaskManagementRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.put(
    '/:taskId/subtasks/order',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskParamsSchema.safeParse(request.params)
      const parsedBody = reorderSubtasksSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_task_id',
          parsedParams.error.issues[0]?.message ?? 'Tarea inválida.',
        )
      }

      if (!parsedBody.success) {
        return sendValidationError(
          reply,
          'invalid_subtask_order',
          parsedBody.error.issues[0]?.message ?? 'Orden de subtareas inválido.',
        )
      }

      try {
        const subtasks = await reorderSubtasks(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedBody.data,
        )
        return { subtasks }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.delete(
    '/:taskId/subtasks/:subtaskId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = subtaskParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_subtask_id',
          parsedParams.error.issues[0]?.message ?? 'Subtarea inválida.',
        )
      }

      try {
        const deletedSubtaskId = await deleteSubtask(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.subtaskId,
        )
        return { deletedSubtaskId }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}
