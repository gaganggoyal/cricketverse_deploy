'use client'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { Player, BowlerAllocation } from '@/types'

function Card({ title, editHref, children }: { title: string; editHref: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-[var(--muted)]">{title}</div>
        <button onClick={() => router.push(editHref)} className="text-[10px] text-[var(--gold)] underline">Edit</button>
      </div>
      {children}
    </div>
  )
}

function TeamSummary({ name, captain, order, plan, bowlOrder }: {
  name: string
  captain: Player | null
  order: Player[]
  plan: BowlerAllocation[]
  bowlOrder: Player[]
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[var(--gold)]">{name}</div>
      <div className="text-[11px] text-[var(--muted)]">
        Captain: <span className="text-[var(--cream)]">{captain?.name ?? '—'}</span>
      </div>
      <div className="text-[11px] text-[var(--muted)] leading-relaxed">
        Batting: {order.map(p => p.name.split(' ').pop()).join(' → ')}
      </div>
      <div className="text-[11px] text-[var(--muted)] leading-relaxed">
        Bowling: {bowlOrder.map(p => {
          const overs = plan.find(x => x.player_id === p.id)?.overs ?? 0
          return `${p.name.split(' ').pop()} (${overs})`
        }).join(', ')}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const { setup } = useSetupStore()

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={8} title="Final check before toss" subtitle="Take one last look — you can still edit anything below" />
      <div className="px-6 max-w-2xl mx-auto pb-32 space-y-4">

        <div className="border border-[var(--gold)] bg-[rgba(22,115,199,0.06)] rounded-xl p-4 text-xs text-[var(--cream)] leading-relaxed">
          ⚠️ Once you proceed to the toss, team and order selections are locked for this match.
        </div>

        <Card title="Match" editHref="/setup">
          <div className="text-xs text-[var(--cream)]">
            {setup.format} ({setup.total_overs} overs) · {setup.stadium?.name ?? '—'} · {setup.pitch} pitch · {setup.time_of_play}
          </div>
        </Card>

        <Card title="My Team" editHref="/setup/captain">
          <TeamSummary
            name={setup.team_a_name ?? 'My Team'}
            captain={setup.captain_a ?? null}
            order={setup.batting_order_a ?? setup.team_a ?? []}
            plan={setup.bowling_plan_a ?? []}
            bowlOrder={setup.bowling_order_a ?? []}
          />
        </Card>

        <Card title="Opponent Team" editHref="/setup/captain">
          <TeamSummary
            name={setup.team_b_name ?? 'Opponent'}
            captain={setup.captain_b ?? null}
            order={setup.batting_order_b ?? setup.team_b ?? []}
            plan={setup.bowling_plan_b ?? []}
            bowlOrder={setup.bowling_order_b ?? []}
          />
        </Card>
      </div>
      <WizardFooter backHref="/setup/bowling-order" nextHref="/setup/toss" nextLabel="Proceed to toss →" />
    </div>
  )
}
