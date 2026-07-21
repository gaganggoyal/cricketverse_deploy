import { handler, ok } from '@/lib/api-helpers'
import { currentUser, getProfile } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

/** Returns null (200) rather than 401 when signed out — callers treat
 *  "no user" as a normal state, not an error. */
export const GET = handler(async () => {
  const user = await currentUser()
  if (!user) return ok({ user: null, profile: null })

  const profile = await getProfile(user.id)
  return ok({ user: { id: user.id, email: user.email }, profile })
})
