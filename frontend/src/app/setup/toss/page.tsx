'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useSetupStore } from '@/lib/store'
import { WizardHeader } from '@/components/setup/WizardShell'

export default function TossPage() {
  const router = useRouter()
  const { setup, setToss, clearToss } = useSetupStore()

  // A toss left over from a previous match made `decided` true on arrival,
  // showing FLIP COIN and LET'S PROCEED side by side. Every visit to this
  // page starts with an unflipped coin.
  useEffect(() => { clearToss() }, [clearToss])

  const opponentPreChoice = useMemo<'bat' | 'bowl'>(() => (Math.random() < 0.5 ? 'bat' : 'bowl'), [])

  const [flipping, setFlipping] = useState(false)
  const [flipped, setFlipped]   = useState(false)
  const [winner, setWinner]     = useState<'A' | 'B' | null>(null)
  const [launching, setLaunching] = useState(false)

  const teamAName = setup.team_a_name ?? 'My Team'
  const teamBName = setup.team_b_name ?? 'Opponent'

  const flip = () => {
    setFlipping(true)
    setTimeout(() => {
      setFlipping(false)
      setFlipped(true)
      const tossWinner: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B'
      setWinner(tossWinner)
      if (tossWinner === 'B') setToss('B', opponentPreChoice)
    }, 1600)
  }

  const chooseDecision = (decision: 'bat' | 'bowl') => setToss('A', decision)

  const launch = () => {
    if (launching) return
    setLaunching(true)
    const matchId = uuidv4()
    router.push(`/match/${matchId}`)
  }

  const decided = !!setup.toss_decision

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={9} title="The toss" subtitle="Whoever calls it right chooses to bat or bowl first" />

      <div className="px-6 max-w-lg mx-auto flex flex-col items-center pt-8 pb-20">
        <div className="flex items-center justify-between w-full mb-10 text-center">
          <div className="flex-1">
            <div className="text-2xl mb-1">{setup.captain_a?.flag_emoji ?? '🏏'}</div>
            <div className="text-sm font-medium text-[var(--cream)]">{teamAName}</div>
            <div className="text-[10px] text-[var(--muted)]">Capt. {setup.captain_a?.name ?? '—'}</div>
          </div>
          <div className="text-[var(--muted)] text-xs px-3">VS</div>
          <div className="flex-1">
            <div className="text-2xl mb-1">{setup.captain_b?.flag_emoji ?? '🏏'}</div>
            <div className="text-sm font-medium text-[var(--cream)]">{teamBName}</div>
            <div className="text-[10px] text-[var(--muted)]">Capt. {setup.captain_b?.name ?? '—'}</div>
          </div>
        </div>

        <div className="coin-wrap mb-10">
          <div className={`coin ${flipping ? 'flipping' : ''}`}>
            <div className="coin-face heads">🪙</div>
            <div className="coin-face tails">🏆</div>
          </div>
        </div>

        {!flipped && (
          <button
            onClick={flip}
            disabled={flipping}
            className="px-8 py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm disabled:opacity-50 hover:bg-[var(--gold-light)] transition-all"
            style={{ fontFamily: 'monospace' }}
          >
            {flipping ? 'FLIPPING...' : 'FLIP COIN'}
          </button>
        )}

        {flipped && winner === 'A' && !decided && (
          <div className="text-center">
            <div className="text-sm text-[var(--gold)] mb-4">{teamAName} won the toss! What will you do?</div>
            <div className="flex gap-3">
              <button onClick={() => chooseDecision('bat')} className="px-6 py-3 border border-[var(--border-hi)] rounded-xl text-sm text-[var(--cream)] hover:border-[var(--gold)] transition-all">🏏 Bat first</button>
              <button onClick={() => chooseDecision('bowl')} className="px-6 py-3 border border-[var(--border-hi)] rounded-xl text-sm text-[var(--cream)] hover:border-[var(--gold)] transition-all">🎯 Bowl first</button>
            </div>
          </div>
        )}

        {flipped && winner === 'B' && (
          <div className="text-center text-sm text-[var(--cream)]">
            <span className="text-[var(--gold)]">{teamBName}</span> won the toss and chose to <span className="text-[var(--gold)]">{opponentPreChoice}</span> first.
          </div>
        )}

        {decided && (
          <button
            onClick={launch}
            disabled={launching}
            className="mt-8 px-8 py-4 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-lg hover:bg-[var(--gold-light)] transition-all disabled:opacity-70"
            style={{ fontFamily: 'monospace' }}
          >
            {launching
              ? <span className="inline-flex items-center gap-3"><span className="w-5 h-5 border-2 border-[rgba(234,243,251,0.4)] border-t-[var(--dark)] rounded-full animate-spin" /> PREPARING YOUR MATCH...</span>
              : "LET'S PROCEED TO LIVE ACTION →"}
          </button>
        )}
      </div>

      <style jsx>{`
        .coin-wrap { perspective: 1000px; }
        .coin {
          width: 120px; height: 120px; border-radius: 50%; position: relative;
          transform-style: preserve-3d;
        }
        .coin.flipping { animation: tossCoin 1.6s ease-in-out; }
        @keyframes tossCoin {
          0%   { transform: translateY(0) rotateY(0deg); }
          50%  { transform: translateY(-160px) rotateY(1080deg); }
          100% { transform: translateY(0) rotateY(2160deg); }
        }
        .coin-face {
          position: absolute; inset: 0; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; backface-visibility: hidden;
          border: 3px solid var(--gold); background: var(--card);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .coin-face.tails { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}
