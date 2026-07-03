'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLiveMatch, useSetupStore } from '@/lib/store'
import { InningsScorecard } from '@/components/match/InningsScorecard'
import { inningsToCard, computePlayerOfMatch, saveMatch, getSavedMatches, InningsCard, SavedMatch } from '@/lib/matchHistory'

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle" />
}

export default function ResultPage() {
  const { matchId }  = useParams() as { matchId: string }
  const router       = useRouter()
  const { result, innings1, innings2, matchId: liveMatchId } = useLiveMatch()
  const { setup } = useSetupStore()
  const [navigating, setNavigating] = useState<'new' | 'history' | null>(null)

  // The in-memory result only belongs to THIS page if the ids match —
  // otherwise this is an older match opened from history while a different
  // match's result is still sitting in the store.
  const isLive = !!result && liveMatchId === matchId

  // Opened from "Previous matches" (or on a page refresh) there's no live
  // match in memory — fall back to the saved snapshot for this id.
  const [saved, setSaved] = useState<SavedMatch | null>(null)
  const [savedLookupDone, setSavedLookupDone] = useState(false)
  useEffect(() => {
    if (isLive) return
    getSavedMatches()
      .then(list => setSaved(list.find(m => m.id === matchId) ?? null))
      .catch(() => {})
      .finally(() => setSavedLookupDone(true))
  }, [isLive, matchId])

  const teamAName = setup.team_a_name ?? 'Team A'
  const teamBName = setup.team_b_name ?? 'Team B'

  // The sim-engine reports the winner as 'A' | 'B' | 'tie'; the local
  // fallback sim reports the team name directly. Normalize to a name.
  const liveWinnerName = !isLive || !result ? '' :
    result.winner === 'A' ? teamAName :
    result.winner === 'B' ? teamBName :
    result.winner === 'tie' ? '' : result.winner

  const liveCards = useMemo<[InningsCard, InningsCard] | null>(() => {
    if (!isLive || !innings1 || !innings2) return null
    const nameFor = (side: 'A' | 'B') => (side === 'A' ? teamAName : teamBName)
    return [
      inningsToCard(innings1, nameFor(innings1.batting_team)),
      inningsToCard(innings2, nameFor(innings2.batting_team)),
    ]
  }, [isLive, innings1, innings2, teamAName, teamBName])

  // Player of the Match — from the winning team, batting + bowling weighed
  // together, the way real matches award it.
  const livePotm = useMemo(
    () => (liveCards ? computePlayerOfMatch(liveCards, liveWinnerName) : null),
    [liveCards, liveWinnerName],
  )

  // Live match state wins; otherwise the saved snapshot drives the page.
  const winnerName = isLive ? liveWinnerName : (saved && saved.winnerName !== 'Match tied' ? saved.winnerName : '')
  const margin     = isLive && result ? result.margin : (saved?.margin ?? '')
  const cards      = liveCards ?? saved?.innings ?? null
  const potm       = isLive ? livePotm : (saved?.potm ?? null)
  const hasMatch   = isLive || !!saved

  // Snapshot this match into history (Supabase for signed-in users,
  // localStorage fallback) so it shows up under "Your previous matches".
  useEffect(() => {
    if (!isLive || !result || !liveCards) return
    saveMatch({
      id: matchId,
      playedAt: new Date().toISOString(),
      format: setup.format ?? '',
      stadium: setup.stadium?.name ?? '',
      teamAName, teamBName,
      winnerName: liveWinnerName || 'Match tied',
      margin: result.margin,
      potm: livePotm,
      innings: liveCards,
    }).catch(() => {})
  }, [isLive, result, liveCards, matchId, livePotm, liveWinnerName, teamAName, teamBName, setup.format, setup.stadium?.name])

  if (!hasMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dark)]">
        <div className="text-center">
          {!savedLookupDone ? (
            <>
              <Spinner />
              <div className="text-[var(--muted)] text-sm mt-3">Loading match...</div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">🏏</div>
              <div className="text-[var(--muted)]">No match result found.</div>
              <button onClick={() => router.push('/setup')} className="mt-4 text-[var(--gold)] underline text-sm">
                Start a new match
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] px-6 py-8 max-w-xl mx-auto">
      {/* Winner banner */}
      <div className="text-center mb-8">
        <div className="text-7xl mb-4">🏆</div>
        <div className="text-3xl font-black text-[var(--gold)] mb-1 tracking-tight">
          {winnerName ? `${winnerName.toUpperCase()} WIN!` : 'MATCH TIED!'}
        </div>
        {winnerName && <div className="text-lg text-[var(--cream)]">by {margin}</div>}
        {!isLive && saved && (
          <div className="text-[10px] tracking-widest text-[var(--muted)] mt-2 uppercase">
            {saved.format}{saved.stadium ? ` · ${saved.stadium}` : ''} · {new Date(saved.playedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Player of the Match */}
      {potm && (
        <div className="mb-6 bg-[rgba(22,115,199,0.08)] border border-[var(--border-hi)] rounded-xl p-5 text-center">
          <div className="text-[9px] uppercase tracking-[3px] text-[var(--gold)] font-semibold mb-2">Player of the Match</div>
          <div className="text-xl font-bold text-[var(--cream)]">{potm.name}</div>
          {potm.line && <div className="font-mono text-sm text-[var(--gold)] mt-1">{potm.line}</div>}
          {winnerName && <div className="text-[10px] text-[var(--muted)] mt-1.5">{winnerName}</div>}
        </div>
      )}

      {/* Full scorecards, both innings */}
      {cards && (
        <div className="space-y-4 mb-6">
          <div className="text-[10px] uppercase tracking-[3px] text-[var(--muted)] font-semibold">Match scorecard</div>
          <InningsScorecard card={cards[0]} />
          <InningsScorecard card={cards[1]} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { setNavigating('history'); router.push('/matches') }}
          disabled={!!navigating}
          className="flex-1 py-3 border border-[var(--border)] text-[var(--muted)] rounded-xl hover:text-[var(--cream)] hover:border-[var(--border-hi)] transition-all text-sm disabled:opacity-60"
        >
          {navigating === 'history' ? <Spinner /> : 'Previous matches'}
        </button>
        <button
          onClick={() => { setNavigating('new'); router.push('/setup') }}
          disabled={!!navigating}
          className="flex-1 py-3 bg-[var(--gold)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--gold-light)] transition-all disabled:opacity-60"
        >
          {navigating === 'new' ? <Spinner /> : 'Build a new match'}
        </button>
      </div>
    </div>
  )
}
