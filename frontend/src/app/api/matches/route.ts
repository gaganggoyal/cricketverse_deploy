import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { handler, ok, badReq, clampLimit } from '@/lib/api-helpers'
import { query, queryOne, execute, toJson } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * Own matches only. This is the app-layer replacement for the RLS policy
 * `using (auth.uid() = user_id)` — the filter is no longer optional, and
 * no client-supplied user_id is trusted.
 */
export const GET = handler(async (req: NextRequest) => {
  const user  = await requireUser()
  const limit = clampLimit(req.nextUrl.searchParams.get('limit'), 20, 100)

  return ok(await query(
    `SELECT * FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    [user.id, limit]
  ))
})

export const POST = handler(async (req: NextRequest) => {
  const user = await requireUser()
  const b    = await req.json().catch(() => ({}))

  if (!b.format || !b.total_overs || !b.pitch_type || !b.time_of_play) {
    return badReq('format, total_overs, pitch_type and time_of_play are required')
  }
  if (!Array.isArray(b.team_a_players) || !Array.isArray(b.team_b_players)) {
    return badReq('team_a_players and team_b_players must be arrays')
  }

  const id = randomUUID()
  await execute(
    `INSERT INTO matches
       (id, user_id, format, total_overs, stadium_id, pitch_type, time_of_play,
        team_a_name, team_b_name, team_a_players, team_b_players, toss_winner, toss_decision)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, user.id, b.format, b.total_overs, b.stadium_id ?? null, b.pitch_type, b.time_of_play,
      b.team_a_name ?? 'Team A', b.team_b_name ?? 'Team B',
      toJson(b.team_a_players), toJson(b.team_b_players),
      b.toss_winner ?? null, b.toss_decision ?? null,
    ]
  )

  return ok(await queryOne(`SELECT * FROM matches WHERE id = ?`, [id]), { status: 201 })
})
