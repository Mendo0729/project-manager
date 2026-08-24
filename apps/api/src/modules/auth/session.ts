import { createHash, randomBytes } from 'node:crypto'

import type { AuthUser } from '@project-manager/schemas'
import type { DatabaseConnection } from '@project-manager/database'
import { sessions, users } from '@project-manager/database'
import { and, eq, gt, lt } from 'drizzle-orm'

export const SESSION_COOKIE_NAME = 'pm_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  database: DatabaseConnection,
  userId: string,
) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

  await database.db.delete(sessions).where(lt(sessions.expiresAt, new Date()))

  await database.db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
}

export async function getSessionUser(
  database: DatabaseConnection,
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token) {
    return null
  }

  const tokenHash = hashSessionToken(token)

  const [result] = await database.db
    .select({
      sessionId: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      timezone: users.timezone,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!result) {
    return null
  }

  if (Date.now() - result.lastUsedAt.getTime() > 5 * 60 * 1000) {
    await database.db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, result.sessionId))
  }

  return {
    id: result.id,
    email: result.email,
    displayName: result.displayName,
    timezone: result.timezone,
  }
}

export async function revokeSession(
  database: DatabaseConnection,
  token: string | undefined,
) {
  if (!token) {
    return
  }

  await database.db
    .delete(sessions)
    .where(eq(sessions.tokenHash, hashSessionToken(token)))
}

export function sessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  }
}
