'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NotificationBell } from '@/components/notifications/NotificationSystem'

interface NavProps {
  transparent?: boolean
}

const NAV_LINKS = [
  { href: '/setup',        label: 'Play',        icon: '🏏' },
  { href: '/leaderboard',  label: 'Leaders',     icon: '🏆' },
  { href: '/multiplayer',  label: 'Versus',      icon: '⚔️' },
  { href: '/fantasy',      label: 'Fantasy',     icon: '🧙' },
  { href: '/tournament',   label: 'Tournament',  icon: '🥇' },
  { href: '/coach',        label: 'Coach',       icon: '🎯' },
  { href: '/analytics',    label: 'Stats',       icon: '📊' },
]

export function GlobalNav({ transparent = false }: NavProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user,     setUser]     = useState<any>(null)
  const [profile,  setProfile]  = useState<any>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase.from('user_profiles')
          .select('display_name, plan, referral_credits')
          .eq('id', user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <>
      {/* Desktop Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 hidden md:block ${
        scrolled || !transparent
          ? 'bg-[rgba(10,15,13,0.96)] backdrop-blur-md border-b border-[var(--border)]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => router.push('/')} className="font-bold tracking-widest text-[var(--gold)] text-lg flex-shrink-0" style={{ fontFamily: 'monospace' }}>
            QUICK<span className="text-[var(--cream)]">CRIC</span>
          </button>

          {/* Links */}
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(l => (
              <button key={l.href} onClick={() => router.push(l.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isActive(l.href)
                    ? 'bg-[rgba(22,115,199,0.12)] text-[var(--gold)]'
                    : 'text-[var(--muted)] hover:text-[var(--cream)] hover:bg-[var(--card)]'
                }`}>
                <span>{l.icon}</span>{l.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && <NotificationBell userId={user.id} />}

            {user ? (
              <div className="flex items-center gap-2">
                {profile?.plan !== 'free' && profile?.plan && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                    profile.plan === 'elite' ? 'bg-purple-900 text-purple-300' : 'bg-[rgba(22,115,199,0.2)] text-[var(--gold)]'
                  }`}>{profile.plan.toUpperCase()}</span>
                )}
                <button onClick={() => router.push('/dashboard')}
                  className="w-8 h-8 rounded-full bg-[rgba(22,115,199,0.12)] border border-[var(--border)] flex items-center justify-center text-sm text-[var(--gold)] font-medium hover:border-[var(--gold)] transition-all">
                  {(profile?.display_name ?? user.email ?? '?').charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/auth/login')} className="text-xs text-[var(--muted)] hover:text-[var(--cream)] transition-colors">
                  Sign in
                </button>
                <button onClick={() => router.push('/setup')} className="text-xs px-3 py-2 bg-[var(--gold)] text-[var(--dark)] rounded-lg font-medium hover:bg-[var(--gold-light)] transition-all">
                  Play free →
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[rgba(10,15,13,0.97)] border-t border-[var(--border)] safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_LINKS.slice(0, 5).map(l => (
            <button key={l.href} onClick={() => router.push(l.href)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                isActive(l.href) ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
              }`}>
              <span className="text-lg">{l.icon}</span>
              <span className="text-[9px]">{l.label}</span>
            </button>
          ))}
          <button onClick={() => router.push('/dashboard')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
              isActive('/dashboard') ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
            }`}>
            <span className="text-lg">👤</span>
            <span className="text-[9px]">Me</span>
          </button>
        </div>
      </nav>

      {/* Spacer for desktop */}
      <div className="hidden md:block h-14" />
    </>
  )
}

// ── PLAN BADGE ────────────────────────────────────────────────────
export function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'free') return null
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
      plan === 'elite' ? 'bg-purple-900 text-purple-300 border border-purple-700' :
      'bg-[rgba(22,115,199,0.2)] text-[var(--gold)] border border-[var(--border-hi)]'
    }`}>
      {plan.toUpperCase()}
    </span>
  )
}
