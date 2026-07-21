import { NextRequest } from 'next/server'
import { handler, ok } from '@/lib/api-helpers'
import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * Platform analytics. The browser used to fetch every page_view row for
 * the window and build the DAU series in JS; these GROUP BYs do it in the
 * database and return a few dozen rows instead of tens of thousands.
 */
export const GET = handler(async (req: NextRequest) => {
  await requireAdmin()

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days')) || 30, 1), 365)

  const [dauByDay, eventRows, paidPlans] = await Promise.all([
    query<{ date: string; count: number }>(
      `SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS count
         FROM analytics_events
        WHERE event = 'page_view' AND created_at > (NOW() - INTERVAL ? DAY)
        GROUP BY date ORDER BY date ASC`, [days]),
    query<{ event: string; count: number }>(
      `SELECT event, COUNT(*) AS count
         FROM analytics_events
        WHERE created_at > (NOW() - INTERVAL ? DAY)
        GROUP BY event`, [days]),
    query<{ plan: string; count: number }>(
      `SELECT plan, COUNT(*) AS count
         FROM user_profiles WHERE plan IN ('pro','elite') GROUP BY plan`),
  ])

  const eventCounts = Object.fromEntries(eventRows.map(r => [r.event, r.count]))

  return ok({ dauByDay, eventCounts, paidPlans })
})
