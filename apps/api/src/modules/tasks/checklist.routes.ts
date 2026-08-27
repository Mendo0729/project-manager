import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import {
  checklistItemParamsSchema,
  createChecklistItemSchema,
  taskParamsSchema,
  updateChecklistItemSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  ChecklistNotFoundError,
  createChecklistItem,
  deleteChecklistItem,
  getChecklist,
  updateChecklistItem,
} from './checklist.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof ChecklistNotFoundError) {
    return reply.code(404).send({
      error: 'checklist_not_found',
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

export async function registerChecklistRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get(
    '/:taskId/checklist',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_task_id',
          parsedParams.error.issues[0]?.message ?? 'Tarea inválida.',
        )
      }

      try {
        const checklist = await getChecklist(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
        )
        return { checklist }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:taskId/checklist',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskParamsSchema.safeParse(request.params)
      const parsedBody = createChecklistItemSchema.safeParse(request.body)

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
          'invalid_checklist_item',
          parsedBody.error.issues[0]?.message ?? 'Elemento de checklist inválido.',
        )
      }

      try {
        const item = await createChecklistItem(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedBody.data,
        )
        return reply.code(201).send({ item })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.patch(
    '/:taskId/checklist/:itemId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = checklistItemParamsSchema.safeParse(request.params)
      const parsedBody = updateChecklistItemSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_checklist_item_id',
          parsedParams.error.issues[0]?.message ?? 'Elemento de checklist inválido.',
        )
      }

      if (!parsedBody.success) {
        return sendValidationError(
          reply,
          'invalid_checklist_item',
          parsedBody.error.issues[0]?.message ?? 'Elemento de checklist inválido.',
        )
      }

      try {
        const item = await updateChecklistItem(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.itemId,
          parsedBody.data,
        )
        return { item }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.delete(
    '/:taskId/checklist/:itemId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = checklistItemParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_checklist_item_id',
          parsedParams.error.issues[0]?.message ?? 'Elemento de checklist inválido.',
        )
      }

      try {
        const deletedChecklistItemId = await deleteChecklistItem(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.itemId,
        )
        return { deletedChecklistItemId }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}
