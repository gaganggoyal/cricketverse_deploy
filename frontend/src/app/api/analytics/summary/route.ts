import { handler, ok } from '@/lib/api-helpers'
import { query } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/** Per-user analytics for /analytics. Own data only. */
export const GET = handler(async () => {
  const user = await requireUser()

  const [events, matches] = await Promise.all([
    query(`SELECT event, created_at FROM analytics_events
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 500`, [user.id]),
    query(`SELECT format, pitch_type, winner, innings1_score, created_at
             FROM matches WHERE user_id = ? AND status = 'complete' LIMIT 100`, [user.id]),
  ])

  return ok({ events, matches })
})
