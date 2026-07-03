// ─────────────────────────────────────────────
// QUICKCRIC — Shared TypeScript Types
// ─────────────────────────────────────────────

export type Format = 'T5' | 'T10' | 'T20' | 'ODI'
export type PitchType = 'flat' | 'spin' | 'seam' | 'dusty' | 'damp' | 'bouncy' | 'neutral'
export type TimeOfPlay = 'morning' | 'afternoon' | 'evening' | 'night' | 'overcast' | 'drizzle'
export type PlayerRole = 'Batter' | 'Bowler' | 'All-rounder' | 'WK-Batter'
export type BatStyle = 'aggressive' | 'balanced' | 'defensive'
export type BowlType = 'Fast' | 'Medium' | 'Spin'
export type Outcome = '0' | '1' | '2' | '3' | '4' | '6' | 'W' | 'WD' | 'NB'

// ── PLAYER ────────────────────────────────────────────────────────
export interface Player {
  id: string
  name: string
  country: string
  country_code: string
  flag_emoji: string
  formats: string[]
  role: PlayerRole
  batting_style?: string
  bowling_style?: string

  // Batting
  bat_avg: number
  bat_sr: number
  bat_hs?: number
  bat_style: BatStyle
  bat_preferred_shots: string[]
  bat_weakness: string[]
  bat_vs_spin: number
  bat_vs_pace: number

  // Bowling
  bowl_avg?: number
  bowl_economy?: number
  bowl_sr?: number
  bowl_type?: BowlType
  bowl_variations: string[]
  bowl_death_econ?: number

  // Attributes
  stamina: number
  form: number
  pressure_handling: number
  fitness: number

  // Ground preferences
  home_flat: number
  home_spin: number
  home_seam: number
  home_bouncy: number

  // Assets
  avatar_url?: string
  jersey_number?: number
  skill_description?: string
}

// ── STADIUM ───────────────────────────────────────────────────────
export interface Stadium {
  id: string
  name: string
  city: string
  country: string
  capacity?: number
  pitch_bias: PitchType
  avg_first_innings_score: number
  dew_factor: boolean
  altitude: number
  glb_url?: string
  thumbnail_url?: string
}

// ── FRANCHISE (IPL / WPL) ───────────────────────────────────────────
export type League = 'IPL' | 'WPL'
export interface Franchise {
  id: string
  name: string
  short_name: string
  league: League
  color: string
  logo_emoji: string
  playerIds: string[]
}

// ── BOWLING PLAN ────────────────────────────────────────────────────
export interface BowlerAllocation {
  player_id: string
  overs: number
}

// ── MATCH SETUP ───────────────────────────────────────────────────
export interface MatchSetup {
  format: Format
  total_overs: number
  stadium: Stadium | null
  pitch: PitchType
  time_of_play: TimeOfPlay

  team_a: Player[]
  team_b: Player[]
  team_a_name: string
  team_b_name: string

  captain_a: Player | null
  captain_b: Player | null

  batting_order_a: Player[]
  batting_order_b: Player[]

  bowling_plan_a: BowlerAllocation[]
  bowling_plan_b: BowlerAllocation[]

  bowling_order_a: Player[]
  bowling_order_b: Player[]

  toss_winner: 'A' | 'B' | null
  toss_decision: 'bat' | 'bowl' | null
}

export const MAX_OVERS_PER_BOWLER: Record<Format, number> = {
  T5:  1,
  T10: 2,
  T20: 4,
  ODI: 10,
}

// ── LIVE MATCH ────────────────────────────────────────────────────
export interface BallEvent {
  over: number
  ball: number
  label: string
  batter: string
  non_striker: string
  bowler: string
  outcome: Outcome
  runs: number
  is_wicket: boolean
  wicket_type?: string
  speed_kmh: number
  delivery_type: string
  commentary: string
  animation_key: string
  landing: { x: number; z: number }
  pressure_index: number
  batter_stamina: number
  bowler_stamina: number
  score: number
  wickets: number
}

export interface BatterLive {
  player: Player
  runs: number
  balls: number
  fours: number
  sixes: number
  out: boolean
  stamina: number
  strike_rate: number
}

export interface BowlerLive {
  player: Player
  overs: string
  runs: number
  wickets: number
  economy: number
}

export interface InningsState {
  batting_team: 'A' | 'B'
  bowling_team: 'A' | 'B'
  score: number
  wickets: number
  balls: number
  overs: string
  run_rate: number
  required_rate?: number
  target?: number
  partnership: number
  batter1: BatterLive | null
  batter2: BatterLive | null
  bowler: BowlerLive | null
  batterStats: Record<string, BatterLive>
  bowlerStats: Record<string, BowlerLive>
  last_ball?: BallEvent
  over_balls: Outcome[]
  all_overs: Outcome[][]
  commentary: BallEvent[]
}

export interface MatchResult {
  winner: string
  margin: string
  team_a_score: string
  team_b_score: string
  team_a_overs: string
  team_b_overs: string
  man_of_match: { name: string; runs?: number; wickets?: number } | null
  top_scorer: { name: string; runs: number; balls: number } | null
  best_bowler: { name: string; wickets: number; runs: number } | null
  ai_analysis?: string
}

// ── COMMENTARY ────────────────────────────────────────────────────
export type CommentaryLang = 'en' | 'hi' | 'pa'

// ── WS MESSAGES ───────────────────────────────────────────────────
export type WSMessage =
  | { type: 'ball';          data: BallEvent }
  | { type: 'innings_break'; data: { innings1_score: number; innings1_wickets: number; target: number; batting_team: string } }
  | { type: 'match_over';    data: MatchResult }
  | { type: 'error';         data: { message: string } }
