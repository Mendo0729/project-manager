import cookie from '@fastify/cookie'
import { createDatabase } from '@project-manager/database'
import Fastify from 'fastify'

import { registerAuthRoutes } from './modules/auth/auth.routes.js'
import { registerMilestoneRoutes } from './modules/milestones/milestone.routes.js'
import { registerProjectRoutes } from './modules/projects/project.routes.js'
import { registerSubtaskManagementRoutes } from './modules/tasks/subtask.routes.js'
import {
  registerProjectTaskRoutes,
  registerTaskRoutes,
} from './modules/tasks/task.routes.js'

const app = Fastify({ logger: true })
const database = createDatabase()

app.decorateRequest('authUser', null)

await app.register(cookie)
await app.register(
  async (authApp) => {
    await registerAuthRoutes(authApp, database)
  },
  { prefix: '/auth' },
)
await app.register(
  async (projectApp) => {
    await registerProjectRoutes(projectApp, database)
    await registerMilestoneRoutes(projectApp, database)
    await registerProjectTaskRoutes(projectApp, database)
  },
  { prefix: '/projects' },
)
await app.register(
  async (taskApp) => {
    await registerTaskRoutes(taskApp, database)
    await registerSubtaskManagementRoutes(taskApp, database)
  },
  { prefix: '/tasks' },
)

app.addHook('onClose', async () => {
  await database.client.end({ timeout: 5 })
})

app.get('/health', async (_request, reply) => {
  try {
    const [databaseStatus] = await database.client<{ ok: number }[]>`
      select 1 as ok
    `

    return {
      ok: databaseStatus?.ok === 1,
      service: 'project-manager-api',
      database: databaseStatus?.ok === 1 ? 'up' : 'unknown',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    app.log.error({ err: error }, 'Database healthcheck failed')

    return reply.code(503).send({
      ok: false,
      service: 'project-manager-api',
      database: 'down',
      timestamp: new Date().toISOString(),
    })
  }
})

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  await database.client.end({ timeout: 5 })
  process.exit(1)
}
