import { NextRequest, NextResponse } from 'next/server'
import { handler, ok } from '@/lib/api-helpers'
import { queryOne, execute, toJson } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Only these may be written by a client. An allowlist rather than a
// spread of the request body, so a caller cannot reassign user_id and
// move a match into someone else's account.
const RESULT_FIELDS = [
  'innings1_score', 'innings1_wickets', 'innings1_overs',
  'innings2_score', 'innings2_wickets', 'innings2_overs',
  'target', 'status', 'winner', 'win_margin', 'ai_analysis',
] as const

export const GET = handler(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user  = await requireUser()
  const match = await queryOne(`SELECT * FROM matches WHERE id = ? AND user_id = ?`, [params.id, user.id])
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  return ok(match)
})

export const PATCH = handler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser()
  const body = await req.json().catch(() => ({}))

  const sets: string[] = []
  const vals: any[] = []
  for (const f of RESULT_FIELDS) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]) }
  }
  if (body.ai_ratings !== undefined) { sets.push('ai_ratings = ?'); vals.push(toJson(body.ai_ratings)) }
  if (body.status === 'complete')    { sets.push('completed_at = NOW()') }

  if (!sets.length) return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 })

  const res = await execute(
    `UPDATE matches SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    [...vals, params.id, user.id]
  )
  if (res.affectedRows === 0) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  return ok(await queryOne(`SELECT * FROM matches WHERE id = ?`, [params.id]))
})
