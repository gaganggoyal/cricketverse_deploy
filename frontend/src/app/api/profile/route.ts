import { NextRequest } from 'next/server'
import { handler, ok, badReq } from '@/lib/api-helpers'
import { queryOne, execute, toJson } from '@/lib/db'
import { requireUser, getProfile } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Plan and billing columns are deliberately absent: those are set by the
// Stripe webhook, not by the account holder.
const EDITABLE = ['username', 'display_name', 'avatar_url', 'favorite_format',
                  'voice_provider', 'voice_volume', 'voice_rate', 'elevenlabs_voice'] as const

export const GET = handler(async () => {
  const user = await requireUser()
  return ok(await getProfile(user.id))
})

export const PATCH = handler(async (req: NextRequest) => {
  const user = await requireUser()
  const body = await req.json().catch(() => ({}))

  const sets: string[] = []
  const vals: any[] = []
  for (const f of EDITABLE) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]) }
  }
  for (const f of ['favorite_players', 'favorite_teams'] as const) {
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(toJson(body[f])) }
  }
  if (!sets.length) return badReq('No updatable fields supplied')

  await execute(`UPDATE user_profiles SET ${sets.join(', ')} WHERE id = ?`, [...vals, user.id])
  return ok(await queryOne(`SELECT * FROM user_profiles WHERE id = ?`, [user.id]))
})
