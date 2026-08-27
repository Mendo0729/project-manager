import type { FastifyInstance, FastifyReply } from 'fastify'

import type { DatabaseConnection } from '@project-manager/database'
import {
  createSubtaskSchema,
  createTaskSchema,
  milestoneTasksParamsSchema,
  projectTasksParamsSchema,
  subtaskParamsSchema,
  taskFiltersSchema,
  taskParamsSchema,
  updateSubtaskSchema,
  updateTaskSchema,
} from '@project-manager/schemas'

import { createRequireAuth } from '../../common/http/require-auth.js'
import {
  TaskNotFoundError,
  TaskValidationError,
  createSubtask,
  createTask,
  getSubtasks,
  getTask,
  getTasks,
  updateSubtask,
  updateTask,
} from './task.service.js'

function sendKnownError(error: unknown, reply: FastifyReply) {
  if (error instanceof TaskNotFoundError) {
    return reply.code(404).send({
      error: 'task_not_found',
      message: error.message,
    })
  }

  if (error instanceof TaskValidationError) {
    return reply.code(400).send({
      error: 'invalid_task',
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

export async function registerTaskRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsedFilters = taskFiltersSchema.safeParse(request.query)

    if (!parsedFilters.success) {
      return sendValidationError(
        reply,
        'invalid_filters',
        parsedFilters.error.issues[0]?.message ?? 'Filtros inválidos.',
      )
    }

    try {
      const tasks = await getTasks(
        database,
        request.authUser!.id,
        parsedFilters.data,
      )
      return { tasks }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const parsedBody = createTaskSchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(
        reply,
        'invalid_task',
        parsedBody.error.issues[0]?.message ?? 'Datos de tarea inválidos.',
      )
    }

    try {
      const task = await createTask(
        database,
        request.authUser!.id,
        parsedBody.data,
      )
      return reply.code(201).send({ task })
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.get('/:taskId', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = taskParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(
        reply,
        'invalid_task_id',
        parsedParams.error.issues[0]?.message ?? 'Tarea inválida.',
      )
    }

    try {
      const task = await getTask(
        database,
        request.authUser!.id,
        parsedParams.data.taskId,
      )
      return { task }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.patch('/:taskId', { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = taskParamsSchema.safeParse(request.params)
    const parsedBody = updateTaskSchema.safeParse(request.body)

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
        'invalid_task',
        parsedBody.error.issues[0]?.message ?? 'Datos de tarea inválidos.',
      )
    }

    try {
      const task = await updateTask(
        database,
        request.authUser!.id,
        parsedParams.data.taskId,
        parsedBody.data,
      )
      return { task }
    } catch (error) {
      return sendKnownError(error, reply)
    }
  })

  app.get(
    '/:taskId/subtasks',
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
        const subtasks = await getSubtasks(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
        )
        return { subtasks }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:taskId/subtasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = taskParamsSchema.safeParse(request.params)
      const parsedBody = createSubtaskSchema.safeParse(request.body)

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
          'invalid_subtask',
          parsedBody.error.issues[0]?.message ?? 'Datos de subtarea inválidos.',
        )
      }

      try {
        const subtask = await createSubtask(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedBody.data,
        )
        return reply.code(201).send({ subtask })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.patch(
    '/:taskId/subtasks/:subtaskId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = subtaskParamsSchema.safeParse(request.params)
      const parsedBody = updateSubtaskSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_subtask_id',
          parsedParams.error.issues[0]?.message ?? 'Subtarea inválida.',
        )
      }

      if (!parsedBody.success) {
        return sendValidationError(
          reply,
          'invalid_subtask',
          parsedBody.error.issues[0]?.message ?? 'Datos de subtarea inválidos.',
        )
      }

      try {
        const subtask = await updateSubtask(
          database,
          request.authUser!.id,
          parsedParams.data.taskId,
          parsedParams.data.subtaskId,
          parsedBody.data,
        )
        return { subtask }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}

export async function registerProjectTaskRoutes(
  app: FastifyInstance,
  database: DatabaseConnection,
) {
  const requireAuth = createRequireAuth(database)

  app.get(
    '/:projectId/tasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = projectTasksParamsSchema.safeParse(request.params)
      const parsedFilters = taskFiltersSchema.safeParse(request.query)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_project_id',
          parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
        )
      }

      if (!parsedFilters.success) {
        return sendValidationError(
          reply,
          'invalid_filters',
          parsedFilters.error.issues[0]?.message ?? 'Filtros inválidos.',
        )
      }

      try {
        const tasks = await getTasks(database, request.authUser!.id, {
          ...parsedFilters.data,
          projectId: parsedParams.data.projectId,
          personal: undefined,
        })
        return { tasks }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:projectId/tasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = projectTasksParamsSchema.safeParse(request.params)
      const parsedBody = createTaskSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_project_id',
          parsedParams.error.issues[0]?.message ?? 'Proyecto inválido.',
        )
      }

      if (!parsedBody.success) {
        return sendValidationError(
          reply,
          'invalid_task',
          parsedBody.error.issues[0]?.message ?? 'Datos de tarea inválidos.',
        )
      }

      try {
        const task = await createTask(database, request.authUser!.id, {
          ...parsedBody.data,
          projectId: parsedParams.data.projectId,
          milestoneId: null,
        })
        return reply.code(201).send({ task })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.get(
    '/:projectId/milestones/:milestoneId/tasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = milestoneTasksParamsSchema.safeParse(request.params)
      const parsedFilters = taskFiltersSchema.safeParse(request.query)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_milestone_id',
          parsedParams.error.issues[0]?.message ?? 'Hito inválido.',
        )
      }

      if (!parsedFilters.success) {
        return sendValidationError(
          reply,
          'invalid_filters',
          parsedFilters.error.issues[0]?.message ?? 'Filtros inválidos.',
        )
      }

      try {
        const tasks = await getTasks(database, request.authUser!.id, {
          ...parsedFilters.data,
          projectId: parsedParams.data.projectId,
          milestoneId: parsedParams.data.milestoneId,
          personal: undefined,
        })
        return { tasks }
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )

  app.post(
    '/:projectId/milestones/:milestoneId/tasks',
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsedParams = milestoneTasksParamsSchema.safeParse(request.params)
      const parsedBody = createTaskSchema.safeParse(request.body)

      if (!parsedParams.success) {
        return sendValidationError(
          reply,
          'invalid_milestone_id',
          parsedParams.error.issues[0]?.message ?? 'Hito inválido.',
        )
      }

      if (!parsedBody.success) {
        return sendValidationError(
          reply,
          'invalid_task',
          parsedBody.error.issues[0]?.message ?? 'Datos de tarea inválidos.',
        )
      }

      try {
        const task = await createTask(database, request.authUser!.id, {
          ...parsedBody.data,
          projectId: parsedParams.data.projectId,
          milestoneId: parsedParams.data.milestoneId,
        })
        return reply.code(201).send({ task })
      } catch (error) {
        return sendKnownError(error, reply)
      }
    },
  )
}
