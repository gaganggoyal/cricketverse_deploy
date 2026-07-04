'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSavedMatches, SavedMatch } from '@/lib/matchHistory'
import { useSetupStore } from '@/lib/store'
import { AdSlot } from '@/components/ads/AdSlot'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

function MatchCard({ m, onOpen }: { m: SavedMatch; onOpen: () => void }) {
  const [inn1, inn2] = m.innings
  const winnerIsA = m.winnerName === m.teamAName
  const winnerIsB = m.winnerName === m.teamBName
  return (
    <div
      onClick={onOpen}
      className="group bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:shadow-[0_6px_20px_rgba(0,40,80,0.12)] hover:border-[var(--border-hi)] transition-all cursor-pointer"
    >
      {/* Meta strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-[rgba(22,115,199,0.06)] border-b border-[var(--border)]">
        <div className="text-[9px] tracking-widest text-[var(--muted)] font-semibold uppercase">
          {m.format}{m.stadium ? ` · ${m.stadium}` : ''}
        </div>
        <div className="text-[9px] text-[var(--muted)]">{formatDate(m.playedAt)}</div>
      </div>

      {/* Scores */}
      <div className="px-4 py-3 space-y-2">
        {[
          { name: inn1.teamName, score: `${inn1.score}/${inn1.wickets}`, overs: inn1.overs, won: inn1.teamName === m.winnerName },
          { name: inn2.teamName, score: `${inn2.score}/${inn2.wickets}`, overs: inn2.overs, won: inn2.teamName === m.winnerName },
        ].map(t => (
          <div key={t.name} className="flex items-center justify-between">
            <div className={`text-sm truncate pr-3 ${t.won ? 'font-bold text-[var(--cream)]' : 'text-[var(--muted)]'}`}>
              {t.name}
            </div>
            <div className={`font-mono text-sm shrink-0 ${t.won ? 'font-black text-[var(--gold)]' : 'text-[var(--muted)]'}`}>
              {t.score} <span className="text-[10px] font-normal">({t.overs})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Result line + POTM */}
      <div className="px-4 pb-3">
        <div className="text-[11px] font-semibold text-[#1e7a3c]">
          {winnerIsA || winnerIsB ? `${m.winnerName} won by ${m.margin}` : m.winnerName}
        </div>
        {m.potm && (
          <div className="text-[10px] text-[var(--muted)] mt-1">
            <span className="text-[var(--gold)] font-semibold">Player of the Match:</span>{' '}
            {m.potm.name}{m.potm.line ? ` — ${m.potm.line}` : ''}
          </div>
        )}
        <div className="text-[10px] font-semibold text-[var(--gold)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          View full scorecard →
        </div>
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<SavedMatch[] | null>(null)
  const [building, setBuilding] = useState(false)

  // Supabase when signed in, localStorage otherwise — load after mount.
  useEffect(() => {
    getSavedMatches().then(setMatches).catch(() => setMatches([]))
  }, [])

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[rgba(234,243,251,0.95)] sticky top-0 z-10 backdrop-blur-md">
        <div
          className="font-bold tracking-widest text-[var(--gold)] text-xl cursor-pointer"
          style={{ fontFamily: 'monospace' }}
          onClick={() => router.push('/')}
        >
          QUICK<span className="text-[var(--cream)]">CRIC</span>
        </div>
        <button
          onClick={() => { setBuilding(true); useSetupStore.getState().reset(); router.push('/setup') }}
          disabled={building}
          className="shrink-0 ml-3 px-3 sm:px-4 py-2 bg-[var(--gold)] text-white rounded-lg text-[10px] sm:text-xs font-bold tracking-wider hover:bg-[var(--gold-light)] transition-all disabled:opacity-60"
        >
          {building
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle" />
            : <><span className="hidden sm:inline">BUILD A </span>NEW MATCH →</>}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-black text-[var(--cream)] mb-1">Your previous matches</h1>
        <p className="text-xs text-[var(--muted)] mb-6">
          {matches && matches.length > 0
            ? `Your last ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}, most recent first — saved on this device.`
            : 'Matches you play are saved here on this device.'}
        </p>

        {matches && matches.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🏏</div>
            <div className="text-[var(--muted)] text-sm mb-4">No matches played yet.</div>
            <button
              onClick={() => { setBuilding(true); router.push('/setup') }}
              className="px-6 py-3 bg-[var(--gold)] text-white rounded-xl text-sm font-bold tracking-wider hover:bg-[var(--gold-light)] transition-all"
            >
              BUILD YOUR FIRST MATCH →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {matches?.map(m => (
            <MatchCard key={m.id} m={m} onOpen={() => router.push(`/result/${m.id}`)} />
          ))}
        </div>

        <AdSlot className="mt-8" />
      </div>
    </div>
  )
}
