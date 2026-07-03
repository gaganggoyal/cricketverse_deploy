'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { autoAssignOvers } from '@/lib/localSim'
import { BowlerAllocation, Format, MAX_OVERS_PER_BOWLER, Player } from '@/types'

function BowlingPlanner({
  players, plan, maxPerBowler, totalOvers, onChange,
}: {
  players: Player[]
  plan: BowlerAllocation[]
  maxPerBowler: number
  totalOvers: number
  onChange: (plan: BowlerAllocation[]) => void
}) {
  const oversFor = (id: string) => plan.find(x => x.player_id === id)?.overs ?? 0
  const assigned = plan.reduce((sum, x) => sum + x.overs, 0)
  const remaining = totalOvers - assigned

  const setOvers = (id: string, overs: number) => {
    const clamped = Math.max(0, Math.min(maxPerBowler, overs))
    const others = plan.filter(x => x.player_id !== id)
    const otherTotal = others.reduce((s, x) => s + x.overs, 0)
    const finalOvers = Math.min(clamped, totalOvers - otherTotal)
    const next = [...others, { player_id: id, overs: finalOvers }].filter(x => x.overs > 0)
    onChange(next)
  }

  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-[var(--cream)]">Assign overs</div>
        <div className={`text-xs font-mono ${remaining === 0 ? 'text-[var(--gold)]' : 'text-[var(--muted)]'}`}>
          {assigned}/{totalOvers} overs allocated
        </div>
      </div>
      <div className="text-[10px] text-[var(--muted)] mb-3">Max {maxPerBowler} over{maxPerBowler > 1 ? 's' : ''} per bowler in this format</div>

      <div className="space-y-1.5">
        {players.map(p => {
          const overs = oversFor(p.id)
          const eligible = p.role === 'Bowler' || p.role === 'All-rounder'
          return (
            <div key={p.id} className={`flex items-center gap-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg px-2.5 py-2 ${!eligible ? 'opacity-60' : ''}`}>
              <span className="text-lg">{p.flag_emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--cream)] truncate">{p.name}</div>
                <div className="text-[9px] text-[var(--muted)]">{p.role}{p.bowl_type ? ` · ${p.bowl_type}` : ''}</div>
              </div>
              <button
                onClick={() => setOvers(p.id, overs - 1)}
                disabled={overs === 0}
                className="w-7 h-7 rounded-md border border-[var(--border)] text-[var(--gold)] disabled:opacity-20 hover:border-[var(--gold)] transition-all"
              >−</button>
              <div className="w-8 text-center text-sm font-mono text-[var(--gold)]">{overs}</div>
              <button
                onClick={() => setOvers(p.id, overs + 1)}
                disabled={overs >= maxPerBowler || remaining === 0}
                className="w-7 h-7 rounded-md border border-[var(--border)] text-[var(--gold)] disabled:opacity-20 hover:border-[var(--gold)] transition-all"
              >+</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BowlingOversPage() {
  const router = useRouter()
  const { setup, setBowlingPlanA, setBowlingPlanB } = useSetupStore()
  const [tab, setTab] = useState<'A' | 'B'>('A')
  const autoAdvancedRef = useRef(false)

  useEffect(() => {
    if ((setup.team_a?.length ?? 0) !== 11 || (setup.team_b?.length ?? 0) !== 11) router.replace('/setup/teams')
  }, [setup.team_a, setup.team_b, router])

  const format = (setup.format ?? 'T20') as Format
  const maxPerBowler = MAX_OVERS_PER_BOWLER[format]
  const totalOvers = setup.total_overs ?? 20

  // Smart default: rank bowlers by economy/average so the page doesn't
  // start at 0/20 requiring the user to build the whole plan by hand.
  useEffect(() => {
    if (!setup.bowling_plan_a?.length && setup.team_a?.length) {
      setBowlingPlanA(autoAssignOvers(setup.team_a, maxPerBowler, totalOvers))
    }
    if (!setup.bowling_plan_b?.length && setup.team_b?.length) {
      setBowlingPlanB(autoAssignOvers(setup.team_b, maxPerBowler, totalOvers))
    }
  }, [setup.team_a, setup.team_b]) // eslint-disable-line react-hooks/exhaustive-deps

  const planA = setup.bowling_plan_a ?? []
  const planB = setup.bowling_plan_b ?? []
  const assignedA = planA.reduce((s, x) => s + x.overs, 0)
  const assignedB = planB.reduce((s, x) => s + x.overs, 0)
  const canNext = assignedA === totalOvers && assignedB === totalOvers

  // Once My Team's overs are fully allocated, move on to the opponent
  // instead of making the user click the tab themselves.
  useEffect(() => {
    if (assignedA === totalOvers && assignedB < totalOvers && tab === 'A' && !autoAdvancedRef.current) {
      autoAdvancedRef.current = true
      setTab('B')
    }
    if (assignedA < totalOvers) autoAdvancedRef.current = false
  }, [assignedA, assignedB, totalOvers, tab])

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={6} title="Allocate bowling overs" subtitle={`Distribute all ${totalOvers} overs across your bowlers for each team`} />
      <div className="px-6 max-w-2xl mx-auto pb-32">
        <div className="flex gap-2 mb-4">
          {(['A', 'B'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                tab === t ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)] font-medium' : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {t === 'A' ? (setup.team_a_name ?? 'My Team') : (setup.team_b_name ?? 'Opponent')} ({t === 'A' ? assignedA : assignedB}/{totalOvers})
            </button>
          ))}
        </div>
        {tab === 'A'
          ? <BowlingPlanner players={setup.team_a ?? []} plan={planA} maxPerBowler={maxPerBowler} totalOvers={totalOvers} onChange={setBowlingPlanA} />
          : <BowlingPlanner players={setup.team_b ?? []} plan={planB} maxPerBowler={maxPerBowler} totalOvers={totalOvers} onChange={setBowlingPlanB} />}
      </div>
      <WizardFooter backHref="/setup/batting-order" nextHref="/setup/bowling-order" nextDisabled={!canNext} nextLabel="Set bowling order →" />
    </div>
  )
}
