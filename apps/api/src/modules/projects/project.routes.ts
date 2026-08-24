import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { DatabaseConnection } from '@project-manager/database'
import {
  createProjectSchema,
  projectFiltersSchema,
  updateProjectSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  ProjectNotFoundError,
  ProjectValidationError,
  createProject,
  getProject,
  getProjects,
  updateProject,
} from './project.service.js'

const projectParamsSchema = z.object({
  projectId: z.string().uuid('Identificador de proyecto inválido.'),
})

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof ProjectNotFoundError) {
    return reply.code(404).send({
      error: 'project_not_found',
      message: error.message,
    })
  }

  if (error instanceof ProjectValidationError) {
    return reply.code(400).send({
      error: 'invalid_project',
      message: error.message,
    })
  }

  throw error
}

export async function registerProjectRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = projectFiltersSchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_filters',
        message: parsed.error.issues[0]?.message ?? 'Filtros inválidos.',
      })
    }

    const items = await getProjects(database, request.authUser!.id, parsed.data)
    return { projects: items }
  })

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_project',
        message: parsed.error.issues[0]?.message ?? 'Datos de proyecto inválidos.',
      })
    }

    try {
      const project = await createProject(
        database,
        request.authUser!.id,
        parsed.data,
      )
      return reply.code(201).send({ project })
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.get('/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.code(400).send({
        error: 'invalid_project_id',
        message: parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
      })
    }

    try {
      const project = await getProject(
        database,
        request.authUser!.id,
        parsedParams.data.projectId,
      )
      return { project }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.patch('/:projectId', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params)
    const parsedBody = updateProjectSchema.safeParse(request.body)

    if (!parsedParams.success) {
      return reply.code(400).send({
        error: 'invalid_project_id',
        message: parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
      })
    }

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: 'invalid_project',
        message: parsedBody.error.issues[0]?.message ?? 'Datos de proyecto inválidos.',
      })
    }

    try {
      const project = await updateProject(
        database,
        request.authUser!.id,
        parsedParams.data.projectId,
        parsedBody.data,
      )
      return { project }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })
}
