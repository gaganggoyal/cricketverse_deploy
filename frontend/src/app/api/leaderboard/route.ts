import { NextRequest } from 'next/server'
import { handler, ok, clampLimit } from '@/lib/api-helpers'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * The old client aggregated this in the browser: it pulled 500 raw `balls`
 * rows with an embedded players join and reduced them in JS. The views do
 * the same work in the database and return only the top N.
 */
export const GET = handler(async (req: NextRequest) => {
  const type  = req.nextUrl.searchParams.get('type') === 'bowlers' ? 'bowlers' : 'batters'
  const limit = clampLimit(req.nextUrl.searchParams.get('limit'), 20, 100)

  const rows = type === 'bowlers'
    ? await query(`SELECT * FROM leaderboard_bowlers LIMIT ?`, [limit])
    : await query(`SELECT * FROM leaderboard_batters LIMIT ?`, [limit])

  return ok(rows)
})
