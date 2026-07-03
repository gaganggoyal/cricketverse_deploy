// ─────────────────────────────────────────────────────────────────
// Local, in-browser fallback simulator — used only when the sim-engine
// backend is unreachable. Mirrors the real batting/bowling order and
// per-bowler over allocation chosen during setup, instead of hard-coding
// a single fixed batter/bowler for the whole innings.
// ─────────────────────────────────────────────────────────────────
import { BallEvent, BowlerAllocation, MatchResult, Outcome, Player } from '@/types'

const DELIVERIES = ['Yorker', 'In-swinger', 'Out-swinger', 'Bouncer', 'Googly', 'Slider', 'Cutter', 'Off-break']
const ANIMS = ['cover_drive_four', 'pull_shot_six', 'defensive_block', 'push_single', 'slog_sweep_six', 'bowled_wicket']
const WICKET_TYPES = ['Caught', 'Bowled', 'LBW', 'Stumped', 'Run out']

function buildOversQueue(bowlingOrder: Player[], plan: BowlerAllocation[], totalOvers: number): Player[] {
  const remaining = new Map(plan.map(p => [p.player_id, p.overs]))
  const order = bowlingOrder.filter(p => (remaining.get(p.id) ?? 0) > 0)
  const queue: Player[] = []
  let guard = 0
  while (queue.length < totalOvers && order.length > 0 && guard++ < totalOvers * 20) {
    for (const bowler of order) {
      if (queue.length >= totalOvers) break
      const left = remaining.get(bowler.id) ?? 0
      if (left <= 0) continue
      // Avoid back-to-back overs from the same bowler when an alternative exists.
      if (queue[queue.length - 1]?.id === bowler.id && order.some(b => b.id !== bowler.id && (remaining.get(b.id) ?? 0) > 0)) continue
      queue.push(bowler)
      remaining.set(bowler.id, left - 1)
    }
  }
  // Pad with the last bowler if plan under-allocates (shouldn't happen from the wizard, but keep it safe).
  while (queue.length < totalOvers) queue.push(bowlingOrder[queue.length % Math.max(1, bowlingOrder.length)] ?? bowlingOrder[0])
  return queue
}

// Ranks bowlers by economy/average (lower is better) so overs go to the
// better bowlers first, then round-robins so no one gets all their overs
// bunched at the start. Used both as the wizard's smart default and as the
// local-sim's safety fallback when no plan was ever set.
export function autoAssignOvers(team: Player[], maxPerBowler: number, totalOvers: number): BowlerAllocation[] {
  const eligible = team.filter(p => p.role === 'Bowler' || p.role === 'All-rounder')
  const pool = (eligible.length ? eligible : team.slice(0, 6))
    .slice()
    .sort((a, b) => {
      const scoreA = (a.bowl_economy ?? 8.5) + (a.bowl_avg ?? 30) * 0.1
      const scoreB = (b.bowl_economy ?? 8.5) + (b.bowl_avg ?? 30) * 0.1
      return scoreA - scoreB
    })
  if (pool.length === 0) return []

  const oversGiven = new Map(pool.map(p => [p.id, 0]))
  let remaining = totalOvers
  let guard = 0
  while (remaining > 0 && guard++ < totalOvers * pool.length + 20) {
    const bowler = pool.find(p => (oversGiven.get(p.id) ?? 0) < maxPerBowler)
    if (!bowler) break // everyone capped out — plan is as full as the format allows
    oversGiven.set(bowler.id, (oversGiven.get(bowler.id) ?? 0) + 1)
    remaining--
    // Rotate this bowler to the back so overs spread out across the pool.
    pool.push(pool.splice(pool.indexOf(bowler), 1)[0])
  }
  return Array.from(oversGiven.entries())
    .map(([player_id, overs]) => ({ player_id, overs }))
    .filter(a => a.overs > 0)
}

// Used only when a match is reached without the full setup wizard's
// batting/bowling order data (e.g. bowling_plan wasn't set).
export function fallbackBowlingPlan(team: Player[], totalOvers: number): BowlerAllocation[] {
  return autoAssignOvers(team, Math.max(1, Math.ceil(totalOvers / 5)), totalOvers)
}

export function simulateLocalInnings(opts: {
  battingOrder: Player[]
  bowlingOrder: Player[]
  bowlingPlan: BowlerAllocation[]
  totalOvers: number
  target?: number
}): { balls: BallEvent[]; finalScore: number; finalWickets: number } {
  const { battingOrder, bowlingOrder, bowlingPlan, totalOvers, target } = opts
  const oversQueue = buildOversQueue(bowlingOrder, bowlingPlan, totalOvers)

  const balls: BallEvent[] = []
  let score = 0, wickets = 0
  let bat1 = 0, bat2 = battingOrder.length > 1 ? 1 : 0, nextBat = 2

  outer:
  for (let o = 0; o < totalOvers; o++) {
    const bowler = oversQueue[o] ?? bowlingOrder[0]
    for (let b = 1; b <= 6; b++) {
      if (wickets >= Math.max(1, battingOrder.length - 1)) break outer
      if (target && score >= target) break outer

      const batter = battingOrder[bat1] ?? battingOrder[0]
      const nonStriker = battingOrder[bat2] ?? batter
      const r = Math.random()
      let outcome: Outcome = '0', runs = 0

      if (r < 0.07)      { outcome = 'W'; runs = 0 }
      else if (r < 0.17) { outcome = '6'; runs = 6 }
      else if (r < 0.33) { outcome = '4'; runs = 4 }
      else if (r < 0.50) { outcome = '0'; runs = 0 }
      else if (r < 0.70) { outcome = '1'; runs = 1 }
      else if (r < 0.85) { outcome = '2'; runs = 2 }
      else                { outcome = '3'; runs = 3 }

      const isWicket = outcome === 'W'
      if (isWicket) wickets++
      else score += runs

      const spd = Math.floor(130 + Math.random() * 25)
      balls.push({
        over: o, ball: b, label: `${o}.${b}`,
        batter: batter.name, non_striker: nonStriker.name, bowler: bowler.name,
        outcome, runs,
        is_wicket: isWicket,
        wicket_type: isWicket ? WICKET_TYPES[Math.floor(Math.random() * WICKET_TYPES.length)] : undefined,
        speed_kmh: spd,
        delivery_type: DELIVERIES[Math.floor(Math.random() * DELIVERIES.length)],
        commentary: outcome === '6' ? `MAXIMUM! ${batter.name} disappears into the stands!` :
                    outcome === '4' ? `FOUR! ${batter.name} finds the gap beautifully!` :
                    outcome === 'W' ? `OUT! ${bowler.name} strikes — ${batter.name} has to go!` :
                    outcome === '0' ? 'Dot ball. Good line and length.' :
                    `${runs} run${runs > 1 ? 's' : ''} taken.`,
        animation_key: ANIMS[Math.floor(Math.random() * ANIMS.length)],
        landing: { x: (Math.random() - 0.5) * 20, z: 8 + Math.random() * 20 },
        pressure_index: Math.random(),
        batter_stamina: Math.max(40, 95 - Math.floor((batting_ballsFaced(balls, batter.name)) / 3)),
        bowler_stamina: 80,
        score, wickets,
      })

      if (isWicket) {
        if (nextBat < battingOrder.length) { bat1 = nextBat; nextBat++ }
        else break outer
      } else if (runs % 2 === 1) {
        [bat1, bat2] = [bat2, bat1]
      }
    }
    [bat1, bat2] = [bat2, bat1]
  }

  return { balls, finalScore: score, finalWickets: wickets }
}

function batting_ballsFaced(balls: BallEvent[], name: string): number {
  return balls.filter(b => b.batter === name).length
}

export function computeLocalResult(opts: {
  teamAName: string; teamBName: string
  battingFirst: 'A' | 'B'
  inn1Balls: BallEvent[]; inn1Score: number; inn1Wkts: number
  inn2Balls: BallEvent[]; inn2Score: number; inn2Wkts: number
  totalOvers: number
}): MatchResult {
  const { teamAName, teamBName, battingFirst, inn1Balls, inn1Score, inn1Wkts, inn2Balls, inn2Score, inn2Wkts, totalOvers } = opts
  const firstTeamName  = battingFirst === 'A' ? teamAName : teamBName
  const secondTeamName = battingFirst === 'A' ? teamBName : teamAName
  const chasingWon = inn2Score > inn1Score
  const winner = chasingWon ? secondTeamName : firstTeamName
  const margin = chasingWon
    ? `${Math.max(1, 10 - inn2Wkts)} wicket${10 - inn2Wkts !== 1 ? 's' : ''}`
    : `${inn1Score - inn2Score} run${inn1Score - inn2Score !== 1 ? 's' : ''}`

  const allBalls = [...inn1Balls, ...inn2Balls]
  const runsByPlayer = new Map<string, { runs: number; balls: number }>()
  const wktsByPlayer = new Map<string, number>()
  allBalls.forEach(b => {
    const cur = runsByPlayer.get(b.batter) ?? { runs: 0, balls: 0 }
    runsByPlayer.set(b.batter, { runs: cur.runs + b.runs, balls: cur.balls + 1 })
    if (b.is_wicket && b.wicket_type !== 'Run out') wktsByPlayer.set(b.bowler, (wktsByPlayer.get(b.bowler) ?? 0) + 1)
  })
  const topScorer = Array.from(runsByPlayer.entries()).sort((a, b) => b[1].runs - a[1].runs)[0]
  const bestBowler = Array.from(wktsByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]
  const momIsBatter = !bestBowler || (topScorer && topScorer[1].runs > (bestBowler[1] ?? 0) * 20)

  const oversStr = (balls: BallEvent[]) => `${Math.floor(balls.length / 6)}.${balls.length % 6}`

  return {
    winner, margin,
    team_a_score: battingFirst === 'A' ? `${inn1Score}/${inn1Wkts}` : `${inn2Score}/${inn2Wkts}`,
    team_b_score: battingFirst === 'A' ? `${inn2Score}/${inn2Wkts}` : `${inn1Score}/${inn1Wkts}`,
    team_a_overs: battingFirst === 'A' ? oversStr(inn1Balls) : oversStr(inn2Balls),
    team_b_overs: battingFirst === 'A' ? oversStr(inn2Balls) : oversStr(inn1Balls),
    man_of_match: momIsBatter && topScorer
      ? { name: topScorer[0], runs: topScorer[1].runs }
      : bestBowler ? { name: bestBowler[0], wickets: bestBowler[1] } : null,
    top_scorer: topScorer ? { name: topScorer[0], runs: topScorer[1].runs, balls: topScorer[1].balls } : null,
    best_bowler: bestBowler ? { name: bestBowler[0], wickets: bestBowler[1], runs: 0 } : null,
  }
}
