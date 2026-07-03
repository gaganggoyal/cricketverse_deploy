import { create } from 'zustand'
import { MatchSetup, InningsState, MatchResult, BallEvent, BatterLive, BowlerLive, Player, Stadium, Outcome, BowlerAllocation } from '@/types'

// ─────────────────────────────────────────────
// MATCH SETUP STORE
// ─────────────────────────────────────────────
interface SetupStore {
  step: number
  setup: Partial<MatchSetup>
  setStep: (s: number) => void
  setFormat: (format: string, overs: number) => void
  setStadium: (s: Stadium) => void
  setPitch: (p: string) => void
  setTimeOfPlay: (t: string) => void
  setTeamA: (players: Player[], name?: string) => void
  setTeamB: (players: Player[], name?: string) => void
  setCaptainA: (p: Player) => void
  setCaptainB: (p: Player) => void
  setBattingOrderA: (players: Player[]) => void
  setBattingOrderB: (players: Player[]) => void
  setBowlingPlanA: (plan: BowlerAllocation[]) => void
  setBowlingPlanB: (plan: BowlerAllocation[]) => void
  setBowlingOrderA: (players: Player[]) => void
  setBowlingOrderB: (players: Player[]) => void
  setToss: (winner: 'A' | 'B', decision: 'bat' | 'bowl') => void
  reset: () => void
}

export const useSetupStore = create<SetupStore>((set) => ({
  step: 0,
  setup: {},
  setStep: (step) => set({ step }),
  setFormat: (format, total_overs) =>
    set((s) => ({ setup: { ...s.setup, format: format as any, total_overs } })),
  setStadium: (stadium) =>
    set((s) => ({ setup: { ...s.setup, stadium } })),
  setPitch: (pitch) =>
    set((s) => ({ setup: { ...s.setup, pitch: pitch as any } })),
  setTimeOfPlay: (time_of_play) =>
    set((s) => ({ setup: { ...s.setup, time_of_play: time_of_play as any } })),
  setTeamA: (team_a, team_a_name) =>
    set((s) => ({ setup: { ...s.setup, team_a, ...(team_a_name ? { team_a_name } : {}) } })),
  setTeamB: (team_b, team_b_name) =>
    set((s) => ({ setup: { ...s.setup, team_b, ...(team_b_name ? { team_b_name } : {}) } })),
  setCaptainA: (captain_a) => set((s) => ({ setup: { ...s.setup, captain_a } })),
  setCaptainB: (captain_b) => set((s) => ({ setup: { ...s.setup, captain_b } })),
  setBattingOrderA: (batting_order_a) => set((s) => ({ setup: { ...s.setup, batting_order_a } })),
  setBattingOrderB: (batting_order_b) => set((s) => ({ setup: { ...s.setup, batting_order_b } })),
  setBowlingPlanA: (bowling_plan_a) => set((s) => ({ setup: { ...s.setup, bowling_plan_a } })),
  setBowlingPlanB: (bowling_plan_b) => set((s) => ({ setup: { ...s.setup, bowling_plan_b } })),
  setBowlingOrderA: (bowling_order_a) => set((s) => ({ setup: { ...s.setup, bowling_order_a } })),
  setBowlingOrderB: (bowling_order_b) => set((s) => ({ setup: { ...s.setup, bowling_order_b } })),
  setToss: (toss_winner, toss_decision) => set((s) => ({ setup: { ...s.setup, toss_winner, toss_decision } })),
  reset: () => set({ step: 0, setup: {} }),
}))

// ─────────────────────────────────────────────
// LIVE MATCH STORE
// ─────────────────────────────────────────────
interface LiveMatchStore {
  matchId: string | null
  innings: number
  innings1: InningsState | null
  innings2: InningsState | null
  result: MatchResult | null
  status: 'idle' | 'live' | 'innings_break' | 'complete'
  autoMode: boolean
  viewInnings: number
  playersByName: Record<string, Player>

  initMatch: (matchId: string, setup: MatchSetup, battingFirst: string) => void
  applyBallEvent: (ev: BallEvent) => void
  setInningsBreak: (target: number, batting: string) => void
  setResult: (r: MatchResult) => void
  setAutoMode: (v: boolean) => void
  setViewInnings: (n: number) => void
  reset: () => void
}

function emptyInnings(batting: string, bowling: string, target?: number): InningsState {
  return {
    batting_team: batting as 'A' | 'B',
    bowling_team: bowling as 'A' | 'B',
    score: 0, wickets: 0, balls: 0, overs: '0.0',
    run_rate: 0, required_rate: target ? undefined : undefined,
    target, partnership: 0,
    batter1: null, batter2: null, bowler: null,
    batterStats: {}, bowlerStats: {},
    last_ball: undefined,
    over_balls: [], all_overs: [], commentary: [],
  }
}

function fallbackPlayer(name: string): Player {
  return {
    id: name, name, country: '', country_code: '', flag_emoji: '🏏', formats: [],
    role: 'Batter', bat_avg: 0, bat_sr: 0, bat_style: 'balanced',
    bat_preferred_shots: [], bat_weakness: [], bat_vs_spin: 1, bat_vs_pace: 1,
    bowl_variations: [], stamina: 100, form: 75, pressure_handling: 75, fitness: 85,
    home_flat: 1, home_spin: 1, home_seam: 1, home_bouncy: 1,
  }
}

export const useLiveMatch = create<LiveMatchStore>((set, get) => ({
  matchId: null,
  innings: 1,
  innings1: null,
  innings2: null,
  result: null,
  status: 'idle',
  autoMode: false,
  viewInnings: 1,
  playersByName: {},

  initMatch: (matchId, setup, battingFirst) => {
    const bowling = battingFirst === 'A' ? 'B' : 'A'
    const playersByName: Record<string, Player> = {}
    ;[...(setup.team_a ?? []), ...(setup.team_b ?? [])].forEach(p => { playersByName[p.name] = p })
    set({
      matchId,
      innings: 1,
      innings1: emptyInnings(battingFirst, bowling),
      innings2: null,
      result: null,
      status: 'live',
      viewInnings: 1,
      playersByName,
    })
  },

  applyBallEvent: (ev) => {
    set((state) => {
      const inningsKey = state.innings === 1 ? 'innings1' : 'innings2'
      const current = state[inningsKey]
      if (!current) return state

      // Update over ball tracker
      let overBalls = [...current.over_balls, ev.outcome]
      let allOvers = [...current.all_overs]
      if (overBalls.length === 6) {
        allOvers = [...allOvers, overBalls]
        overBalls = []
      }

      // Run rate
      const totalBalls = current.balls + 1
      const runRate = totalBalls > 0 ? (ev.score / (totalBalls / 6)) : 0
      const reqRate = current.target
        ? ((current.target - ev.score) / ((current.target * 6 - totalBalls) / 6))
        : undefined

      // ── Batter/bowler live stat tracking ──────────────────────
      const lookupPlayer = (name: string) => state.playersByName[name] ?? fallbackPlayer(name)

      const batterStats = { ...current.batterStats }
      const striker = batterStats[ev.batter] ?? {
        player: lookupPlayer(ev.batter), runs: 0, balls: 0, fours: 0, sixes: 0,
        out: false, stamina: ev.batter_stamina, strike_rate: 0,
      }
      const runsScored = ev.runs
      batterStats[ev.batter] = {
        ...striker,
        runs: striker.runs + runsScored,
        balls: striker.balls + 1,
        fours: striker.fours + (ev.outcome === '4' ? 1 : 0),
        sixes: striker.sixes + (ev.outcome === '6' ? 1 : 0),
        out: striker.out || ev.is_wicket,
        stamina: ev.batter_stamina,
        strike_rate: striker.balls + 1 > 0 ? Math.round(((striker.runs + runsScored) / (striker.balls + 1)) * 1000) / 10 : 0,
      }
      if (!batterStats[ev.non_striker]) {
        batterStats[ev.non_striker] = {
          player: lookupPlayer(ev.non_striker), runs: 0, balls: 0, fours: 0, sixes: 0,
          out: false, stamina: 100, strike_rate: 0,
        }
      }

      const bowlerStats = { ...current.bowlerStats }
      const bowlerPrev = bowlerStats[ev.bowler] ?? {
        player: lookupPlayer(ev.bowler), overs: '0.0', runs: 0, wickets: 0, economy: 0,
      }
      const bowlerBalls = Math.round(parseFloat(bowlerPrev.overs.split('.')[0]) * 6 + parseFloat(bowlerPrev.overs.split('.')[1] ?? '0')) + 1
      const bowlerRuns = bowlerPrev.runs + ev.runs
      // Run outs count against the batting side but are NOT the bowler's
      // wicket — crediting them inflated bowling figures.
      const bowlerWicket = ev.is_wicket && ev.wicket_type !== 'Run out'
      bowlerStats[ev.bowler] = {
        player: bowlerPrev.player,
        overs: `${Math.floor(bowlerBalls / 6)}.${bowlerBalls % 6}`,
        runs: bowlerRuns,
        wickets: bowlerPrev.wickets + (bowlerWicket ? 1 : 0),
        economy: Math.round((bowlerRuns / (bowlerBalls / 6)) * 100) / 100,
      }

      const updated: InningsState = {
        ...current,
        score: ev.score,
        wickets: ev.wickets,
        balls: totalBalls,
        overs: `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`,
        run_rate: Math.round(runRate * 100) / 100,
        required_rate: reqRate ? Math.round(reqRate * 100) / 100 : undefined,
        last_ball: ev,
        over_balls: overBalls,
        all_overs: allOvers,
        commentary: [ev, ...current.commentary].slice(0, 50),
        batterStats, bowlerStats,
        batter1: batterStats[ev.batter],
        batter2: batterStats[ev.non_striker],
        bowler: bowlerStats[ev.bowler],
        partnership: ev.is_wicket ? 0 : current.partnership + ev.runs,
      }

      return { [inningsKey]: updated }
    })
  },

  // Called when the user proceeds past the innings-summary page, so the
  // 2nd innings starts on their signal — no auto-resume timer here.
  setInningsBreak: (target, batting) => {
    const bowling = batting === 'A' ? 'B' : 'A'
    set({
      innings: 2,
      innings2: emptyInnings(batting, bowling, target),
      status: 'live',
      viewInnings: 2,
    })
  },

  setResult: (result) => set({ result, status: 'complete' }),
  setAutoMode: (autoMode) => set({ autoMode }),
  setViewInnings: (viewInnings) => set({ viewInnings }),
  reset: () => set({
    matchId: null, innings: 1, innings1: null, innings2: null,
    result: null, status: 'idle', autoMode: false, viewInnings: 1, playersByName: {},
  }),
}))
