'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getUserMatches } from '@/lib/supabase'
import { useSetupStore } from '@/lib/store'

interface Match {
  id: string
  format: string
  created_at: string
  status: string
  winner: string
  win_margin: string
  innings1_score: number
  innings1_wickets: number
  innings2_score: number
  innings2_wickets: number
  team_a_name: string
  team_b_name: string
}

interface UserProfile {
  username: string
  display_name: string
  plan: string
  matches_played: number
  matches_this_month: number
}

export default function DashboardPage() {
  const router  = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      loadData(user.id)
    })
  }, [])

  const loadData = async (uid: string) => {
    try {
      const [profileRes, matchRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', uid).single(),
        getUserMatches(uid),
      ])
      setProfile(profileRes.data)
      setMatches(matchRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center">
      <div className="text-[var(--muted)] text-sm">Loading dashboard...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-6 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--gold)] mb-0.5">QUICKCRIC</div>
          <div className="text-lg font-medium text-[var(--cream)]">
            {profile?.display_name ?? user?.email?.split('@')[0] ?? 'Player'}
          </div>
        </div>
        <button onClick={signOut} className="text-xs text-[var(--muted)] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:text-[var(--cream)] transition-all">
          Sign out
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { val: profile?.matches_played ?? 0, label: 'Total matches' },
          { val: matches.filter(m => m.winner === 'A').length, label: 'Team A wins' },
          { val: matches.filter(m => m.status === 'complete').length, label: 'Completed' },
        ].map(({ val, label }) => (
          <div key={label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="font-mono text-2xl font-medium text-[var(--gold)]">{val}</div>
            <div className="text-[10px] text-[var(--muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* New match CTA */}
      <button
        onClick={() => { useSetupStore.getState().reset(); router.push('/setup') }}
        className="w-full py-3.5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm hover:bg-[var(--gold-light)] transition-all mb-5"
        style={{fontFamily:'monospace'}}
      >
        + BUILD NEW MATCH
      </button>

      {/* Match history */}
      <div className="text-xs font-medium text-[var(--cream)] mb-3">Recent matches</div>
      {matches.length === 0 && (
        <div className="text-center py-10 text-[var(--muted)] text-sm">No matches yet — build your first one!</div>
      )}
      <div className="space-y-2">
        {matches.map(m => (
          <div
            key={m.id}
            onClick={() => router.push(`/result/${m.id}`)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 cursor-pointer hover:border-[var(--border-hi)] transition-all flex items-center gap-3"
          >
            <div className="text-2xl">{m.format === 'T20' ? '⚡' : m.format === 'ODI' ? '🏏' : '🎯'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--cream)]">
                {m.team_a_name} vs {m.team_b_name}
              </div>
              <div className="font-mono text-[10px] text-[var(--muted)] mt-0.5">
                {m.innings1_score}/{m.innings1_wickets} vs {m.innings2_score}/{m.innings2_wickets}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-medium ${m.status === 'complete' ? 'text-[var(--gold)]' : 'text-[var(--muted)]'}`}>
                {m.status === 'complete' ? `Team ${m.winner} won` : m.status}
              </div>
              <div className="text-[9px] text-[var(--muted)] mt-0.5">
                {new Date(m.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
