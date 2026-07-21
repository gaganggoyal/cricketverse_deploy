// ─────────────────────────────────────────────────────────────────
// Browser-side data access — the replacement for lib/supabase.ts.
//
// Every function here is a fetch against our own /api routes. The browser
// no longer holds a database key of any kind: the session cookie is
// httpOnly, so JS cannot read it, and it is attached automatically by the
// same-origin fetches below.
//
// The exported query helpers keep the names and return shapes the old
// Supabase module had, so call sites did not need reshaping.
// ─────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    // Same-origin, so the httpOnly session cookie rides along.
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

const get  = <T>(p: string) => req<T>(p)
const post = <T>(p: string, body: unknown) => req<T>(p, { method: 'POST',  body: JSON.stringify(body) })
const patch= <T>(p: string, body: unknown) => req<T>(p, { method: 'PATCH', body: JSON.stringify(body) })

// ── AUTH ──────────────────────────────────────────────────────────
// Shaped to mirror the handful of supabase.auth calls the app made, so
// components read the same way they did before.

type AuthListener = (user: SessionUser | null) => void
const listeners = new Set<AuthListener>()

function broadcast(user: SessionUser | null) {
  listeners.forEach(fn => { try { fn(user) } catch {} })
}

export const auth = {
  /** Current user, or null when signed out. Never throws on 401. */
  async getUser(): Promise<SessionUser | null> {
    try {
      const { user } = await get<{ user: SessionUser | null }>('/api/auth/me')
      return user
    } catch {
      return null
    }
  },

  /** Current user together with their profile row, in one round trip. */
  async getUserAndProfile(): Promise<{ user: SessionUser | null; profile: any | null }> {
    try {
      return await get<{ user: SessionUser | null; profile: any }>('/api/auth/me')
    } catch {
      return { user: null, profile: null }
    }
  },

  async signUp(email: string, password: string): Promise<SessionUser> {
    const { user } = await post<{ user: SessionUser }>('/api/auth/signup', { email, password })
    broadcast(user)
    return user
  },

  async signIn(email: string, password: string): Promise<SessionUser> {
    const { user } = await post<{ user: SessionUser }>('/api/auth/login', { email, password })
    broadcast(user)
    return user
  },

  async signOut(): Promise<void> {
    await post('/api/auth/logout', {})
    broadcast(null)
  },

  /** Returns an unsubscribe function. */
  onAuthStateChange(fn: AuthListener): () => void {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}

// ── PLAYER QUERIES ────────────────────────────────────────────────
export async function searchPlayers(opts: {
  search?: string
  country_code?: string
  role?: string
  format?: string
  limit?: number
} = {}) {
  const qs = new URLSearchParams()
  if (opts.search)       qs.set('search', opts.search)
  if (opts.country_code) qs.set('country_code', opts.country_code)
  if (opts.role)         qs.set('role', opts.role)
  if (opts.format)       qs.set('format', opts.format)
  qs.set('limit', String(opts.limit ?? 50))

  return get<any[]>(`/api/players?${qs}`)
}

export async function getPlayerById(id: string) {
  const { player } = await get<{ player: any; career: any }>(`/api/players/${id}`)
  return player
}

/** Player row plus its simulated-career aggregate (player profile page). */
export async function getPlayerWithCareer(id: string) {
  return get<{ player: any; career: any }>(`/api/players/${id}`)
}

export async function getStadiums() {
  return get<any[]>('/api/stadiums')
}

export async function getLeaderboard(type: 'batters' | 'bowlers', limit = 20) {
  return get<any[]>(`/api/leaderboard?type=${type}&limit=${limit}`)
}

// ── MATCH QUERIES ─────────────────────────────────────────────────
export async function saveMatch(match: {
  format: string
  total_overs: number
  stadium_id?: string
  pitch_type: string
  time_of_play: string
  team_a_name?: string
  team_b_name?: string
  team_a_players: string[]
  team_b_players: string[]
  toss_winner: string
  toss_decision: string
}) {
  // user_id is no longer part of the payload — the server takes it from
  // the session, so a client cannot write a match into another account.
  return post<any>('/api/matches', match)
}

export async function updateMatchResult(match_id: string, result: {
  innings1_score: number
  innings1_wickets: number
  innings1_overs: string | number
  innings2_score: number
  innings2_wickets: number
  innings2_overs: string | number
  target: number
  status: 'complete'
  winner: string
  win_margin: string
  ai_analysis?: string
}) {
  return patch<any>(`/api/matches/${match_id}`, result)
}

export async function getUserMatches(_user_id?: string) {
  // The argument is ignored: the server scopes to the session user. It is
  // kept so existing call sites compile unchanged.
  return get<any[]>('/api/matches?limit=20')
}

export async function getMatchByShareToken(token: string) {
  return get<any>(`/api/share/${token}`)
}

// ── MATCH HISTORY ─────────────────────────────────────────────────
export async function fetchMatchHistory(limit = 50) {
  return get<any[]>(`/api/match-history?limit=${limit}`)
}

/** Accepts a single row or a batch (used to adopt localStorage history). */
export async function saveMatchHistory(rows: any | any[]) {
  return post<{ saved: number }>('/api/match-history', rows)
}

// ── PROFILE / REFERRALS ───────────────────────────────────────────
export async function getProfile() {
  return get<any>('/api/profile')
}

export async function updateProfile(changes: Record<string, any>) {
  return patch<any>('/api/profile', changes)
}

export async function getReferralData() {
  return get<{ profile: any; referrals: any[] }>('/api/referral')
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────
export async function getNotifications(since?: string) {
  return get<any[]>(`/api/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`)
}

export async function markNotificationRead(id: string) {
  return patch('/api/notifications', { id })
}

export async function markAllNotificationsRead() {
  return patch('/api/notifications', { all: true })
}

// ── ANALYTICS ─────────────────────────────────────────────────────
export async function trackEvents(events: any[]) {
  return post('/api/analytics', events)
}

export async function getAnalyticsSummaryData() {
  return get<{ events: any[]; matches: any[] }>('/api/analytics/summary')
}

export async function getAdminOverview() {
  return get<{ users: any[]; totals: any; matchesByDay: any[] }>('/api/admin/overview')
}

export async function getAdminAnalyticsData(days = 30) {
  return get<{
    dauByDay:    { date: string; count: number }[]
    eventCounts: Record<string, number>
    paidPlans:   { plan: string; count: number }[]
  }>(`/api/admin/analytics?days=${days}`)
}

export { ApiError }
