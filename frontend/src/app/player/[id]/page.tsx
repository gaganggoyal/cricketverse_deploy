'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPlayerWithCareer } from '@/lib/api'

export default function PlayerProfilePage() {
  const { id }    = useParams() as { id: string }
  const router    = useRouter()
  const [player,  setPlayer]  = useState<any>(null)
  const [career,  setCareer]  = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Both rows come back from one request now — the endpoint joins the
    // player against its simulated-career aggregate.
    getPlayerWithCareer(id)
      .then(({ player, career }) => { setPlayer(player); setCareer(career) })
      .catch(() => { setPlayer(null); setCareer(null) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
      <div className="text-[var(--muted)] text-sm">Loading player...</div>
    </div>
  )
  if (!player) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🏏</div>
        <div className="text-[var(--muted)]">Player not found</div>
        <button onClick={() => router.back()} className="mt-4 text-xs text-[var(--gold)] underline">Go back</button>
      </div>
    </div>
  )

  const sr = career?.balls_faced > 0
    ? ((career.career_runs / career.balls_faced) * 100).toFixed(1) : '—'
  const eco = career?.balls_bowled > 0
    ? ((career.runs_conceded / career.balls_bowled) * 6).toFixed(2) : '—'

  // Form bar — last 5 sim scores
  const recentScores = player.recent_sim_scores ?? []

  return (
    <div className="min-h-screen bg-[var(--dark)] px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="text-xs text-[var(--muted)] mb-5 hover:text-[var(--cream)]">
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(22,115,199,0.12)] border border-[var(--gold)] flex items-center justify-center text-4xl">
          {player.flag_emoji}
        </div>
        <div>
          <div className="text-2xl font-bold text-[var(--cream)]">{player.name}</div>
          <div className="text-sm text-[var(--muted)]">{player.role} · {player.country}</div>
          <div className="flex items-center gap-2 mt-1">
            {(player.formats ?? []).map((f: string) => (
              <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--dark2)] border border-[var(--border)] text-[var(--muted)]">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form indicator */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-[var(--cream)]">Current form</div>
          <div className="text-xs text-[var(--muted)]">Last {recentScores.length} sim matches</div>
        </div>
        <div className="flex items-center gap-1.5">
          {recentScores.length > 0 ? recentScores.slice(-5).map((s: number, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t transition-all" style={{
                height: `${Math.max(6, Math.min(48, s * 0.6))}px`,
                background: s >= 50 ? 'var(--gold)' : s >= 30 ? '#7edb5a' : 'var(--border)',
              }} />
              <div className="text-[9px] font-mono text-[var(--muted)]">{s}</div>
            </div>
          )) : (
            <div className="text-xs text-[var(--muted)]">No sim data yet — play matches featuring this player</div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-[9px] text-[var(--muted)]">Form rating</div>
          <div className={`text-xs font-medium ${player.form >= 80 ? 'text-green-400' : player.form >= 60 ? 'text-[var(--gold)]' : 'text-red-400'}`}>
            {player.form >= 85 ? 'Excellent' : player.form >= 70 ? 'Good' : player.form >= 55 ? 'Average' : 'Poor'} ({player.form}/100)
          </div>
        </div>
      </div>

      {/* Career stats */}
      <div className="text-xs font-medium text-[var(--cream)] mb-3">Real career stats</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { val: player.bat_avg,    lbl: 'Bat avg',   show: true },
          { val: player.bat_sr,     lbl: 'Strike rate', show: true },
          { val: player.bat_hs,     lbl: 'High score', show: !!player.bat_hs },
          { val: player.bowl_avg,   lbl: 'Bowl avg',  show: !!player.bowl_avg },
          { val: player.bowl_economy, lbl: 'Economy', show: !!player.bowl_economy },
          { val: player.bowl_type,  lbl: 'Bowl type', show: !!player.bowl_type },
        ].filter(s => s.show).map(({ val, lbl }) => (
          <div key={lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="font-mono text-lg font-medium text-[var(--gold)]">{val ?? '—'}</div>
            <div className="text-[9px] text-[var(--muted)] mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Sim career stats */}
      {career && (career.career_runs > 0 || career.career_wickets > 0) && (
        <>
          <div className="text-xs font-medium text-[var(--cream)] mb-3">Simulation career stats</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { val: career.career_runs,    lbl: 'Sim runs'    },
              { val: sr,                    lbl: 'Sim SR'      },
              { val: career.sixes,          lbl: 'Sixes hit'   },
              { val: career.fours,          lbl: 'Fours hit'   },
              { val: career.career_wickets, lbl: 'Wickets'     },
              { val: eco,                   lbl: 'Economy'     },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
                <div className="font-mono text-lg font-medium text-[var(--cream)]">{val ?? '—'}</div>
                <div className="text-[9px] text-[var(--muted)] mt-0.5">{lbl}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Attributes */}
      <div className="text-xs font-medium text-[var(--cream)] mb-3">Player attributes</div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
        {[
          { lbl: 'Stamina',           val: player.stamina,          col: '#7edb5a' },
          { lbl: 'Form',              val: player.form,             col: 'var(--gold)' },
          { lbl: 'Pressure handling', val: player.pressure_handling, col: '#4a9fd4' },
          { lbl: 'Fitness',           val: player.fitness,          col: '#9b59b6' },
        ].map(({ lbl, val, col }) => (
          <div key={lbl} className="flex items-center gap-3">
            <div className="text-xs text-[var(--muted)] w-36 flex-shrink-0">{lbl}</div>
            <div className="flex-1 bg-[var(--dark2)] rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${val}%`, background: col }} />
            </div>
            <div className="font-mono text-xs text-[var(--cream)] w-8 text-right">{val}</div>
          </div>
        ))}
      </div>

      {/* Skill description */}
      {player.skill_description && (
        <div className="bg-[rgba(22,115,199,0.06)] border border-[var(--border)] rounded-xl p-4 mb-5">
          <div className="text-[9px] uppercase tracking-widest text-[var(--gold)] mb-2">Scout report</div>
          <p className="text-sm text-[rgba(245,240,232,0.78)] leading-relaxed">{player.skill_description}</p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => router.push(`/setup?player=${id}`)}
        className="w-full py-3.5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm hover:bg-[var(--gold-light)] transition-all"
      >
        PLAY WITH {player.name.split(' ')[0].toUpperCase()} →
      </button>
    </div>
  )
}
