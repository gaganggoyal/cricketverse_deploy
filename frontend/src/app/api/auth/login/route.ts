import { NextRequest } from 'next/server'
import { handler, ok } from '@/lib/api-helpers'
import { NextResponse } from 'next/server'
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const POST = handler(async (req: NextRequest) => {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  let user
  try {
    user = await authenticate(email, password)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Invalid email or password' }, { status: 401 })
  }

  const { token, expires } = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  })

  const res = ok({ user: { id: user.id, email: user.email } })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires))
  return res
})
