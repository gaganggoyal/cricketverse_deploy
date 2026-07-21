import { NextRequest } from 'next/server'
import { handler, ok, clampLimit } from '@/lib/api-helpers'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

const COLUMNS = `id, name, country, country_code, flag_emoji, role, formats,
                 bat_avg, bat_sr, bat_style, bowl_avg, bowl_economy, bowl_type,
                 stamina, form, skill_description, jersey_number`

/** Replaces searchPlayers() in the old lib/supabase.ts. */
export const GET = handler(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams
  const where: string[] = []
  const params: any[] = []

  const search = p.get('search')
  if (search) {
    // utf8mb4_0900_ai_ci is case- and accent-insensitive, so plain LIKE
    // reproduces Postgres ILIKE here.
    where.push('name LIKE ?')
    params.push(`%${search}%`)
  }

  const country = p.get('country_code')
  if (country) { where.push('country_code = ?'); params.push(country) }

  const role = p.get('role')
  if (role) { where.push('role = ?'); params.push(role) }

  const format = p.get('format')
  // formats is a JSON array — the Postgres original was `.contains()`.
  if (format) { where.push('JSON_CONTAINS(formats, ?)'); params.push(JSON.stringify(format)) }

  const sql = `SELECT ${COLUMNS} FROM players
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY bat_avg DESC, name ASC
               LIMIT ?`
  params.push(clampLimit(p.get('limit'), 50, 500))

  return ok(await query(sql, params))
})
