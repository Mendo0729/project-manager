import { argon2id, hash } from 'argon2'

import { createDatabase, users } from '@project-manager/database'
import { initialUserSchema } from '@project-manager/schemas'

const parsed = initialUserSchema.safeParse({
  email: process.env.INITIAL_USER_EMAIL,
  password: process.env.INITIAL_USER_PASSWORD,
  displayName: process.env.INITIAL_USER_NAME,
})

if (!parsed.success) {
  console.error('Configuración inválida para el usuario inicial:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

const database = createDatabase()

try {
  const existingUsers = await database.db
    .select({ id: users.id })
    .from(users)
    .limit(1)

  if (existingUsers.length > 0) {
    throw new Error(
      'Ya existe al menos un usuario. El comando de bootstrap no crea usuarios adicionales.',
    )
  }

  const passwordHash = await hash(parsed.data.password, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })

  const [createdUser] = await database.db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      displayName: parsed.data.displayName,
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })

  console.log('Usuario inicial creado correctamente:')
  console.log(createdUser)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await database.client.end({ timeout: 5 })
}
