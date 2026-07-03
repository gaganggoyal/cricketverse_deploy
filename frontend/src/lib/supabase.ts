import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnon)

// ── PLAYER QUERIES ────────────────────────────────────────────────

export async function searchPlayers(opts: {
  search?: string
  country_code?: string
  role?: string
  format?: string
  limit?: number
}) {
  const { search, country_code, role, format, limit = 50 } = opts

  let q = supabase
    .from('players')
    .select('id,name,country,country_code,flag_emoji,role,formats,bat_avg,bat_sr,bat_style,bowl_avg,bowl_economy,bowl_type,stamina,form,skill_description,jersey_number')
    .order('bat_avg', { ascending: false })
    .limit(limit)

  if (search)       q = q.ilike('name', `%${search}%`)
  if (country_code) q = q.eq('country_code', country_code)
  if (role)         q = q.eq('role', role)
  if (format)       q = q.contains('formats', [format])

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getPlayerById(id: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getStadiums() {
  const { data, error } = await supabase
    .from('stadiums')
    .select('*')
    .order('capacity', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── MATCH QUERIES ─────────────────────────────────────────────────

export async function saveMatch(match: {
  user_id: string
  format: string
  total_overs: number
  stadium_id?: string
  pitch_type: string
  time_of_play: string
  team_a_players: string[]
  team_b_players: string[]
  toss_winner: string
  toss_decision: string
}) {
  const { data, error } = await supabase
    .from('matches')
    .insert(match)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMatchResult(match_id: string, result: {
  innings1_score: number
  innings1_wickets: number
  innings1_overs: string
  innings2_score: number
  innings2_wickets: number
  innings2_overs: string
  target: number
  status: 'complete'
  winner: string
  win_margin: string
  ai_analysis?: string
}) {
  const { error } = await supabase
    .from('matches')
    .update({ ...result, completed_at: new Date().toISOString() })
    .eq('id', match_id)
  if (error) throw error
}

export async function getUserMatches(user_id: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}
