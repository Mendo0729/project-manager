import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as authSchema from './auth-schema.js'
import * as coreSchema from './schema.js'

const schema = {
  ...coreSchema,
  ...authSchema,
}

export type DatabaseConnection = ReturnType<typeof createDatabase>

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  const db = drizzle(client, { schema })

  return { db, client }
}

export * from './auth-schema.js'
export * from './schema.js'
