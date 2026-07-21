import { handler, ok } from '@/lib/api-helpers'
import { query, queryOne } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/**
 * Admin dashboard data. Previously the browser pulled every user_profiles
 * row and reduced them client-side, gated only by a client-side plan
 * check that any user could bypass. Now the gate is server-side and the
 * counts are computed in SQL.
 */
export const GET = handler(async () => {
  await requireAdmin()

  const [users, totals, matchesByDay] = await Promise.all([
    query(`SELECT id, username, display_name, plan, matches_played,
                  last_active_at, created_at, updated_at
             FROM user_profiles ORDER BY created_at DESC LIMIT 50`),
    queryOne(`SELECT
        (SELECT COUNT(*) FROM users)                                             AS total_users,
        (SELECT COUNT(*) FROM user_profiles WHERE DATE(last_active_at) = CURDATE()) AS active_today,
        (SELECT COUNT(*) FROM matches)                                           AS matches_total,
        (SELECT COUNT(*) FROM matches WHERE DATE(created_at) = CURDATE())        AS matches_today,
        (SELECT COUNT(*) FROM user_profiles WHERE plan = 'pro')                  AS pro_users,
        (SELECT COUNT(*) FROM user_profiles WHERE plan = 'elite')                AS elite_users`),
    query(`SELECT DATE(created_at) AS day, COUNT(*) AS matches
             FROM matches WHERE created_at > (NOW() - INTERVAL 14 DAY)
            GROUP BY day ORDER BY day DESC`),
  ])

  return ok({ users, totals, matchesByDay })
})
