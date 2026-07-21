import { NextRequest } from 'next/server'
import { handler, ok, badReq } from '@/lib/api-helpers'
import { createUser, createSession, validateCredentials, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const POST = handler(async (req: NextRequest) => {
  const { email, password } = await req.json().catch(() => ({}))

  const invalid = validateCredentials(email, password)
  if (invalid) return badReq(invalid)

  let user
  try {
    user = await createUser(email, password)
  } catch (e: any) {
    return badReq(e.message ?? 'Could not create account')
  }

  // Supabase gated sign-in behind an emailed confirmation link. There is
  // no outbound mail on this host, so accounts are active immediately —
  // see README for what to wire up if confirmation is reinstated.
  const { token, expires } = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  })

  const res = ok({ user: { id: user.id, email: user.email } })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires))
  return res
})
