import { NextRequest } from 'next/server'
import { handler, ok, badReq, clampLimit } from '@/lib/api-helpers'
import { query, transaction, toJson } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const MAX = 100

export const GET = handler(async (req: NextRequest) => {
  const user = await requireUser()
  return ok(await query(
    `SELECT * FROM match_history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?`,
    [user.id, clampLimit(req.nextUrl.searchParams.get('limit'), 50, MAX)]
  ))
})

/**
 * Upsert one match or a batch. The batch form is what adoptLocalMatches()
 * uses to migrate a signed-out device's localStorage history into the
 * account on first sign-in.
 *
 * user_id is taken from the session, never the payload — otherwise a
 * caller could write rows into another account.
 */
export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser()
  const body = await req.json().catch(() => null)
  const rows = Array.isArray(body) ? body : [body]

  if (!rows.length || rows.some(r => !r?.id || !r?.innings)) {
    return badReq('Each match needs an id and an innings array')
  }
  if (rows.length > MAX) return badReq(`At most ${MAX} matches per request`)

  await transaction(async (conn) => {
    for (const m of rows) {
      await conn.execute(
        `INSERT INTO match_history
           (id, user_id, played_at, format, stadium, team_a_name, team_b_name,
            winner_name, margin, potm, innings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           played_at = VALUES(played_at), format = VALUES(format),
           stadium = VALUES(stadium), team_a_name = VALUES(team_a_name),
           team_b_name = VALUES(team_b_name), winner_name = VALUES(winner_name),
           margin = VALUES(margin), potm = VALUES(potm), innings = VALUES(innings)`,
        [
          m.id, user.id,
          // Client sends an ISO string; MySQL DATETIME wants 'YYYY-MM-DD HH:MM:SS'.
          m.played_at ? new Date(m.played_at).toISOString().slice(0, 19).replace('T', ' ') : null,
          m.format ?? '', m.stadium ?? '',
          m.team_a_name ?? 'Team A', m.team_b_name ?? 'Team B',
          m.winner_name ?? '', m.margin ?? '',
          toJson(m.potm ?? null), toJson(m.innings),
        ]
      )
    }
  })

  return ok({ saved: rows.length })
})
