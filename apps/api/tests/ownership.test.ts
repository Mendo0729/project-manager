import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import test from 'node:test'

import cookie from '@fastify/cookie'
import {
  activityLogs,
  createDatabase,
  milestones,
  projects,
  sessions,
  tags,
  taskChecklists,
  taskTags,
  tasks,
  users,
  type DatabaseConnection,
} from '@project-manager/database'
import Fastify from 'fastify'
import { eq } from 'drizzle-orm'

import { registerMilestoneRoutes } from '../src/modules/milestones/milestone.routes.js'
import { registerProjectRoutes } from '../src/modules/projects/project.routes.js'
import { registerChecklistRoutes } from '../src/modules/tasks/checklist.routes.js'
import { registerSubtaskManagementRoutes } from '../src/modules/tasks/subtask.routes.js'
import { registerTaskOrderRoutes } from '../src/modules/tasks/task-order.routes.js'
import { registerTagRoutes, registerTaskTagRoutes } from '../src/modules/tasks/tag.routes.js'
import { registerProjectTaskRoutes, registerTaskRoutes } from '../src/modules/tasks/task.routes.js'

class RollbackFixture extends Error {}

test('private routes reject cross-user IDs without changing foreign records', async () => {
  const database = createDatabase()

  try {
    await database.db.transaction(async (transaction) => {
      const scopedDatabase: DatabaseConnection = {
        ...database,
        db: transaction as unknown as DatabaseConnection['db'],
      }
      const marker = randomUUID()
      const [userA, userB] = await transaction.insert(users).values([
        { email: `ownership-a-${marker}@example.test`, displayName: 'A' },
        { email: `ownership-b-${marker}@example.test`, displayName: 'B' },
      ]).returning()
      assert.ok(userA && userB)

      const tokenA = randomUUID()
      const tokenB = randomUUID()
      await transaction.insert(sessions).values([
        { userId: userA.id, tokenHash: createHash('sha256').update(tokenA).digest('hex'), expiresAt: new Date(Date.now() + 60_000) },
        { userId: userB.id, tokenHash: createHash('sha256').update(tokenB).digest('hex'), expiresAt: new Date(Date.now() + 60_000) },
      ])

      const [projectA, projectB] = await transaction.insert(projects).values([
        { userId: userA.id, name: 'A project' },
        { userId: userB.id, name: 'B project' },
      ]).returning()
      assert.ok(projectA && projectB)

      const [milestoneA, milestoneA2, milestoneB] = await transaction.insert(milestones).values([
        { projectId: projectA.id, name: 'A milestone' },
        { projectId: projectA.id, name: 'A second milestone', position: 1 },
        { projectId: projectB.id, name: 'B milestone' },
      ]).returning()
      assert.ok(milestoneA && milestoneA2 && milestoneB)

      const [taskA, taskB] = await transaction.insert(tasks).values([
        { userId: userA.id, projectId: projectA.id, milestoneId: milestoneA.id, title: 'A task' },
        { userId: userB.id, projectId: projectB.id, milestoneId: milestoneB.id, title: 'B task' },
      ]).returning()
      assert.ok(taskA && taskB)

      const [subtaskA, subtaskA2, subtaskB] = await transaction.insert(tasks).values([
        { userId: userA.id, projectId: projectA.id, milestoneId: milestoneA.id, parentTaskId: taskA.id, title: 'A subtask' },
        { userId: userA.id, projectId: projectA.id, milestoneId: milestoneA.id, parentTaskId: taskA.id, title: 'A second subtask', position: 1 },
        { userId: userB.id, projectId: projectB.id, milestoneId: milestoneB.id, parentTaskId: taskB.id, title: 'B subtask' },
      ]).returning()
      const [itemB] = await transaction.insert(taskChecklists).values({ taskId: taskB.id, title: 'B item' }).returning()
      const [tagA, tagB] = await transaction.insert(tags).values([
        { userId: userA.id, name: 'A tag' },
        { userId: userB.id, name: 'B tag' },
      ]).returning()
      assert.ok(subtaskA && subtaskA2 && subtaskB && itemB && tagA && tagB)
      await transaction.insert(taskTags).values({ taskId: taskB.id, tagId: tagB.id })

      const app = Fastify()
      app.decorateRequest('authUser', null)
      await app.register(cookie)
      await app.register(async (projectApp) => {
        await registerProjectRoutes(projectApp, scopedDatabase)
        await registerMilestoneRoutes(projectApp, scopedDatabase)
        await registerProjectTaskRoutes(projectApp, scopedDatabase)
      }, { prefix: '/projects' })
      await app.register(async (taskApp) => {
        await registerTaskRoutes(taskApp, scopedDatabase)
        await registerSubtaskManagementRoutes(taskApp, scopedDatabase)
        await registerChecklistRoutes(taskApp, scopedDatabase)
        await registerTaskOrderRoutes(taskApp, scopedDatabase)
        await registerTaskTagRoutes(taskApp, scopedDatabase)
      }, { prefix: '/tasks' })
      await app.register(async (tagApp) => {
        await registerTagRoutes(tagApp, scopedDatabase)
      }, { prefix: '/tags' })

      type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
      const request = (token: string, method: Method, url: string, payload?: object) =>
        app.inject({ method, url, payload, headers: { cookie: `pm_session=${token}` } })

      try {
        const ownProjects = await request(tokenA, 'GET', '/projects')
        assert.equal(ownProjects.headers['cache-control'], 'no-store')
        assert.deepEqual(ownProjects.json().projects.map((row: { id: string }) => row.id), [projectA.id])
        const ownTasks = await request(tokenA, 'GET', '/tasks')
        assert.deepEqual(ownTasks.json().tasks.map((row: { id: string }) => row.id), [taskA.id])
        const ownTags = await request(tokenA, 'GET', '/tags')
        assert.deepEqual(ownTags.json().tags.map((row: { id: string }) => row.id), [tagA.id])
        assert.equal((await request(tokenA, 'GET', `/projects/${projectA.id}/milestones/${milestoneA.id}`)).statusCode, 200)
        assert.equal((await request(tokenA, 'GET', `/tasks/${taskA.id}`)).statusCode, 200)
        assert.equal((await request(tokenA, 'PUT', `/projects/${projectA.id}/milestones/order`, { milestoneIds: [milestoneA2.id, milestoneA.id] })).statusCode, 200)
        assert.equal((await request(tokenA, 'PUT', `/tasks/${taskA.id}/subtasks/order`, { subtaskIds: [subtaskA2.id, subtaskA.id] })).statusCode, 200)
        assert.equal((await request(tokenA, 'PUT', `/projects/${projectA.id}/milestones/order`, { milestoneIds: [milestoneA.id] })).statusCode, 400)
        assert.equal((await request(tokenA, 'PUT', `/tasks/${taskA.id}/subtasks/order`, { subtaskIds: [subtaskA.id] })).statusCode, 400)

        const forbidden: Array<[Method, string, object?]> = [
          ['GET', `/projects/${projectB.id}`],
          ['PATCH', `/projects/${projectB.id}`, { name: 'Tampered' }],
          ['GET', `/projects/${projectB.id}/milestones`],
          ['POST', `/projects/${projectB.id}/milestones`, { name: 'Tampered' }],
          ['PUT', `/projects/${projectB.id}/milestones/order`, { milestoneIds: [milestoneB.id] }],
          ['GET', `/projects/${projectB.id}/milestones/${milestoneB.id}`],
          ['PATCH', `/projects/${projectB.id}/milestones/${milestoneB.id}`, { name: 'Tampered' }],
          ['GET', `/projects/${projectA.id}/milestones/${milestoneB.id}`],
          ['PATCH', `/projects/${projectA.id}/milestones/${milestoneB.id}`, { name: 'Tampered' }],
          ['PUT', `/projects/${projectA.id}/milestones/order`, { milestoneIds: [milestoneB.id] }],
          ['GET', `/projects/${projectB.id}/tasks`],
          ['POST', `/projects/${projectB.id}/tasks`, { title: 'Tampered' }],
          ['GET', `/projects/${projectB.id}/milestones/${milestoneB.id}/tasks`],
          ['POST', `/projects/${projectB.id}/milestones/${milestoneB.id}/tasks`, { title: 'Tampered' }],
          ['GET', `/projects/${projectA.id}/milestones/${milestoneB.id}/tasks`],
          ['POST', `/projects/${projectA.id}/milestones/${milestoneB.id}/tasks`, { title: 'Tampered' }],
          ['GET', `/tasks?projectId=${projectB.id}`],
          ['GET', `/tasks?projectId=${projectA.id}&milestoneId=${milestoneB.id}`],
          ['GET', `/tasks?parentTaskId=${taskB.id}`],
          ['POST', '/tasks', { title: 'Tampered', projectId: projectB.id }],
          ['POST', '/tasks', { title: 'Tampered', projectId: projectA.id, milestoneId: milestoneB.id }],
          ['PATCH', `/tasks/${taskA.id}`, { projectId: projectB.id }],
          ['PATCH', `/tasks/${taskA.id}`, { milestoneId: milestoneB.id }],
          ['GET', `/tasks/${taskB.id}`],
          ['PATCH', `/tasks/${taskB.id}`, { title: 'Tampered' }],
          ['PUT', '/tasks/order', { taskIds: [taskB.id] }],
          ['GET', `/tasks/${taskB.id}/subtasks`],
          ['POST', `/tasks/${taskB.id}/subtasks`, { title: 'Tampered' }],
          ['PATCH', `/tasks/${taskB.id}/subtasks/${subtaskB.id}`, { title: 'Tampered' }],
          ['PATCH', `/tasks/${taskA.id}/subtasks/${subtaskB.id}`, { title: 'Tampered' }],
          ['PUT', `/tasks/${taskB.id}/subtasks/order`, { subtaskIds: [subtaskB.id] }],
          ['PUT', `/tasks/${taskA.id}/subtasks/order`, { subtaskIds: [subtaskB.id] }],
          ['DELETE', `/tasks/${taskB.id}/subtasks/${subtaskB.id}`],
          ['DELETE', `/tasks/${taskA.id}/subtasks/${subtaskB.id}`],
          ['GET', `/tasks/${taskB.id}/checklist`],
          ['POST', `/tasks/${taskB.id}/checklist`, { title: 'Tampered' }],
          ['PATCH', `/tasks/${taskB.id}/checklist/${itemB.id}`, { title: 'Tampered' }],
          ['PATCH', `/tasks/${taskA.id}/checklist/${itemB.id}`, { title: 'Tampered' }],
          ['PUT', `/tasks/${taskB.id}/checklist/order`, { itemIds: [itemB.id] }],
          ['PUT', `/tasks/${taskA.id}/checklist/order`, { itemIds: [itemB.id] }],
          ['DELETE', `/tasks/${taskB.id}/checklist/${itemB.id}`],
          ['DELETE', `/tasks/${taskA.id}/checklist/${itemB.id}`],
          ['GET', `/tasks/${taskB.id}/tags`],
          ['POST', `/tasks/${taskA.id}/tags/${tagB.id}`],
          ['POST', `/tasks/${taskB.id}/tags/${tagA.id}`],
          ['DELETE', `/tasks/${taskB.id}/tags/${tagB.id}`],
        ]

        const logCountBefore = (await transaction.select().from(activityLogs).where(eq(activityLogs.userId, userA.id))).length
        const foreignLogCountBefore = (await transaction.select().from(activityLogs).where(eq(activityLogs.userId, userB.id))).length
        for (const [method, url, payload] of forbidden) {
          const response = await request(tokenA, method, url, payload)
          assert.equal(response.statusCode, 404, `${method} ${url}: ${response.body}`)
        }
        assert.equal((await transaction.select().from(activityLogs).where(eq(activityLogs.userId, userA.id))).length, logCountBefore)
        assert.equal((await transaction.select().from(activityLogs).where(eq(activityLogs.userId, userB.id))).length, foreignLogCountBefore)
        assert.equal((await transaction.select().from(projects).where(eq(projects.id, projectB.id)))[0]?.name, 'B project')
        assert.equal((await transaction.select().from(milestones).where(eq(milestones.id, milestoneB.id)))[0]?.name, 'B milestone')
        assert.equal((await transaction.select().from(tasks).where(eq(tasks.id, taskB.id)))[0]?.title, 'B task')
        assert.equal((await transaction.select().from(tasks).where(eq(tasks.id, subtaskB.id)))[0]?.title, 'B subtask')
        assert.equal((await transaction.select().from(taskChecklists).where(eq(taskChecklists.id, itemB.id)))[0]?.title, 'B item')
        assert.deepEqual(await transaction.select().from(taskTags).where(eq(taskTags.taskId, taskB.id)), [{ taskId: taskB.id, tagId: tagB.id }])
        const anonymous = await request('', 'GET', `/tasks/${taskA.id}`)
        assert.equal(anonymous.statusCode, 401)
        assert.equal(anonymous.headers['cache-control'], 'no-store')
        assert.equal((await request(tokenB, 'GET', `/tasks/${taskA.id}`)).statusCode, 404)
      } finally {
        await app.close()
      }

      throw new RollbackFixture()
    })
  } catch (error) {
    if (!(error instanceof RollbackFixture)) throw error
  } finally {
    await database.client.end({ timeout: 5 })
  }
})
