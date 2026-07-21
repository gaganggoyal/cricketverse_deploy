'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, getReferralData } from '@/lib/api'

export default function ReferralPage() {
  const router  = useRouter()
  const [user,   setUser]   = useState<any>(null)
  const [profile,setProfile]= useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [refs,   setRefs]   = useState<any[]>([])

  useEffect(() => {
    auth.getUser().then(async (user) => {
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      try {
        const { profile, referrals } = await getReferralData()
        setProfile(profile)
        setRefs(referrals)
      } catch {
        setRefs([])
      }
    })
  }, [])

  const referralLink = profile?.referral_code
    ? `https://cricketverse.app?ref=${profile.referral_code}`
    : ''

  const copy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Play QuickCric with me!',
        text:  'Build AI cricket matches with real players — Bumrah, Kohli, Babar. 5 free matches/month!',
        url:   referralLink,
      })
    } else copy()
  }

  const converted = refs.filter(r => r.converted).length
  const credits   = profile?.referral_credits ?? 0

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-8 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="text-xs text-[var(--muted)] mb-6 hover:text-[var(--cream)]">
        ← Back
      </button>

      <div className="text-[10px] tracking-widest text-[var(--gold)] mb-1">REFER & EARN</div>
      <h1 className="text-3xl font-bold text-[var(--cream)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Share QuickCric
      </h1>
      <p className="text-sm text-[var(--muted)] mb-8 leading-relaxed">
        For every friend who upgrades to Pro or Elite, you earn <span className="text-[var(--gold)]">1 free bonus match</span> — forever.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { val: refs.length, lbl: 'Invited',   col: 'text-[var(--cream)]' },
          { val: converted,   lbl: 'Converted', col: 'text-green-400' },
          { val: credits,     lbl: 'Credits',   col: 'text-[var(--gold)]' },
        ].map(({ val, lbl, col }) => (
          <div key={lbl} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div className={`font-mono text-2xl font-medium ${col}`}>{val}</div>
            <div className="text-[10px] text-[var(--muted)] mt-0.5">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <div className="text-xs text-[var(--muted)] mb-2">Your referral link</div>
        <div className="flex items-center gap-2 bg-[var(--dark2)] rounded-lg px-3 py-3 mb-3 font-mono text-xs text-[var(--gold)] break-all">
          {referralLink || 'Loading...'}
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 py-2.5 border border-[var(--border)] text-sm text-[var(--muted)] rounded-lg hover:border-[var(--border-hi)] hover:text-[var(--cream)] transition-all">
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
          <button onClick={share} className="flex-1 py-2.5 bg-[var(--gold)] text-[var(--dark)] rounded-lg font-medium text-sm hover:bg-[var(--gold-light)] transition-all">
            Share →
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-5">
        <div className="text-xs font-medium text-[var(--cream)] mb-4">How it works</div>
        <div className="space-y-3">
          {[
            { n: '1', t: 'Share your link', d: 'Send it to cricket-loving friends via WhatsApp, Twitter, or anywhere' },
            { n: '2', t: 'They sign up free', d: 'Friend creates an account using your referral link' },
            { n: '3', t: 'They upgrade', d: 'When they subscribe to Pro or Elite (any time)' },
            { n: '4', t: 'You earn a credit', d: '1 bonus match credit added to your account — stackable, no expiry' },
          ].map(s => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[rgba(201,168,76,0.15)] border border-[var(--gold)] flex items-center justify-center text-[10px] font-bold text-[var(--gold)] flex-shrink-0 mt-0.5">
                {s.n}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--cream)]">{s.t}</div>
                <div className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral history */}
      {refs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--cream)] mb-3">Your referrals</div>
          <div className="space-y-2">
            {refs.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
                <div className="text-sm text-[var(--cream)]">Friend #{i + 1}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${r.converted ? 'bg-green-900 text-green-300' : 'bg-[var(--dark2)] text-[var(--muted)]'}`}>
                  {r.converted ? '✓ Upgraded' : 'Signed up'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
