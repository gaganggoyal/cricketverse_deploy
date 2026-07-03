'use client'
/**
 * QuickCric Fantasy Cricket
 * ─────────────────────────────
 * Pick a fantasy XI from any ongoing or upcoming sim match.
 * Points scored live as balls are bowled.
 * 
 * Points system:
 *   Batting: 1pt/run, 4pts/four, 6pts/six, 25pts/50, 50pts/100, -5pts/duck
 *   Bowling: 25pts/wicket, 8pts/maiden, 4pts/3-wicket haul, 8pts/5-for, 8pts/economy<7
 *   Fielding: 8pts/catch, 12pts/runout
 *   Captain: 2x points · Vice-captain: 1.5x points
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Player } from '@/types'
import { searchPlayers } from '@/lib/supabase'

// ── POINTS SYSTEM ─────────────────────────────────────────────────
export const FANTASY_POINTS = {
  // Batting
  run:           1,
  four_bonus:    4,
  six_bonus:     6,
  fifty:         25,
  century:       50,
  duck:         -5,
  // Bowling
  wicket:        25,
  maiden:        8,
  three_fer:     4,
  five_fer:      8,
  economy_u7:    8,
  economy_o10:  -6,
  // Fielding
  catch:         8,
  stumping:      12,
  runout:        12,
  // Match bonus
  winning_team:  10,
  // Format multipliers (T10 scores double)
  t10_multi:     2.0,
  t20_multi:     1.0,
  odi_multi:     0.8,
}

export function computeFantasyPoints(
  player: { runs?: number; balls?: number; fours?: number; sixes?: number
            wickets?: number; overs?: number; maidens?: number; economy?: number
            catches?: number; stumpings?: number; runouts?: number },
  format: string = 'T20',
  isWinningTeam: boolean = false
): number {
  let pts = 0
  const fmtMul = format === 'T10' ? 2 : format === 'ODI' ? 0.8 : 1

  // Batting
  if (player.runs !== undefined) {
    pts += player.runs * FANTASY_POINTS.run
    pts += (player.fours ?? 0) * FANTASY_POINTS.four_bonus
    pts += (player.sixes ?? 0) * FANTASY_POINTS.six_bonus
    if (player.runs >= 100) pts += FANTASY_POINTS.century
    else if (player.runs >= 50) pts += FANTASY_POINTS.fifty
    if (player.runs === 0 && (player.balls ?? 0) > 0) pts += FANTASY_POINTS.duck
  }

  // Bowling
  if (player.wickets !== undefined) {
    pts += player.wickets * FANTASY_POINTS.wicket
    if (player.wickets >= 5) pts += FANTASY_POINTS.five_fer
    else if (player.wickets >= 3) pts += FANTASY_POINTS.three_fer
    pts += (player.maidens ?? 0) * FANTASY_POINTS.maiden
    const eco = player.economy ?? 0
    if (eco > 0 && eco < 7)  pts += FANTASY_POINTS.economy_u7
    if (eco > 10)            pts += FANTASY_POINTS.economy_o10
  }

  // Fielding
  pts += (player.catches   ?? 0) * FANTASY_POINTS.catch
  pts += (player.stumpings ?? 0) * FANTASY_POINTS.stumping
  pts += (player.runouts   ?? 0) * FANTASY_POINTS.runout

  if (isWinningTeam) pts += FANTASY_POINTS.winning_team

  return Math.round(pts * fmtMul)
}

// ── FANTASY TEAM BUILDER UI ───────────────────────────────────────

interface FantasyTeamState {
  players:      Player[]
  captain:      string | null
  viceCaptain:  string | null
}

const BUDGET = 100   // credits
const ROLE_LIMITS = { Batter: [3,5], Bowler: [3,5], 'All-rounder': [1,3], 'WK-Batter': [1,2] }

export default function FantasyPage() {
  const router = useRouter()
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [team,       setTeam]       = useState<FantasyTeamState>({players:[], captain:null, viceCaptain:null})
  const [search,     setSearch]     = useState('')
  const [tab,        setTab]        = useState<'pick'|'team'|'live'>('pick')
  const [loading,    setLoading]    = useState(true)
  const [livePoints, setLivePoints] = useState<Record<string,number>>({})

  useEffect(() => {
    searchPlayers({limit:80}).then(setAllPlayers).catch(()=>setAllPlayers([])).finally(()=>setLoading(false))
  }, [])

  const budget_used = team.players.reduce((s,p) => s + playerCost(p), 0)
  const budget_left = BUDGET - budget_used

  const togglePlayer = (p: Player) => {
    const inTeam = team.players.find(x=>x.id===p.id)
    if (inTeam) {
      setTeam(t=>({...t, players: t.players.filter(x=>x.id!==p.id),
        captain:     t.captain===p.id     ? null : t.captain,
        viceCaptain: t.viceCaptain===p.id ? null : t.viceCaptain,
      }))
      return
    }
    if (team.players.length >= 11) return
    if (playerCost(p) > budget_left) return
    setTeam(t=>({...t, players:[...t.players, p]}))
  }

  const setCaptain = (id: string) => {
    setTeam(t=>({...t, captain: id, viceCaptain: t.viceCaptain===id ? null : t.viceCaptain}))
  }
  const setVice = (id: string) => {
    setTeam(t=>({...t, viceCaptain: id, captain: t.captain===id ? null : t.captain}))
  }

  const totalPoints = team.players.reduce((s,p) => {
    const raw = livePoints[p.id] ?? 0
    const mul = p.id===team.captain ? 2 : p.id===team.viceCaptain ? 1.5 : 1
    return s + raw * mul
  }, 0)

  const filtered = allPlayers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[var(--dark)] max-w-lg mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--gold)]">FANTASY XI</div>
          <div className="text-lg font-medium text-[var(--cream)]">Build your dream team</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xl text-[var(--gold)]">{budget_left.toFixed(1)}</div>
          <div className="text-[9px] text-[var(--muted)]">credits left</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['pick','team','live'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 text-xs rounded-lg border capitalize transition-all ${tab===t ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)] font-medium' : 'border-[var(--border)] text-[var(--muted)]'}`}>
            {t==='live' ? `Live · ${Math.round(totalPoints)}pts` : t}
          </button>
        ))}
      </div>

      {/* PICK PLAYERS */}
      {tab==='pick' && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player..." className="flex-1 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]" />
            <div className="text-xs text-[var(--muted)] whitespace-nowrap">{team.players.length}/11</div>
          </div>
          {loading && <div className="text-center py-8 text-[var(--muted)] text-sm">Loading players...</div>}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map(p=>{
              const inTeam = !!team.players.find(x=>x.id===p.id)
              const cost   = playerCost(p)
              const canAdd = !inTeam && team.players.length<11 && cost<=budget_left
              return (
                <div key={p.id} onClick={()=>togglePlayer(p)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${inTeam ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.06)]' : canAdd ? 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]' : 'border-[var(--border)] bg-[var(--card)] opacity-40 cursor-not-allowed'}`}>
                  <div className="text-xl">{p.flag_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--cream)] truncate">{p.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">{p.role} · {p.country}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-[var(--gold)]">{cost}cr</div>
                    <div className="text-[9px] text-[var(--muted)]">avg {p.bat_avg}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] ${inTeam ? 'bg-[var(--gold)] border-[var(--gold)] text-[var(--dark)]' : 'border-[var(--border)]'}`}>
                    {inTeam?'✓':''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MY TEAM */}
      {tab==='team' && (
        <div>
          <div className="text-xs text-[var(--muted)] mb-3">Tap C to set captain (2x pts) · VC for vice-captain (1.5x)</div>
          {team.players.length===0 && <div className="text-center py-10 text-[var(--muted)] text-sm">No players picked yet</div>}
          <div className="space-y-2">
            {team.players.map(p=>(
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div className="text-lg">{p.flag_emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--cream)] truncate">{p.name}</div>
                  <div className="text-[10px] text-[var(--muted)]">{p.role}</div>
                </div>
                {p.id===team.captain && <div className="text-[10px] bg-[var(--gold)] text-[var(--dark)] px-1.5 py-0.5 rounded font-bold">C</div>}
                {p.id===team.viceCaptain && <div className="text-[10px] bg-[rgba(22,115,199,0.3)] text-[var(--gold)] px-1.5 py-0.5 rounded font-bold">VC</div>}
                <button onClick={()=>setCaptain(p.id)} className="text-[10px] border border-[var(--border)] px-2 py-1 rounded text-[var(--muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]">C</button>
                <button onClick={()=>setVice(p.id)} className="text-[10px] border border-[var(--border)] px-2 py-1 rounded text-[var(--muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]">VC</button>
              </div>
            ))}
          </div>
          {team.players.length===11 && team.captain && (
            <button onClick={()=>setTab('live')} className="w-full mt-4 py-3.5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm hover:bg-[var(--gold-light)] transition-all">
              LOCK TEAM & WATCH →
            </button>
          )}
        </div>
      )}

      {/* LIVE POINTS */}
      {tab==='live' && (
        <div>
          <div className="bg-[var(--card)] border border-[var(--gold)] rounded-xl p-4 mb-4 text-center">
            <div className="text-[9px] uppercase tracking-widest text-[var(--muted)]">Total fantasy points</div>
            <div className="font-mono text-5xl font-medium text-[var(--gold)]">{Math.round(totalPoints)}</div>
          </div>
          <div className="space-y-2">
            {team.players.map(p=>{
              const raw = livePoints[p.id] ?? 0
              const mul = p.id===team.captain ? 2 : p.id===team.viceCaptain ? 1.5 : 1
              const pts = Math.round(raw * mul)
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <div className="text-lg">{p.flag_emoji}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--cream)] flex items-center gap-1">
                      {p.name}
                      {p.id===team.captain && <span className="text-[9px] bg-[var(--gold)] text-[var(--dark)] px-1 rounded font-bold">C</span>}
                      {p.id===team.viceCaptain && <span className="text-[9px] bg-[rgba(22,115,199,0.3)] text-[var(--gold)] px-1 rounded font-bold">VC</span>}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">{p.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base font-medium text-[var(--gold)]">{pts}</div>
                    {mul>1 && <div className="text-[9px] text-[var(--muted)]">×{mul}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Player credit cost based on stats
function playerCost(p: Player): number {
  if (p.bat_avg >= 50)  return 10.5
  if (p.bat_avg >= 40)  return 9.5
  if (p.bat_avg >= 30)  return 8.5
  if (p.bowl_avg && p.bowl_avg <= 22) return 10.0
  if (p.bowl_avg && p.bowl_avg <= 27) return 9.0
  if (p.role === 'All-rounder') return 9.0
  return 8.0
}
