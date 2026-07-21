import { handler, ok } from '@/lib/api-helpers'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = handler(async () =>
  ok(await query(`SELECT * FROM stadiums ORDER BY capacity DESC`))
)
