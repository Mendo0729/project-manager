import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/health', async () => ({
  ok: true,
  service: 'project-manager-api',
  timestamp: new Date().toISOString(),
}))

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
