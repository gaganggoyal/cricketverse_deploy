'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SharePage() {
  const { token }  = useParams() as { token: string }
  const router     = useRouter()
  const [match,    setMatch]   = useState<any>(null)
  const [loading,  setLoading] = useState(true)
  const [copied,   setCopied]  = useState(false)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*, stadiums(name,city)')
      .eq('share_token', token)
      .eq('is_public', true)
      .single()
      .then(({ data }) => { setMatch(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: 'QuickCric Match Replay',
        text:  `Watch this AI cricket match replay — ${match?.winner ? `Team ${match.winner} wins!` : ''}`,
        url:   window.location.href,
      })
    } else copyLink()
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
      <div className="text-[var(--muted)] text-sm">Loading match...</div>
    </div>
  )

  if (!match) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🏏</div>
        <div className="text-lg font-medium text-[var(--cream)] mb-2">Match not found</div>
        <div className="text-sm text-[var(--muted)] mb-6">This link may have expired or the match is private.</div>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold text-sm">
          Play your own match →
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-8 max-w-lg mx-auto">
      {/* Brand */}
      <div className="text-center mb-6">
        <div className="text-xl font-bold tracking-widest text-[var(--gold)] mb-1" style={{fontFamily:'monospace'}}>
          Quick<span className="text-[var(--cream)]">Cric</span>
        </div>
        <div className="text-xs text-[var(--muted)]">AI Match Replay</div>
      </div>

      {/* Result hero */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-4 text-center">
        <div className="text-4xl mb-3">🏆</div>
        <div className="text-2xl font-bold text-[var(--gold)] mb-1" style={{fontFamily:'Georgia,serif'}}>
          Team {match.winner} Wins!
        </div>
        <div className="text-[var(--cream)] text-base mb-1">{match.win_margin}</div>
        <div className="text-xs text-[var(--muted)]">
          {match.format} · {match.stadiums?.name ?? 'Unknown Stadium'} · {match.pitch_type} pitch
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-xs text-[var(--muted)] mb-1">Team A</div>
          <div className="font-mono text-2xl font-medium text-[var(--cream)]">
            {match.innings1_score}/{match.innings1_wickets}
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5">{match.innings1_overs} ov</div>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
          <div className="text-xs text-[var(--muted)] mb-1">Team B</div>
          <div className="font-mono text-2xl font-medium text-[var(--cream)]">
            {match.innings2_score}/{match.innings2_wickets}
          </div>
          <div className="text-xs text-[var(--muted)] mt-0.5">{match.innings2_overs} ov</div>
        </div>
      </div>

      {/* AI Analysis preview */}
      {match.ai_analysis && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-4">
          <div className="text-[9px] uppercase tracking-widest text-[var(--gold)] mb-2">AI Match Analysis</div>
          <p className="text-sm text-[rgba(245,240,232,0.75)] leading-relaxed line-clamp-4">
            {match.ai_analysis.slice(0, 300)}...
          </p>
        </div>
      )}

      {/* Share actions */}
      <div className="flex gap-3 mb-5">
        <button onClick={shareNative} className="flex-1 py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold text-sm hover:bg-[var(--gold-light)] transition-all">
          {copied ? '✓ Copied!' : 'Share match'}
        </button>
        <button onClick={copyLink} className="px-4 py-3 border border-[var(--border)] text-[var(--muted)] rounded-xl text-sm hover:border-[var(--border-hi)] hover:text-[var(--cream)] transition-all">
          Copy link
        </button>
      </div>

      {/* CTA */}
      <div className="bg-[rgba(22,115,199,0.06)] border border-[var(--border)] rounded-xl p-5 text-center">
        <div className="text-2xl mb-2">🏏</div>
        <div className="text-sm font-medium text-[var(--cream)] mb-1">Build your own AI match</div>
        <div className="text-xs text-[var(--muted)] mb-4">Pick real players. Watch it live in 3D. Free to start.</div>
        <button onClick={() => router.push('/setup')} className="w-full py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm">
          PLAY FREE →
        </button>
      </div>
    </div>
  )
}
