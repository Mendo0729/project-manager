import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import {
  createTagSchema,
  taskParamsSchema,
  taskTagParamsSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  TagConflictError,
  TagNotFoundError,
  assignTaskTag,
  createTag,
  getTags,
  getTaskTags,
  removeTaskTag,
} from './tag.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof TagNotFoundError) {
    return reply.code(404).send({
      error: 'tag_not_found',
      message: error.message,
    })
  }

  if (error instanceof TagConflictError) {
    return reply.code(409).send({
      error: 'tag_conflict',
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

export async function registerTagRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get('/', { preHandler: requireAuth }, async (request) => {
    const tags = await getTags(database, request.authUser!.id)
    return { tags }
  })

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsedBody = createTagSchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(
        reply,
        'invalid_tag',
        parsedBody.error.issues[0]?.message ?? 'Etiqueta inválida.',
      )
    }

    try {
      const tag = await createTag(
        database,
        request.authUser!.id,
        parsedBody.data,
      )
      return reply.code(201).send({ tag })
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })
}

export async function registerTaskTagRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get(
    '/:taskId/tags',
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
        const tags = await getTaskTags(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
        )
        return { tags }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:taskId/tags/:tagId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskTagParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_task_tag_id',
          parsedParams.error.issues[0]?.message ?? 'Etiqueta inválida.',
        )
      }

      try {
        const result = await assignTaskTag(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.tagId,
        )
        return reply.code(result.added ? 201 : 200).send({ tag: result.tag })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.delete(
    '/:taskId/tags/:tagId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskTagParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_task_tag_id',
          parsedParams.error.issues[0]?.message ?? 'Etiqueta inválida.',
        )
      }

      try {
        const removedTagId = await removeTaskTag(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.tagId,
        )
        return { removedTagId }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}
