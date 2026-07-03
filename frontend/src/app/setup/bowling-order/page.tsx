'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { Player } from '@/types'
import { move } from '@/lib/reorder'

function BowlOrderList({ label, order, onChange }: { label: string; order: Player[]; onChange: (o: Player[]) => void }) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="text-sm font-medium text-[var(--cream)] mb-3">{label}</div>
      <div className="space-y-1.5">
        {order.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg px-2.5 py-2">
            <div className="w-8 text-center text-xs font-mono text-[var(--gold)]">{i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`}</div>
            <span className="text-lg">{p.flag_emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--cream)] truncate">{p.name}</div>
              <div className="text-[9px] text-[var(--muted)]">{p.bowl_type ?? p.role}</div>
            </div>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => i > 0 && onChange(move(order, i, i - 1))}
                disabled={i === 0}
                className="w-7 h-6 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--gold)] text-sm disabled:opacity-20 hover:border-[var(--gold)] transition-all"
              >▲</button>
              <button
                onClick={() => i < order.length - 1 && onChange(move(order, i, i + 1))}
                disabled={i === order.length - 1}
                className="w-7 h-6 flex items-center justify-center rounded-md border border-[var(--border)] text-[var(--gold)] text-sm disabled:opacity-20 hover:border-[var(--gold)] transition-all"
              >▼</button>
            </div>
          </div>
        ))}
        {order.length === 0 && <div className="text-xs text-[var(--muted)] text-center py-4">No overs assigned to any bowler yet — go back and allocate overs.</div>}
      </div>
    </div>
  )
}

export default function BowlingOrderPage() {
  const router = useRouter()
  const { setup, setBowlingOrderA, setBowlingOrderB } = useSetupStore()
  const [tab, setTab] = useState<'A' | 'B'>('A')

  const bowlersA = (setup.bowling_plan_a ?? []).map(x => (setup.team_a ?? []).find(p => p.id === x.player_id)).filter(Boolean) as any[]
  const bowlersB = (setup.bowling_plan_b ?? []).map(x => (setup.team_b ?? []).find(p => p.id === x.player_id)).filter(Boolean) as any[]

  useEffect(() => {
    if (!setup.bowling_plan_a?.length || !setup.bowling_plan_b?.length) { router.replace('/setup/bowling-overs'); return }
    if (!setup.bowling_order_a?.length) setBowlingOrderA(bowlersA)
    if (!setup.bowling_order_b?.length) setBowlingOrderB(bowlersB)
  }, [setup.bowling_plan_a, setup.bowling_plan_b]) // eslint-disable-line react-hooks/exhaustive-deps

  const orderA = setup.bowling_order_a ?? bowlersA
  const orderB = setup.bowling_order_b ?? bowlersB
  const canNext = orderA.length > 0 && orderB.length > 0

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={7} title="Set bowling order" subtitle="Choose which bowler opens the attack and the sequence that follows" />
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
              {t === 'A' ? (setup.team_a_name ?? 'My Team') : (setup.team_b_name ?? 'Opponent')}
            </button>
          ))}
        </div>
        {tab === 'A'
          ? <BowlOrderList label="Bowling order" order={orderA} onChange={setBowlingOrderA} />
          : <BowlOrderList label="Bowling order" order={orderB} onChange={setBowlingOrderB} />}
      </div>
      <WizardFooter backHref="/setup/bowling-overs" nextHref="/setup/review" nextDisabled={!canNext} nextLabel="Review match →" />
    </div>
  )
}
