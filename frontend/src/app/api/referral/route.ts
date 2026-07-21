import { handler, ok } from '@/lib/api-helpers'
import { query } from '@/lib/db'
import { requireUser, getProfile } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()

  const [profile, referrals] = await Promise.all([
    getProfile(user.id),
    query(`SELECT * FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC`, [user.id]),
  ])

  return ok({ profile, referrals })
})
