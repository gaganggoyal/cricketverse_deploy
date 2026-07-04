'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login'|'signup'>('login')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [sent, setSent]         = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resent, setResent]     = useState(false)
  const [resending, setResending] = useState(false)

  // Where to land after auth — the middleware sets ?redirect= when it
  // bounces someone off a protected page (e.g. the match they just built).
  // window.location instead of useSearchParams: no Suspense boundary needed.
  const postAuthPath = () => {
    const r = new URLSearchParams(window.location.search).get('redirect')
    return r && r.startsWith('/') ? r : '/dashboard'
  }

  const handleEmail = async () => {
    setLoading(true); setError(''); setNeedsConfirm(false); setResent(false)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(postAuthPath())}` }
        })
        if (error) throw error
        setSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(postAuthPath())
      }
    } catch (e: any) {
      setError(e.message)
      if (e.code === 'email_not_confirmed') setNeedsConfirm(true)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true); setError('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup', email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` }
      })
      if (error) throw error
      setResent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setResending(false)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(postAuthPath())}` }
    })
  }

  if (sent) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">📧</div>
        <div className="text-xl font-medium text-[var(--cream)] mb-2">Check your email</div>
        <div className="text-sm text-[var(--muted)]">We sent a confirmation link to <span className="text-[var(--gold)]">{email}</span></div>
      </div>
    </div>
  )

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

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full py-3 border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] hover:border-[var(--border-hi)] hover:bg-[var(--card)] transition-all flex items-center justify-center gap-3 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Email */}
        <div className="space-y-3 mb-4">
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            type="email"
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
          />
          <input
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            onKeyDown={e => e.key === 'Enter' && handleEmail()}
            className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
          />
        </div>

        {error && <div className="text-xs text-red-400 mb-1 text-center">{error}</div>}
        {needsConfirm && !resent && (
          <div className="text-center mb-3">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-[var(--gold)] underline disabled:opacity-40"
            >
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
          </div>
        )}
        {resent && (
          <div className="text-xs text-[var(--muted)] mb-3 text-center">
            Confirmation email sent to <span className="text-[var(--gold)]">{email}</span>
          </div>
        )}

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
