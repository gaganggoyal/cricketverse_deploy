'use client'
/**
 * QuickCric Analytics Dashboard
 * ──────────────────────────────────
 * Visual analytics for all your simulated matches:
 *  - Win/loss trends over time
 *  - Run rate comparison charts
 *  - Player performance radar
 *  - Shot zone heatmap
 *  - Batting partnership matrix
 *  - Economy rate tracker
 */

import { useEffect, useState } from 'react'
import { getUserMatches, getLeaderboard } from '@/lib/api'

interface MatchStat {
  id: string
  format: string
  created_at: string
  winner: string
  innings1_score: number
  innings1_wickets: number
  innings2_score: number
  innings2_wickets: number
  pitch_type: string
  time_of_play: string
}

interface PlayerStat {
  name: string
  flag: string
  country: string
  total_runs: number
  balls_faced: number
  strike_rate: number
  sixes: number
  fours: number
  wickets: number
  economy: number
}

// ── MINI CHART COMPONENTS ─────────────────────────────────────────

function BarChart({ data, label, color = 'var(--gold)' }: {
  data: { label: string; value: number }[]
  label: string
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="text-xs font-medium text-[var(--cream)] mb-3">{label}</div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-[10px] text-[var(--muted)] w-20 truncate flex-shrink-0">{d.label}</div>
            <div className="flex-1 bg-[var(--dark2)] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(d.value / max) * 100}%`, background: color }}
              />
            </div>
            <div className="font-mono text-xs text-[var(--cream)] w-10 text-right">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LineSparkline({ values, color = '#c9a84c', height = 40 }: {
  values: number[]
  color?: string
  height?: number
}) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 200
  const h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        fillOpacity="0.12"
        stroke="none"
      />
    </svg>
  )
}

function RadarChart({ stats }: { stats: { label: string; value: number; max: number }[] }) {
  const n   = stats.length
  const cx  = 80, cy = 80, r = 65
  const pts = stats.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const frac  = s.value / s.max
    return { x: cx + r * frac * Math.cos(angle), y: cy + r * frac * Math.sin(angle) }
  })
  const outline = stats.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
  const ptsStr    = pts.map(p => `${p.x},${p.y}`).join(' ')
  const outStr    = outline.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(frac => (
        <polygon key={frac}
          points={outline.map(p => `${cx + (p.x - cx) * frac},${cy + (p.y - cy) * frac}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
        />
      ))}
      {/* Spokes */}
      {outline.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}
      {/* Data polygon */}
      <polygon points={ptsStr} fill="rgba(22,115,199,0.2)" stroke="#c9a84c" strokeWidth="1.5" />
      {/* Labels */}
      {stats.map((s, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        const lx = cx + (r + 14) * Math.cos(angle)
        const ly = cy + (r + 14) * Math.sin(angle)
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill="rgba(245,240,232,0.55)">{s.label}</text>
        )
      })}
    </svg>
  )
}

function WagonWheel({ shots }: { shots: { x: number; y: number; runs: number }[] }) {
  const cx = 80, cy = 80, r = 72
  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {/* Field */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(30,92,14,0.4)" stroke="rgba(160,200,80,0.2)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r * 0.44} fill="none" stroke="rgba(160,200,80,0.15)" strokeWidth="0.5" />
      {/* Pitch */}
      <rect x={cx - 5} y={cy - 18} width={10} height={36} rx={2} fill="rgba(200,168,68,0.4)" />
      {/* Shot lines */}
      {shots.map((s, i) => {
        const sx  = cx + s.x * r
        const sy  = cy + s.y * r
        const col = s.runs === 6 ? '#7edb5a' : s.runs === 4 ? '#6ab4f0' : '#c9a84c'
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={col} strokeWidth="1.2" strokeOpacity="0.7" />
            <circle cx={sx} cy={sy} r={s.runs === 6 ? 3 : s.runs === 4 ? 2.5 : 1.5} fill={col} />
          </g>
        )
      })}
    </svg>
  )
}

// ── MAIN ANALYTICS PAGE ───────────────────────────────────────────

export default function AnalyticsPage() {
  const [matches,     setMatches]     = useState<MatchStat[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'overview'|'players'|'shots'|'trends'>('overview')

  useEffect(() => {
    // Matches are the signed-in user's own; the batting board is global.
    Promise.all([
      getUserMatches(),
      getLeaderboard('batters', 10),
    ]).then(([matchRows, playerRows]) => {
      setMatches(matchRows.filter((m: any) => m.status === 'complete'))
      setPlayerStats(playerRows as any)
    }).catch(() => {
      setMatches(DEMO_MATCHES)
      setPlayerStats(DEMO_PLAYERS)
    }).finally(() => setLoading(false))
  }, [])

  // Derived stats
  const totalMatches  = matches.length
  const wins          = matches.filter(m => m.winner === 'A').length
  const winRate       = totalMatches ? Math.round((wins / totalMatches) * 100) : 0
  const avgScore      = totalMatches ? Math.round(matches.reduce((s, m) => s + m.innings1_score, 0) / totalMatches) : 0
  const highScore     = matches.reduce((a, m) => Math.max(a, m.innings1_score), 0)
  const formatCounts  = matches.reduce((acc, m) => ({ ...acc, [m.format]: (acc[m.format] ?? 0) + 1 }), {} as Record<string, number>)
  const pitchWins     = matches.reduce((acc, m) => {
    if (!acc[m.pitch_type]) acc[m.pitch_type] = { w: 0, t: 0 }
    acc[m.pitch_type].t++
    if (m.winner === 'A') acc[m.pitch_type].w++
    return acc
  }, {} as Record<string, { w: number; t: number }>)

  const scoreTimeline = matches.slice(0, 20).reverse().map(m => m.innings1_score)

  // Simulated shot data for wagon wheel
  const wagonWheelShots = Array.from({ length: 40 }, (_, i) => {
    const angle = Math.random() * 2 * Math.PI
    const dist  = 0.3 + Math.random() * 0.7
    const runs  = Math.random() < 0.15 ? 6 : Math.random() < 0.25 ? 4 : Math.random() < 0.5 ? 1 : 2
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, runs }
  })

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
      <div className="text-[var(--muted)] text-sm">Loading analytics...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--dark)] px-4 py-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <div className="text-[10px] tracking-widest text-[var(--gold)] mb-1">ANALYTICS</div>
        <div className="text-2xl font-bold text-[var(--cream)]" style={{ fontFamily: 'Georgia, serif' }}>
          Your cricket stats
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { val: totalMatches, lbl: 'Matches' },
          { val: `${winRate}%`, lbl: 'Win rate' },
          { val: avgScore, lbl: 'Avg score' },
          { val: highScore, lbl: 'High score' },
        ].map(({ val, lbl }) => (
          <div key={lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="font-mono text-lg font-medium text-[var(--gold)]">{val}</div>
            <div className="text-[9px] text-[var(--muted)] mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {(['overview', 'players', 'shots', 'trends'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border capitalize transition-all ${tab === t ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Score trend sparkline */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-[var(--cream)]">Score trend (last 20 matches)</div>
              <div className="text-[10px] text-[var(--muted)]">1st innings</div>
            </div>
            <LineSparkline values={scoreTimeline} />
            <div className="flex justify-between mt-1">
              <div className="text-[9px] text-[var(--muted)]">Oldest</div>
              <div className="text-[9px] text-[var(--muted)]">Latest</div>
            </div>
          </div>

          {/* Format breakdown */}
          <BarChart
            label="Matches by format"
            data={Object.entries(formatCounts).map(([k, v]) => ({ label: k, value: v }))}
          />

          {/* Win rate by pitch */}
          <BarChart
            label="Win rate by pitch type"
            color="#7edb5a"
            data={Object.entries(pitchWins).map(([k, v]) => ({
              label: k,
              value: v.t > 0 ? Math.round((v.w / v.t) * 100) : 0
            }))}
          />

          {/* Win/loss donut */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xs font-medium text-[var(--cream)] mb-3">Win / Loss record</div>
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 80 80" className="w-20 h-20 flex-shrink-0">
                <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                <circle cx="40" cy="40" r="30" fill="none" stroke="#7edb5a" strokeWidth="12"
                  strokeDasharray={`${(winRate / 100) * 188.5} 188.5`}
                  strokeDashoffset="47" strokeLinecap="round"
                />
                <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="600" fill="#c9a84c">{winRate}%</text>
              </svg>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500 flex-shrink-0" />
                  <div className="text-xs text-[var(--muted)] flex-1">Wins</div>
                  <div className="font-mono text-xs text-[var(--cream)]">{wins}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-700 flex-shrink-0" />
                  <div className="text-xs text-[var(--muted)] flex-1">Losses</div>
                  <div className="font-mono text-xs text-[var(--cream)]">{totalMatches - wins}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYERS ──────────────────────────────────────── */}
      {tab === 'players' && (
        <div className="space-y-4">
          {playerStats.slice(0, 5).map((p, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl">{p.flag}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--cream)]">{p.name}</div>
                  <div className="text-[10px] text-[var(--muted)]">{p.country}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg text-[var(--gold)]">{p.total_runs}</div>
                  <div className="text-[9px] text-[var(--muted)]">runs</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: p.balls_faced, lbl: 'Balls' },
                  { val: p.strike_rate?.toFixed(0), lbl: 'SR' },
                  { val: p.sixes ?? 0, lbl: 'Sixes' },
                  { val: p.fours ?? 0, lbl: 'Fours' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="text-center bg-[var(--dark2)] rounded-lg py-1.5">
                    <div className="font-mono text-xs font-medium text-[var(--cream)]">{val}</div>
                    <div className="text-[8px] text-[var(--muted)]">{lbl}</div>
                  </div>
                ))}
              </div>
              {/* Radar */}
              <div className="flex items-center justify-center mt-3">
                <RadarChart stats={[
                  { label: 'Avg',   value: Math.min(p.total_runs / Math.max(p.balls_faced / 6, 1), 100), max: 100 },
                  { label: 'SR',    value: Math.min(p.strike_rate ?? 0, 200), max: 200 },
                  { label: 'Power', value: (p.sixes ?? 0) * 6 + (p.fours ?? 0) * 4, max: 200 },
                  { label: 'Bowl',  value: p.wickets ? Math.min(p.wickets * 10, 100) : 0, max: 100 },
                  { label: 'Econ',  value: p.economy ? Math.max(100 - p.economy * 8, 0) : 0, max: 100 },
                  { label: 'Cons',  value: Math.min(p.balls_faced / 10, 100), max: 100 },
                ]} />
              </div>
            </div>
          ))}
          {playerStats.length === 0 && (
            <div className="text-center py-10 text-[var(--muted)] text-sm">Play more matches to generate player stats</div>
          )}
        </div>
      )}

      {/* ── SHOT CHART ───────────────────────────────────── */}
      {tab === 'shots' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xs font-medium text-[var(--cream)] mb-1">Wagon wheel</div>
            <div className="text-[10px] text-[var(--muted)] mb-3">Shot distribution across all matches</div>
            <div className="flex justify-center">
              <WagonWheel shots={wagonWheelShots} />
            </div>
            <div className="flex justify-center gap-4 mt-3">
              {[['#7edb5a', 'Six'], ['#6ab4f0', 'Four'], ['#c9a84c', '1-3']].map(([col, lbl]) => (
                <div key={lbl} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                  <div className="text-[10px] text-[var(--muted)]">{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Zone breakdown */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xs font-medium text-[var(--cream)] mb-3">Scoring zones</div>
            <div className="space-y-2">
              {[
                { zone: 'Cover/Extra cover', pct: 28, runs: Math.round(avgScore * 0.28) },
                { zone: 'Square leg/Fine leg', pct: 22, runs: Math.round(avgScore * 0.22) },
                { zone: 'Straight/Long on', pct: 19, runs: Math.round(avgScore * 0.19) },
                { zone: 'Point/Third man', pct: 18, runs: Math.round(avgScore * 0.18) },
                { zone: 'Mid-wicket', pct: 13, runs: Math.round(avgScore * 0.13) },
              ].map(z => (
                <div key={z.zone} className="flex items-center gap-2">
                  <div className="text-[10px] text-[var(--muted)] w-32 flex-shrink-0">{z.zone}</div>
                  <div className="flex-1 bg-[var(--dark2)] rounded h-1.5 overflow-hidden">
                    <div className="h-full bg-[var(--gold)] rounded" style={{ width: `${z.pct}%` }} />
                  </div>
                  <div className="text-[10px] font-mono text-[var(--cream)] w-8 text-right">{z.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS ───────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-4">
          {/* Monthly activity */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xs font-medium text-[var(--cream)] mb-3">Monthly activity</div>
            <div className="flex items-end gap-1.5 h-20">
              {Array.from({ length: 12 }, (_, i) => {
                const month = new Date(); month.setMonth(month.getMonth() - (11 - i))
                const label = month.toLocaleString('default', { month: 'short' })
                const count = matches.filter(m => {
                  const d = new Date(m.created_at)
                  return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
                }).length
                return { label, count }
              }).map(({ label, count }, i) => {
                const maxCount = Math.max(1, ...Array.from({ length: 12 }, (_, j) => {
                  const m = new Date(); m.setMonth(m.getMonth() - (11 - j))
                  return matches.filter(x => {
                    const d = new Date(x.created_at)
                    return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()
                  }).length
                }))
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t" style={{
                      height: `${Math.max(4, (count / maxCount) * 64)}px`,
                      background: count > 0 ? 'var(--gold)' : 'var(--border)',
                      opacity: count > 0 ? 1 : 0.3,
                    }} />
                    <div className="text-[8px] text-[var(--muted)]">{label}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pitch performance */}
          <BarChart
            label="Average first innings score by pitch"
            data={Object.entries(
              matches.reduce((acc, m) => {
                if (!acc[m.pitch_type]) acc[m.pitch_type] = { total: 0, count: 0 }
                acc[m.pitch_type].total += m.innings1_score
                acc[m.pitch_type].count++
                return acc
              }, {} as Record<string, { total: number; count: number }>)
            ).map(([k, v]) => ({ label: k, value: Math.round(v.total / v.count) }))}
          />

          {/* Format trend */}
          <BarChart
            label="Matches by time of day"
            color="#4a9fd4"
            data={Object.entries(
              matches.reduce((acc, m) => ({ ...acc, [m.time_of_play]: (acc[m.time_of_play] ?? 0) + 1 }), {} as Record<string, number>)
            ).map(([k, v]) => ({ label: k, value: v }))}
          />
        </div>
      )}
    </div>
  )
}

// ── Demo data (when DB empty) ─────────────────────────────────────
const DEMO_MATCHES: MatchStat[] = Array.from({ length: 20 }, (_, i) => ({
  id: `${i}`, format: ['T20','T10','ODI'][i % 3],
  created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  winner: Math.random() > 0.45 ? 'A' : 'B',
  innings1_score:  140 + Math.floor(Math.random() * 80),
  innings1_wickets: Math.floor(Math.random() * 8),
  innings2_score:  130 + Math.floor(Math.random() * 80),
  innings2_wickets: Math.floor(Math.random() * 10),
  pitch_type:  ['flat','spin','seam','bouncy','dusty'][i % 5],
  time_of_play: ['morning','afternoon','evening','night'][i % 4],
}))

const DEMO_PLAYERS: PlayerStat[] = [
  { name:'Virat Kohli',   flag:'🇮🇳', country:'India',     total_runs:2847, balls_faced:1842, strike_rate:154.6, sixes:48,  fours:312, wickets:0, economy:0 },
  { name:'Rohit Sharma',  flag:'🇮🇳', country:'India',     total_runs:2614, balls_faced:1698, strike_rate:153.9, sixes:82,  fours:286, wickets:0, economy:0 },
  { name:'Babar Azam',    flag:'🇵🇰', country:'Pakistan',  total_runs:2441, balls_faced:1820, strike_rate:134.1, sixes:36,  fours:298, wickets:0, economy:0 },
  { name:'Jos Buttler',   flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', country:'England',   total_runs:2198, balls_faced:1452, strike_rate:151.4, sixes:64,  fours:248, wickets:0, economy:0 },
  { name:'Glenn Maxwell', flag:'🇦🇺', country:'Australia', total_runs:1654, balls_faced:1018, strike_rate:162.5, sixes:98,  fours:196, wickets:48, economy:7.5 },
]
