import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import test from 'node:test'

import cookie from '@fastify/cookie'
import {
  createDatabase,
  milestones,
  projects,
  sessions,
  tasks,
  users,
  type DatabaseConnection,
} from '@project-manager/database'
import Fastify from 'fastify'
import { eq } from 'drizzle-orm'

import { registerMilestoneRoutes } from '../src/modules/milestones/milestone.routes.js'
import { registerProjectRoutes } from '../src/modules/projects/project.routes.js'
import { listProjectMilestoneProgressRows } from '../src/modules/projects/project.repository.js'

class RollbackFixture extends Error {}

test('project progress follows owned milestone and task progress', async () => {
  const database = createDatabase()

  try {
    await database.db.transaction(async (transaction) => {
      const scopedDatabase: DatabaseConnection = {
        ...database,
        db: transaction as unknown as DatabaseConnection['db'],
      }
      const marker = randomUUID()
      const [userA, userB] = await transaction
        .insert(users)
        .values([
          { email: `progress-a-${marker}@example.test`, displayName: 'A' },
          { email: `progress-b-${marker}@example.test`, displayName: 'B' },
        ])
        .returning()

      assert.ok(userA && userB)

      const tokenA = randomUUID()
      const tokenB = randomUUID()
      await transaction.insert(sessions).values([
        {
          userId: userA.id,
          tokenHash: createHash('sha256').update(tokenA).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
        {
          userId: userB.id,
          tokenHash: createHash('sha256').update(tokenB).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      ])

      const [automatic, empty, canceledOnly, manual, completed, foreign] = await transaction
        .insert(projects)
        .values([
          { userId: userA.id, name: 'Automatic' },
          { userId: userA.id, name: 'Empty' },
          { userId: userA.id, name: 'Canceled only' },
          { userId: userA.id, name: 'Manual', progressMode: 'manual', manualProgress: 42, status: 'completed' },
          { userId: userA.id, name: 'Completed without milestones', status: 'completed' },
          { userId: userB.id, name: 'Foreign' },
        ])
        .returning()

      assert.ok(automatic && empty && canceledOnly && manual && completed && foreign)

      const [partial, done, canceled, canceledAlone, foreignMilestone] = await transaction
        .insert(milestones)
        .values([
          { projectId: automatic.id, name: 'Partial', status: 'active', weight: 2 },
          { projectId: automatic.id, name: 'Done', status: 'completed', weight: 1 },
          { projectId: automatic.id, name: 'Canceled', status: 'canceled', weight: 100 },
          { projectId: canceledOnly.id, name: 'Canceled alone', status: 'canceled', weight: 5 },
          { projectId: foreign.id, name: 'Foreign milestone', status: 'completed', weight: 100 },
        ])
        .returning()

      assert.ok(partial && done && canceled && canceledAlone && foreignMilestone)

      const taskRows = await transaction.insert(tasks).values([
        { userId: userA.id, projectId: automatic.id, milestoneId: partial.id, title: 'Done task', status: 'completed' },
        { userId: userA.id, projectId: automatic.id, milestoneId: partial.id, title: 'Pending task' },
        // A malformed cross-user association must not affect A's progress.
        { userId: userB.id, projectId: foreign.id, milestoneId: partial.id, title: 'Foreign task', status: 'completed' },
      ]).returning()

      const scopedRows = await listProjectMilestoneProgressRows(
        scopedDatabase,
        userA.id,
        [automatic.id, foreign.id],
      )
      assert.equal(scopedRows.length, 3)
      assert.ok(scopedRows.every((row) => row.projectId === automatic.id))

      const app = Fastify()
      app.decorateRequest('authUser', null)
      await app.register(cookie)
      await app.register(
        async (projectApp) => {
          await registerProjectRoutes(projectApp, scopedDatabase)
          await registerMilestoneRoutes(projectApp, scopedDatabase)
        },
        { prefix: '/projects' },
      )

      const request = (token: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, payload?: object) =>
        app.inject({ method, url, payload, headers: { cookie: `pm_session=${token}` } })

      try {
        const listA = await request(tokenA, 'GET', '/projects')
        assert.equal(listA.statusCode, 200)
        const ownProjects = listA.json().projects as Array<{ id: string; progress: number }>
        assert.equal(ownProjects.length, 5)
        assert.equal(ownProjects.find((row) => row.id === automatic.id)?.progress, 67)
        assert.equal(ownProjects.find((row) => row.id === empty.id)?.progress, 0)
        assert.equal(ownProjects.find((row) => row.id === canceledOnly.id)?.progress, 0)
        assert.equal(ownProjects.find((row) => row.id === manual.id)?.progress, 42)
        assert.equal(ownProjects.find((row) => row.id === completed.id)?.progress, 0)
        assert.ok(!ownProjects.some((row) => row.id === foreign.id))

        const detailA = await request(tokenA, 'GET', `/projects/${automatic.id}`)
        assert.equal(detailA.statusCode, 200)
        assert.equal(detailA.json().project.progress, 67)

        const listB = await request(tokenB, 'GET', '/projects')
        assert.equal(listB.statusCode, 200)
        assert.deepEqual(listB.json().projects.map((row: { id: string }) => row.id), [foreign.id])
        assert.equal(listB.json().projects[0].progress, 100)

        assert.equal((await request(tokenA, 'GET', `/projects/${foreign.id}`)).statusCode, 404)
        assert.equal((await request(tokenB, 'GET', `/projects/${automatic.id}`)).statusCode, 404)
        assert.equal(
          (await request(tokenA, 'PATCH', `/projects/${foreign.id}`, { name: 'Changed' })).statusCode,
          404,
        )
        assert.equal((await request(tokenB, 'GET', `/projects/${foreign.id}`)).json().project.name, 'Foreign')
        assert.equal((await request(tokenA, 'GET', `/projects/${automatic.id}`)).json().project.progress, 67)
        assert.equal((await request(tokenA, 'GET', '/projects')).json().projects.length, 5)
        assert.equal((await request(tokenA, 'GET', `/projects/${automatic.id}/milestones/${foreignMilestone.id}`)).statusCode, 404)
        assert.equal((await request(tokenA, 'GET', `/projects/${foreign.id}/milestones`)).statusCode, 404)
        assert.equal((await request(tokenA, 'POST', `/projects/${foreign.id}/milestones`, { name: 'No access' })).statusCode, 404)
        assert.equal((await request(tokenA, 'PUT', `/projects/${foreign.id}/milestones/order`, { milestoneIds: [foreignMilestone.id] })).statusCode, 404)
        assert.equal((await request(tokenA, 'PATCH', `/projects/${foreign.id}/milestones/${foreignMilestone.id}`, { name: 'No access' })).statusCode, 404)
        assert.equal((await request('', 'GET', `/projects/${automatic.id}`)).statusCode, 401)

        const pendingTask = taskRows.find((row) => row.title === 'Pending task')
        assert.ok(pendingTask)
        await transaction.update(tasks).set({ status: 'completed' }).where(eq(tasks.id, pendingTask.id))
        assert.equal((await request(tokenA, 'GET', `/projects/${automatic.id}`)).json().project.progress, 100)
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
