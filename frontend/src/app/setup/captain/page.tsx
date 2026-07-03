'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { SearchDropdown } from '@/components/setup/SearchDropdown'
import { Player } from '@/types'

function CaptainPicker({
  label, teamName, players, captain, onPick,
}: {
  label: string
  teamName: string
  players: Player[]
  captain: Player | null
  onPick: (p: Player) => void
}) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="text-sm font-medium text-[var(--cream)] mb-0.5">{label}</div>
      <div className="text-[10px] text-[var(--muted)] mb-3">{teamName}</div>

      {captain && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg border border-[var(--gold)] bg-[rgba(22,115,199,0.08)]">
          <div className="text-2xl">{captain.flag_emoji}</div>
          <div>
            <div className="text-sm text-[var(--cream)] font-medium">{captain.name} <span className="text-[var(--gold)]">(C)</span></div>
            <div className="text-[10px] text-[var(--muted)]">{captain.role}</div>
          </div>
        </div>
      )}

      <SearchDropdown
        items={players}
        getKey={p => p.id}
        getLabel={p => p.name}
        getSubLabel={p => p.role}
        placeholder={captain ? 'Change captain...' : 'Search to pick captain...'}
        renderIcon={p => <span className="text-lg">{p.flag_emoji}</span>}
        onSelect={onPick}
      />
    </div>
  )
}

export default function CaptainPage() {
  const router = useRouter()
  const { setup, setCaptainA, setCaptainB } = useSetupStore()
  const teamA = setup.team_a ?? []
  const teamB = setup.team_b ?? []

  useEffect(() => {
    if (teamA.length !== 11 || teamB.length !== 11) router.replace('/setup/teams')
  }, [teamA.length, teamB.length, router])

  const opponentRef = useRef<HTMLDivElement>(null)
  const autoScrolledRef = useRef(false)

  // Once My Team's captain is set, move attention to the opponent side
  // instead of making the user scroll/click over themselves.
  useEffect(() => {
    if (setup.captain_a && !setup.captain_b && !autoScrolledRef.current) {
      autoScrolledRef.current = true
      opponentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (!setup.captain_a) autoScrolledRef.current = false
  }, [setup.captain_a, setup.captain_b])

  const canNext = !!setup.captain_a && !!setup.captain_b

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={4} title="Choose captains" subtitle="Pick a captain for each team" />
      <div className="px-6 max-w-2xl mx-auto pb-32 space-y-4">
        <CaptainPicker
          label="My Team"
          teamName={setup.team_a_name ?? 'My Team'}
          players={teamA}
          captain={setup.captain_a ?? null}
          onPick={setCaptainA}
        />
        <div ref={opponentRef}>
          <CaptainPicker
            label="Opponent Team"
            teamName={setup.team_b_name ?? 'Opponent'}
            players={teamB}
            captain={setup.captain_b ?? null}
            onPick={setCaptainB}
          />
        </div>
      </div>
      <WizardFooter backHref="/setup/teams" nextHref="/setup/batting-order" nextDisabled={!canNext} nextLabel="Set batting order →" />
    </div>
  )
}
