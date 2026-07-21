import { cookies } from 'next/headers'
import { handler, ok } from '@/lib/api-helpers'
import { destroySession, SESSION_COOKIE } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export const POST = handler(async () => {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) await destroySession(token)

  const res = ok({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
})
