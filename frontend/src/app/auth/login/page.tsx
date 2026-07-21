'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login'|'signup'>('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Where to land after auth — the middleware sets ?redirect= when it
  // bounces someone off a protected page (e.g. the match they just built).
  // window.location instead of useSearchParams: no Suspense boundary needed.
  const postAuthPath = () => {
    const r = new URLSearchParams(window.location.search).get('redirect')
    return r && r.startsWith('/') ? r : '/dashboard'
  }

  // Sign-up signs the account straight in. Supabase gated this behind an
  // emailed confirmation link; this host has no outbound mail, so the
  // confirm/resend flow was removed rather than left as a dead end.
  const handleEmail = async () => {
    setLoading(true); setError('')
    try {
      if (mode === 'signup') await auth.signUp(email, password)
      else                   await auth.signIn(email, password)
      // Full navigation, not router.push: the session cookie was just set
      // and every server component needs to re-read it.
      window.location.href = postAuthPath()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold tracking-widest text-[var(--gold)] mb-1" style={{fontFamily:'monospace'}}>
            QUICK<span className="text-[var(--cream)]">CRIC</span>
          </div>
          <div className="text-sm text-[var(--muted)]">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-3 mb-4">
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            type="email"
            autoComplete="email"
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
          />
          <input
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Password (min 6 characters)' : 'Password'}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            onKeyDown={e => e.key === 'Enter' && handleEmail()}
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
          />
        </div>

        {error && <div className="text-xs text-red-400 mb-3 text-center">{error}</div>}

        <button
          onClick={handleEmail}
          disabled={loading || !email || !password}
          className="w-full py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-wide text-sm disabled:opacity-40 hover:bg-[var(--gold-light)] transition-all mb-4"
        >
          {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div className="text-center text-xs text-[var(--muted)]">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
            className="text-[var(--gold)] underline"
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
