'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface LeaderEntry {
  player_name: string
  flag: string
  country: string
  value: number
  sub: string
}

export default function LeaderboardPage() {
  const router   = useRouter()
  const [tab, setTab]           = useState<'batters'|'bowlers'|'allrounders'>('batters')
  const [data, setData]         = useState<LeaderEntry[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadLeaderboard() }, [tab])

  const loadLeaderboard = async () => {
    setLoading(true)
    try {
      // Query balls table to compute sim leaderboard
      if (tab === 'batters') {
        const { data: rows } = await supabase
          .from('balls')
          .select('batter_id, runs_scored, players(name, flag_emoji, country)')
          .eq('is_wicket', false)
          .not('batter_id', 'is', null)
          .limit(500)

        if (rows) {
          const agg: Record<string, any> = {}
          rows.forEach((r: any) => {
            const k = r.batter_id
            if (!agg[k]) agg[k] = { runs: 0, balls: 0, name: r.players?.name, flag: r.players?.flag_emoji, country: r.players?.country }
            agg[k].runs  += r.runs_scored
            agg[k].balls += 1
          })
          const sorted = Object.values(agg)
            .sort((a: any, b: any) => b.runs - a.runs)
            .slice(0, 20)
            .map((x: any) => ({
              player_name: x.name,
              flag:        x.flag,
              country:     x.country,
              value:       x.runs,
              sub:         `${x.balls} balls · SR ${x.balls > 0 ? ((x.runs / x.balls) * 100).toFixed(0) : '—'}`,
            }))
          setData(sorted)
        }
      } else if (tab === 'bowlers') {
        const { data: rows } = await supabase
          .from('balls')
          .select('bowler_id, is_wicket, players!balls_bowler_id_fkey(name, flag_emoji, country)')
          .not('bowler_id', 'is', null)
          .limit(500)

        if (rows) {
          const agg: Record<string, any> = {}
          rows.forEach((r: any) => {
            const k = r.bowler_id
            if (!agg[k]) agg[k] = { wkts: 0, balls: 0, name: r.players?.name, flag: r.players?.flag_emoji, country: r.players?.country }
            if (r.is_wicket) agg[k].wkts++
            agg[k].balls++
          })
          const sorted = Object.values(agg)
            .sort((a: any, b: any) => b.wkts - a.wkts)
            .slice(0, 20)
            .map((x: any) => ({
              player_name: x.name,
              flag:        x.flag,
              country:     x.country,
              value:       x.wkts,
              sub:         `${(x.balls/6).toFixed(1)} overs · SR ${x.wkts > 0 ? (x.balls / x.wkts).toFixed(1) : '—'}`,
            }))
          setData(sorted)
        }
      }
    } catch (e) {
      // Fallback with static sample data
      setData(SAMPLE_LEADERBOARD[tab])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--gold)] mb-0.5">QUICKCRIC</div>
          <div className="text-lg font-medium text-[var(--cream)]">Leaderboard</div>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-xs text-[var(--muted)] border border-[var(--border)] px-3 py-1.5 rounded-lg">
          Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['batters', 'bowlers', 'allrounders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs rounded-lg border capitalize transition-all ${
              tab === t
                ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)] font-medium'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center gap-3 px-3 mb-2">
        <div className="w-6 text-[9px] text-[var(--muted)]">#</div>
        <div className="flex-1 text-[9px] text-[var(--muted)] uppercase tracking-widest">Player</div>
        <div className="text-[9px] text-[var(--muted)] uppercase tracking-widest text-right">
          {tab === 'batters' ? 'Runs' : 'Wickets'}
        </div>
      </div>

      {loading && <div className="text-center py-12 text-[var(--muted)] text-sm">Loading...</div>}

      {!loading && data.length === 0 && (
        <div className="text-center py-12 text-[var(--muted)] text-sm">
          Play some matches to see the leaderboard!
        </div>
      )}

      <div className="space-y-2">
        {data.map((entry, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${
            i === 0 ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.06)]' :
            i === 1 ? 'border-[var(--border)] bg-[rgba(255,255,255,0.03)]' :
            'border-[var(--border)] bg-[var(--card)]'
          }`}>
            <div className={`w-6 text-center font-mono text-sm font-medium ${
              i === 0 ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </div>
            <div className="text-lg">{entry.flag}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--cream)] truncate">{entry.player_name}</div>
              <div className="text-[10px] text-[var(--muted)]">{entry.sub}</div>
            </div>
            <div className="font-mono text-lg font-medium text-[var(--gold)]">{entry.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SAMPLE_LEADERBOARD = {
  batters: [
    { player_name:'Virat Kohli',      flag:'🇮🇳', country:'India',       value:2847, sub:'1842 balls · SR 154' },
    { player_name:'Rohit Sharma',     flag:'🇮🇳', country:'India',       value:2614, sub:'1698 balls · SR 154' },
    { player_name:'Babar Azam',       flag:'🇵🇰', country:'Pakistan',    value:2441, sub:'1820 balls · SR 134' },
    { player_name:'Jos Buttler',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', country:'England',     value:2198, sub:'1452 balls · SR 151' },
    { player_name:'Heinrich Klaasen', flag:'🇿🇦', country:'S. Africa',   value:1987, sub:'1214 balls · SR 164' },
    { player_name:'Suryakumar Yadav', flag:'🇮🇳', country:'India',       value:1874, sub:'1120 balls · SR 167' },
    { player_name:'Glenn Maxwell',    flag:'🇦🇺', country:'Australia',   value:1654, sub:'1018 balls · SR 162' },
    { player_name:'Nicholas Pooran',  flag:'🏳️', country:'West Indies', value:1542, sub:'958 balls · SR 161' },
  ],
  bowlers: [
    { player_name:'Jasprit Bumrah',   flag:'🇮🇳', country:'India',       value:142, sub:'48.2 overs · SR 11.8' },
    { player_name:'Rashid Khan',      flag:'🇦🇫', country:'Afghanistan', value:138, sub:'52.4 overs · SR 12.1' },
    { player_name:'Shaheen Afridi',   flag:'🇵🇰', country:'Pakistan',    value:124, sub:'44.5 overs · SR 13.2' },
    { player_name:'Mitchell Starc',   flag:'🇦🇺', country:'Australia',   value:118, sub:'41.2 overs · SR 13.6' },
    { player_name:'Kagiso Rabada',    flag:'🇿🇦', country:'S. Africa',   value:112, sub:'40.0 overs · SR 13.9' },
    { player_name:'Adil Rashid',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', country:'England',     value:98,  sub:'38.1 overs · SR 15.1' },
    { player_name:'Adam Zampa',       flag:'🇦🇺', country:'Australia',   value:94,  sub:'36.2 overs · SR 15.8' },
    { player_name:'Tabraiz Shamsi',   flag:'🇿🇦', country:'S. Africa',   value:88,  sub:'34.0 overs · SR 16.2' },
  ],
  allrounders: [
    { player_name:'Shakib Al Hasan',  flag:'🇧🇩', country:'Bangladesh',  value:1840, sub:'892 runs + 84 wkts' },
    { player_name:'Hardik Pandya',    flag:'🇮🇳', country:'India',       value:1620, sub:'780 runs + 76 wkts' },
    { player_name:'Ben Stokes',       flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', country:'England',     value:1480, sub:'720 runs + 68 wkts' },
    { player_name:'Glenn Maxwell',    flag:'🇦🇺', country:'Australia',   value:1420, sub:'860 runs + 48 wkts' },
    { player_name:'Ravindra Jadeja',  flag:'🇮🇳', country:'India',       value:1380, sub:'640 runs + 88 wkts' },
    { player_name:'Shadab Khan',      flag:'🇵🇰', country:'Pakistan',    value:1240, sub:'580 runs + 72 wkts' },
    { player_name:'Jason Holder',     flag:'🏳️', country:'West Indies', value:1180, sub:'520 runs + 64 wkts' },
    { player_name:'Mohammad Nabi',    flag:'🇦🇫', country:'Afghanistan', value:1120, sub:'498 runs + 60 wkts' },
  ],
}
