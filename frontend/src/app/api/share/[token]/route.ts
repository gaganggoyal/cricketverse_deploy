import { NextResponse } from 'next/server'
import { handler, ok } from '@/lib/api-helpers'
import { queryOne } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Public replay lookup — the one match read that needs no session. The
 * `is_public = 1` check is what keeps it from becoming a way to read any
 * match by guessing ids; the token is random and the flag is opt-in.
 */
export const GET = handler(async (_req: Request, { params }: { params: { token: string } }) => {
  const match = await queryOne(
    `SELECT m.*, s.name AS stadium_name, s.city AS stadium_city
       FROM matches m
       LEFT JOIN stadiums s ON s.id = m.stadium_id
      WHERE m.share_token = ? AND m.is_public = 1`,
    [params.token]
  )

  if (!match) return NextResponse.json({ error: 'Replay not found' }, { status: 404 })
  return ok(match)
})
