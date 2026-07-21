import { NextRequest } from 'next/server'
import { handler, ok, badReq } from '@/lib/api-helpers'
import { transaction, toJson } from '@/lib/db'
import { currentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const MAX_BATCH = 20

/**
 * Event ingest. Open to signed-out visitors (page_view fires before login),
 * but the user_id is taken from the session rather than the payload so
 * events cannot be attributed to someone else.
 */
export const POST = handler(async (req: NextRequest) => {
  const user   = await currentUser()
  const body   = await req.json().catch(() => null)
  const events = Array.isArray(body) ? body : [body]

  if (!events.length || events.some(e => !e?.event)) return badReq('Each event needs an `event` name')
  if (events.length > MAX_BATCH) return badReq(`At most ${MAX_BATCH} events per request`)

  await transaction(async (conn) => {
    for (const e of events) {
      await conn.execute(
        `INSERT INTO analytics_events (user_id, session_id, event, properties, page)
         VALUES (?, ?, ?, ?, ?)`,
        [
          user?.id ?? null,
          typeof e.session_id === 'string' ? e.session_id.slice(0, 64) : null,
          String(e.event).slice(0, 64),
          toJson(e.properties ?? {}),
          typeof e.page === 'string' ? e.page.slice(0, 255) : null,
        ]
      )
    }
  })

  return ok({ tracked: events.length })
})
