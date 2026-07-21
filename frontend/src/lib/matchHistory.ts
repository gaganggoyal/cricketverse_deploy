// ─────────────────────────────────────────────────────────────────
// Match history + scorecard snapshots.
// Signed-in users get their history in MySQL (match_history table, see
// database/mysql/001_schema.sql) so it follows the account across
// devices. localStorage remains as the fallback — signed-out sessions
// and any API failure degrade to device-local history instead of losing
// the match.
// ─────────────────────────────────────────────────────────────────
import { auth, fetchMatchHistory, saveMatchHistory } from '@/lib/api'
import { InningsState } from '@/types'

export interface ScorecardBatRow {
  name: string
  runs: number
  balls: number
  fours: number
  sixes: number
  out: boolean
}

export interface ScorecardBowlRow {
  name: string
  overs: string
  runs: number
  wickets: number
  economy: number
}

export interface InningsCard {
  teamName: string
  score: number
  wickets: number
  overs: string
  batting: ScorecardBatRow[]
  bowling: ScorecardBowlRow[]
}

export interface SavedMatch {
  id: string
  playedAt: string           // ISO date
  format: string
  stadium: string
  teamAName: string
  teamBName: string
  winnerName: string         // resolved team name, or 'Match tied'
  margin: string
  potm: { name: string; line: string } | null
  innings: [InningsCard, InningsCard]
}

const KEY = 'quickcric_matches'
const MAX = 10

// ── localStorage fallback ─────────────────────────────────────────
function localGet(): SavedMatch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function localSave(match: SavedMatch) {
  if (typeof window === 'undefined') return
  try {
    const list = localGet().filter(m => m.id !== match.id)
    list.unshift(match)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // Storage full/blocked — history is a nice-to-have, never break the result page.
  }
}

// ── Row mapping ───────────────────────────────────────────────────
function rowToSaved(row: any): SavedMatch {
  return {
    id: row.id,
    playedAt: row.played_at,
    format: row.format ?? '',
    stadium: row.stadium ?? '',
    teamAName: row.team_a_name ?? 'Team A',
    teamBName: row.team_b_name ?? 'Team B',
    winnerName: row.winner_name ?? '',
    margin: row.margin ?? '',
    potm: row.potm ?? null,
    innings: row.innings,
  }
}

// user_id is no longer sent: the API derives it from the session cookie.
function savedToRow(m: SavedMatch) {
  return {
    id: m.id,
    played_at: m.playedAt,
    format: m.format,
    stadium: m.stadium,
    team_a_name: m.teamAName,
    team_b_name: m.teamBName,
    winner_name: m.winnerName,
    margin: m.margin,
    potm: m.potm,
    innings: m.innings,
  }
}

async function signedIn(): Promise<boolean> {
  return (await auth.getUser()) !== null
}

// Matches saved to localStorage before sign-in (or before the migration
// ran) get adopted into the account the first time history is read while
// signed in, then the local copy is cleared.
async function adoptLocalMatches() {
  const locals = localGet()
  if (!locals.length) return
  try {
    await saveMatchHistory(locals.map(savedToRow))
    localStorage.removeItem(KEY)
  } catch {
    // Leave the local copy in place — it is retried on the next read.
  }
}

// ── Public API ────────────────────────────────────────────────────
export async function getSavedMatches(): Promise<SavedMatch[]> {
  if (!(await signedIn())) return localGet()
  try {
    await adoptLocalMatches()
    const rows = await fetchMatchHistory(MAX)
    return rows.map(rowToSaved)
  } catch {
    return localGet()
  }
}

export async function saveMatch(match: SavedMatch): Promise<void> {
  if (await signedIn()) {
    try {
      await saveMatchHistory(savedToRow(match))
      return
    } catch {
      // Fall through to device-local storage rather than lose the match.
    }
  }
  localSave(match)
}

// Snapshot a live InningsState into a compact, serializable scorecard.
// Record insertion order follows first appearance at the crease, so the
// batting rows come out in true batting order.
export function inningsToCard(state: InningsState, teamName: string): InningsCard {
  return {
    teamName,
    score: state.score,
    wickets: state.wickets,
    overs: state.overs,
    batting: Object.values(state.batterStats).map(b => ({
      name: b.player.name,
      runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, out: b.out,
    })),
    bowling: Object.values(state.bowlerStats).map(b => ({
      name: b.player.name,
      overs: b.overs, runs: b.runs, wickets: b.wickets, economy: b.economy,
    })),
  }
}

// Player of the Match, the way real matches award it: picked from the
// WINNING team, weighing batting and bowling impact together.
// A team's contributions live in two places: the batting rows of its own
// innings and the bowling rows of the opposition's innings.
export function computePlayerOfMatch(
  cards: [InningsCard, InningsCard],
  winnerName: string,
): { name: string; line: string } | null {
  const ownIdx = cards.findIndex(c => c.teamName === winnerName)
  // Tie or unknown winner: consider everyone.
  const battingPool = ownIdx === -1 ? cards.flatMap(c => c.batting) : cards[ownIdx].batting
  const bowlingPool = ownIdx === -1 ? cards.flatMap(c => c.bowling) : cards[1 - ownIdx].bowling

  const points = new Map<string, number>()
  const batPts = new Map<string, number>()
  const bowlPts = new Map<string, number>()
  const batLine = new Map<string, string>()
  const bowlLine = new Map<string, string>()

  for (const b of battingPool) {
    const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0
    let pts = b.runs + b.fours + b.sixes * 2
    if (b.balls >= 10 && sr >= 150) pts += 10
    if (b.runs >= 50) pts += 10
    points.set(b.name, (points.get(b.name) ?? 0) + pts)
    batPts.set(b.name, pts)
    if (b.balls > 0) batLine.set(b.name, `${b.runs}${b.out ? '' : '*'} (${b.balls})`)
  }
  for (const b of bowlingPool) {
    const oversFloat = parseFloat(b.overs) || 0
    let pts = b.wickets * 25
    if (oversFloat >= 2 && b.economy > 0 && b.economy < 6) pts += 10
    points.set(b.name, (points.get(b.name) ?? 0) + pts)
    bowlPts.set(b.name, pts)
    if (oversFloat > 0) bowlLine.set(b.name, `${b.wickets}/${b.runs} (${b.overs} ov)`)
  }

  let best: { name: string; pts: number } | null = null
  points.forEach((pts, name) => {
    if (!best || pts > best.pts) best = { name, pts }
  })
  if (!best) return null
  const { name } = best as { name: string; pts: number }

  // Cite what actually won the award: a bowler's 2* (2) with the bat (or a
  // batter's wicketless over) is noise, not a citation. Keep a discipline's
  // figures only if it contributed meaningfully — or if it's all there is.
  const bat = batLine.get(name)
  const bowl = bowlLine.get(name)
  const batMeaningful = (batPts.get(name) ?? 0) >= 15
  const bowlMeaningful = (bowlPts.get(name) ?? 0) > 0
  const parts: string[] = []
  if (bat && (batMeaningful || !bowlMeaningful)) parts.push(bat)
  if (bowl && (bowlMeaningful || !batMeaningful)) parts.push(bowl)
  const line = parts.join(' · ') || bat || bowl || ''
  return { name, line }
}
