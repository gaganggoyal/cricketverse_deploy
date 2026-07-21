import { NextRequest } from 'next/server'
import { handler, ok, badReq, clampLimit } from '@/lib/api-helpers'
import { query, execute } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * Supabase Realtime pushed new notifications over a websocket. Without it
 * the client polls this endpoint; `since` lets it ask only for rows newer
 * than the last one it saw, so a poll is cheap.
 */
export const GET = handler(async (req: NextRequest) => {
  const user  = await requireUser()
  const since = req.nextUrl.searchParams.get('since')
  const limit = clampLimit(req.nextUrl.searchParams.get('limit'), 30, 100)

  const rows = since
    ? await query(
        `SELECT * FROM notifications WHERE user_id = ? AND created_at > ?
         ORDER BY created_at DESC LIMIT ?`,
        [user.id, new Date(since).toISOString().slice(0, 19).replace('T', ' '), limit])
    : await query(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [user.id, limit])

  return ok(rows)
})

/** Mark one notification read, or all of them. */
export const PATCH = handler(async (req: NextRequest) => {
  const user = await requireUser()
  const { id, all } = await req.json().catch(() => ({}))

  if (all) {
    await execute('UPDATE notifications SET `read` = 1 WHERE user_id = ? AND `read` = 0', [user.id])
    return ok({ ok: true })
  }
  if (!id) return badReq('Supply an id, or all: true')

  await execute('UPDATE notifications SET `read` = 1 WHERE id = ? AND user_id = ?', [id, user.id])
  return ok({ ok: true })
})
