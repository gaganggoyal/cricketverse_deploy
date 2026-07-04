'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSavedMatches, SavedMatch } from '@/lib/matchHistory'

const STEPS = [
  { n: '01', title: 'Pick your teams',   desc: 'IPL & WPL squads or your own custom XI from 200+ real players' },
  { n: '02', title: 'Set the stage',     desc: 'Stadium, pitch, time of day — every choice changes the game' },
  { n: '03', title: 'Win the toss',      desc: 'Captains, batting order, bowling plans. Then flip the coin' },
  { n: '04', title: 'Watch it live',     desc: '3D broadcast with Hindi & English ball-by-ball commentary' },
]

export default function Home() {
  const router = useRouter()
  const [navigating, setNavigating] = useState<'build' | 'matches' | null>(null)
  const [lastMatch, setLastMatch] = useState<SavedMatch | null>(null)

  // Match history: Supabase when signed in, localStorage otherwise —
  // read after mount. New users (no matches yet) see no history button.
  useEffect(() => {
    getSavedMatches()
      .then(saved => { if (saved.length > 0) setLastMatch(saved[0]) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[var(--dark)] overflow-hidden relative">

      {/* Decorative field arcs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full border-[3px] border-[rgba(22,115,199,0.12)] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full border-[3px] border-[rgba(22,115,199,0.18)] pointer-events-none" />
      <div className="absolute -bottom-48 -left-48 w-[560px] h-[560px] rounded-full border-[3px] border-[rgba(45,138,24,0.12)] pointer-events-none" />
      <div className="absolute -bottom-28 -left-28 w-[340px] h-[340px] rounded-full border-[3px] border-[rgba(45,138,24,0.18)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 pb-16 flex flex-col items-center text-center">

        {/* Wordmark */}
        <div className="text-[10px] tracking-[4px] text-[var(--gold)] mb-5 flex items-center gap-3 font-semibold">
          <span className="w-6 sm:w-10 h-px bg-[var(--gold)]" /> REAL PLAYERS · AI POWERED · LIVE 3D <span className="w-6 sm:w-10 h-px bg-[var(--gold)]" />
        </div>
        <h1 className="text-5xl sm:text-7xl font-black mb-1 leading-none tracking-tight">
          <span className="text-[var(--gold)]">Quick</span><span className="text-[var(--cream)]">Cric</span>
        </h1>
        <div className="text-sm tracking-[3px] text-[var(--muted)] mb-8 font-medium">ANY MATCH. ANY TIME. YOURS.</div>

        <p className="text-lg sm:text-xl text-[var(--cream)] max-w-xl mb-3 leading-relaxed font-medium">
          Why wait for the next real fixture? Build the match you want to see
          and watch it live in 3D — in minutes.
        </p>
        <p className="text-sm text-[var(--muted)] max-w-md mb-10 leading-relaxed">
          Every ball simulated from actual career statistics — Bumrah genuinely bowls like Bumrah,
          Kohli genuinely chases like Kohli.
        </p>

        <button
          onClick={() => { setNavigating('build'); router.push('/setup') }}
          disabled={!!navigating}
          className="w-full sm:w-auto px-8 sm:px-12 py-4 bg-[var(--gold)] text-white rounded-xl font-bold tracking-widest text-base sm:text-lg hover:bg-[var(--gold-light)] hover:scale-[1.02] transition-all shadow-[0_8px_24px_rgba(22,115,199,0.35)] disabled:opacity-70 disabled:hover:scale-100"
        >
          {navigating === 'build'
            ? <span className="inline-flex items-center gap-3"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> SETTING UP...</span>
            : 'BUILD YOUR MATCH →'}
        </button>

        {/* Previous matches — only shown once the user has actually played one */}
        {lastMatch && (
          <button
            onClick={() => { setNavigating('matches'); router.push('/matches') }}
            disabled={!!navigating}
            className="mt-6 flex items-stretch rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,40,80,0.15)] border border-[rgba(0,0,0,0.06)] hover:border-[var(--border-hi)] hover:shadow-[0_6px_24px_rgba(0,40,80,0.2)] transition-all text-left disabled:opacity-70"
          >
            <div className="bg-white px-5 py-3 flex flex-col justify-center border-l-4 border-l-[var(--gold)]">
              <div className="text-[9px] text-[var(--muted)] tracking-widest font-semibold">LAST MATCH</div>
              <div className="text-sm font-bold text-[var(--cream)] leading-tight">
                {lastMatch.winnerName} won by {lastMatch.margin}
              </div>
              <div className="text-[10px] text-[var(--muted)]">
                {lastMatch.innings[0].teamName} {lastMatch.innings[0].score}/{lastMatch.innings[0].wickets} · {lastMatch.innings[1].teamName} {lastMatch.innings[1].score}/{lastMatch.innings[1].wickets}
              </div>
            </div>
            <div className="bg-[var(--gold)] px-4 flex flex-col items-center justify-center">
              {navigating === 'matches'
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>
                    <div className="text-[9px] font-black tracking-widest text-white leading-tight text-center">YOUR PREVIOUS<br/>MATCHES</div>
                    <div className="text-white text-sm mt-0.5">→</div>
                  </>}
            </div>
          </button>
        )}

        {/* How it works */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-left hover:shadow-[0_4px_16px_rgba(0,40,80,0.1)] transition-shadow">
              <div className="font-mono text-xs font-bold text-[var(--gold)] mb-2">{n}</div>
              <div className="text-sm font-bold text-[var(--cream)] mb-1">{title}</div>
              <div className="text-xs text-[var(--muted)] leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-6 text-center">
          {[
            { n: '200+', l: 'Real players' },
            { n: '15', l: 'IPL & WPL squads' },
            { n: '6', l: 'Match conditions' },
            { n: '2', l: 'Commentary languages' },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-3xl font-mono font-bold text-[var(--gold)]">{n}</div>
              <div className="text-xs text-[var(--muted)] mt-1">{l}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-14 pt-6 border-t border-[var(--border)] w-full flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[var(--muted)]">
          <span>© {new Date().getFullYear()} QuickCric</span>
          <a href="/privacy" className="hover:text-[var(--cream)] underline">Privacy policy</a>
          <a href="mailto:indiaoffers.in@gmail.com" className="hover:text-[var(--cream)] underline">Contact</a>
        </div>
      </div>
    </div>
  )
}
