'use client'
import { useState, useRef, useEffect } from 'react'
import { useSetupStore } from '@/lib/store'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { SearchDropdown } from '@/components/setup/SearchDropdown'
import { ALL_PLAYERS, PLAYER_BY_ID } from '@/data/players'
import { FRANCHISES } from '@/data/teams'
import { Player, Franchise } from '@/types'

function TeamPicker({
  label, players, teamName, otherPlayers, otherFranchiseId, onSetTeam,
}: {
  label: string
  players: Player[]
  teamName: string
  otherPlayers: Player[]
  otherFranchiseId: string | null
  onSetTeam: (players: Player[], name: string, franchiseId: string | null) => void
}) {
  const [mode, setMode] = useState<'franchise' | 'custom'>('franchise')
  const otherIds = new Set(otherPlayers.map(p => p.id))

  const pickFranchise = (f: Franchise) => {
    if (f.id === otherFranchiseId) return
    const roster = f.playerIds.map(id => PLAYER_BY_ID[id]).filter(Boolean).slice(0, 11)
    onSetTeam(roster, `${f.name} (${f.league})`, f.id)
  }

  const toggleCustomPlayer = (p: Player) => {
    const exists = players.find(x => x.id === p.id)
    if (exists) { onSetTeam(players.filter(x => x.id !== p.id), teamName, null); return }
    if (otherIds.has(p.id)) return
    if (players.length < 11) onSetTeam([...players, p], teamName || 'Custom XI', null)
  }

  return (
    <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--card)]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-[var(--cream)]">{label}</div>
        <div className="text-[10px] text-[var(--gold)] font-mono">{players.length}/11</div>
      </div>

      <div className="flex gap-2 mb-3">
        {(['franchise', 'custom'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
              mode === m
                ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)]'
                : 'border-[var(--border)] text-[var(--muted)]'
            }`}
          >
            {m === 'franchise' ? 'IPL / WPL team' : 'Custom XI'}
          </button>
        ))}
      </div>

      {mode === 'franchise' ? (
        <SearchDropdown
          items={FRANCHISES}
          getKey={f => f.id}
          getLabel={f => f.name}
          getSubLabel={f => f.league}
          placeholder="Search IPL or WPL team..."
          renderIcon={f => <span className="text-lg">{f.logo_emoji}</span>}
          onSelect={pickFranchise}
          isDisabled={f => f.id === otherFranchiseId}
          disabledLabel="Taken by other team"
        />
      ) : (
        <SearchDropdown
          items={ALL_PLAYERS}
          getKey={p => p.id}
          getLabel={p => p.name}
          getSubLabel={p => `${p.role} · ${p.country}`}
          placeholder="Search from top 200 players..."
          renderIcon={p => <span className="text-lg">{p.flag_emoji}</span>}
          onSelect={toggleCustomPlayer}
          isDisabled={p => otherIds.has(p.id)}
          disabledLabel="Already on other team"
        />
      )}

      {teamName && (
        <div className="text-xs text-[var(--gold)] mt-3 mb-1 font-medium">{teamName}</div>
      )}
      <div className="flex flex-wrap gap-1.5 mt-2 min-h-[32px]">
        {players.length === 0 && <span className="text-[10px] text-[var(--muted)]">No players selected yet</span>}
        {players.map(p => (
          <div
            key={p.id}
            onClick={() => toggleCustomPlayer(p)}
            className="text-[10px] px-2 py-1 rounded-full bg-[rgba(22,115,199,0.12)] border border-[var(--border-hi)] text-[var(--gold)] cursor-pointer hover:bg-[rgba(22,115,199,0.2)]"
          >
            {p.flag_emoji} {p.name} ×
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TeamsPage() {
  const { setup, setTeamA, setTeamB } = useSetupStore()
  const teamA = setup.team_a ?? []
  const teamB = setup.team_b ?? []
  const [franchiseIdA, setFranchiseIdA] = useState<string | null>(null)
  const [franchiseIdB, setFranchiseIdB] = useState<string | null>(null)
  const teamBRef = useRef<HTMLDivElement>(null)
  const autoScrolledRef = useRef(false)

  // Once "My Team" is complete, move the user's attention to the opponent
  // side instead of making them scroll/click over themselves.
  useEffect(() => {
    if (teamA.length === 11 && teamB.length < 11 && !autoScrolledRef.current) {
      autoScrolledRef.current = true
      teamBRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (teamA.length < 11) autoScrolledRef.current = false
  }, [teamA.length, teamB.length])

  const canNext = teamA.length === 11 && teamB.length === 11

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader
        stepIndex={3}
        title="Build your teams"
        subtitle="Pick an IPL/WPL squad or build a custom XI · Select exactly 11 players per side"
      />
      <div className="px-6 max-w-2xl mx-auto pb-32 space-y-4">
        <TeamPicker
          label="My Team"
          players={teamA}
          teamName={setup.team_a_name ?? ''}
          otherPlayers={teamB}
          otherFranchiseId={franchiseIdB}
          onSetTeam={(players, name, fid) => { setTeamA(players, name); setFranchiseIdA(fid) }}
        />
        <div ref={teamBRef}>
          <TeamPicker
            label="Opponent Team"
            players={teamB}
            teamName={setup.team_b_name ?? ''}
            otherPlayers={teamA}
            otherFranchiseId={franchiseIdA}
            onSetTeam={(players, name, fid) => { setTeamB(players, name); setFranchiseIdB(fid) }}
          />
        </div>
      </div>
      <WizardFooter backHref="/setup" nextHref="/setup/captain" nextDisabled={!canNext} nextLabel="Choose captains →" />
    </div>
  )
}
