import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import {
  createMilestoneSchema,
  milestoneFiltersSchema,
  milestoneParamsSchema,
  projectMilestonesParamsSchema,
  reorderMilestonesSchema,
  updateMilestoneSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  MilestoneNotFoundError,
  MilestoneValidationError,
  createMilestone,
  getMilestone,
  getMilestones,
  reorderMilestones,
  updateMilestone,
} from './milestone.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof MilestoneNotFoundError) {
    return reply.code(404).send({
      error: 'milestone_not_found',
      message: error.message,
    })
  }

  if (error instanceof MilestoneValidationError) {
    return reply.code(400).send({
      error: 'invalid_milestone',
      message: error.message,
    })
  }

  throw error
}

export async function registerMilestoneRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get(
    '/:projectId/milestones',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = projectMilestonesParamsSchema.safeParse(request.params)
      const parsedFilters = milestoneFiltersSchema.safeParse(request.query)

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'invalid_project_id',
          message: parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
        })
      }

      if (!parsedFilters.success) {
        return reply.code(400).send({
          error: 'invalid_filters',
          message: parsedFilters.error.issues[0]?.message ?? 'Filtros inválidos.',
        })
      }

      try {
        const items = await getMilestones(
          database,
          request.authUser!.id,
          parsedParams.data.projectId,
          parsedFilters.data,
        )
        return { milestones: items }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:projectId/milestones',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = projectMilestonesParamsSchema.safeParse(request.params)
      const parsedBody = createMilestoneSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'invalid_project_id',
          message: parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
        })
      }

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'invalid_milestone',
          message: parsedBody.error.issues[0]?.message ?? 'Datos de hito inválidos.',
        })
      }

      try {
        const milestone = await createMilestone(
          database,
          request.authUser!.id,
          parsedParams.data.projectId,
          parsedBody.data,
        )
        return reply.code(201).send({ milestone })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.put(
    '/:projectId/milestones/order',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = projectMilestonesParamsSchema.safeParse(request.params)
      const parsedBody = reorderMilestonesSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'invalid_project_id',
          message: parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
        })
      }

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'invalid_milestone_order',
          message: parsedBody.error.issues[0]?.message ?? 'Orden inválido.',
        })
      }

      try {
        const milestones = await reorderMilestones(
          database,
          request.authUser!.id,
          parsedParams.data.projectId,
          parsedBody.data,
        )
        return { milestones }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.get(
    '/:projectId/milestones/:milestoneId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = milestoneParamsSchema.safeParse(request.params)

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'invalid_milestone_id',
          message: parsedParams.error.issues[0]?.message ?? 'Hito inválido.',
        })
      }

      try {
        const milestone = await getMilestone(
          database,
          request.authUser!.id,
          parsedParams.data.projectId,
          parsedParams.data.milestoneId,
        )
        return { milestone }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.patch(
    '/:projectId/milestones/:milestoneId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = milestoneParamsSchema.safeParse(request.params)
      const parsedBody = updateMilestoneSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return reply.code(400).send({
          error: 'invalid_milestone_id',
          message: parsedParams.error.issues[0]?.message ?? 'Hito inválido.',
        })
      }

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'invalid_milestone',
          message: parsedBody.error.issues[0]?.message ?? 'Datos de hito inválidos.',
        })
      }

      try {
        const milestone = await updateMilestone(
          database,
          request.authUser!.id,
          parsedParams.data.projectId,
          parsedParams.data.milestoneId,
          parsedBody.data,
        )
        return { milestone }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}
