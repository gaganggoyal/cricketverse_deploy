'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { Player } from '@/types'
import { move } from '@/lib/reorder'

function OrderList({ label, order, onChange }: { label: string; order: Player[]; onChange: (o: Player[]) => void }) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="text-sm font-medium text-[var(--cream)] mb-3">{label}</div>
      <div className="space-y-1.5">
        {order.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg px-2.5 py-2">
            <input
              type="number"
              value={i + 1}
              min={1}
              max={order.length}
              onChange={e => {
                const n = Math.max(1, Math.min(order.length, Number(e.target.value) || 1)) - 1
                onChange(move(order, i, n))
              }}
              className="w-10 text-center bg-[var(--dark)] border border-[var(--border)] rounded-md text-xs text-[var(--gold)] font-mono py-1 outline-none focus:border-[var(--gold)]"
            />
            <span className="text-lg">{p.flag_emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--cream)] truncate">{p.name}</div>
              <div className="text-[9px] text-[var(--muted)]">{p.role}</div>
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
      </div>
    </div>
  )
}

export default function BattingOrderPage() {
  const router = useRouter()
  const { setup, setBattingOrderA, setBattingOrderB } = useSetupStore()
  const [tab, setTab] = useState<'A' | 'B'>('A')

  const teamA = setup.team_a ?? []
  const teamB = setup.team_b ?? []

  useEffect(() => {
    if (teamA.length !== 11 || teamB.length !== 11) { router.replace('/setup/teams'); return }
    if (!setup.batting_order_a?.length) setBattingOrderA(teamA)
    if (!setup.batting_order_b?.length) setBattingOrderB(teamB)
  }, [teamA, teamB]) // eslint-disable-line react-hooks/exhaustive-deps

  const orderA = setup.batting_order_a ?? teamA
  const orderB = setup.batting_order_b ?? teamB

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={5} title="Set batting order" subtitle="Drag the number or use the arrows to arrange your line-up" />
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
          ? <OrderList label="Batting order" order={orderA} onChange={setBattingOrderA} />
          : <OrderList label="Batting order" order={orderB} onChange={setBattingOrderB} />}
      </div>
      <WizardFooter backHref="/setup/captain" nextHref="/setup/bowling-overs" nextLabel="Assign bowling overs →" />
    </div>
  )
}
