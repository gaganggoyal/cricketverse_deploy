import { handler, ok } from '@/lib/api-helpers'
import { NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Player profile page: the row plus its simulated-career aggregate. */
export const GET = handler(async (_req: Request, { params }: { params: { id: string } }) => {
  const [player, career] = await Promise.all([
    queryOne(`SELECT * FROM players WHERE id = ?`, [params.id]),
    queryOne(`SELECT * FROM player_sim_career WHERE id = ?`, [params.id]),
  ])

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  return ok({ player, career })
})
