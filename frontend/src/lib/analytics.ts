'use client'
/**
 * QuickCric Analytics
 * ─────────────────────
 * Lightweight privacy-first event tracker.
 * Stores to the analytics_events table via /api/analytics.
 * No third-party trackers. GDPR compliant by default.
 */

import { useCallback, useEffect, useRef } from 'react'
import { trackEvents, getAnalyticsSummaryData, getAdminAnalyticsData } from './api'

type EventName =
  | 'page_view'
  | 'match_start'
  | 'match_complete'
  | 'match_share'
  | 'ball_bowled'
  | 'six_hit'
  | 'wicket_fell'
  | 'innings_break'
  | 'auto_mode_on'
  | 'voice_enabled'
  | 'voice_six'
  | 'camera_changed'
  | 'multiplayer_create'
  | 'multiplayer_join'
  | 'fantasy_team_locked'
  | 'tournament_created'
  | 'coach_message'
  | 'upgrade_click'
  | 'upgrade_complete'
  | 'referral_shared'
  | 'achievement_earned'

interface TrackOptions {
  userId?:    string | null
  sessionId?: string
}

// Session ID — persists for browser session
function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let sid = sessionStorage.getItem('cv_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('cv_sid', sid)
  }
  return sid
}

// Debounce rapid events (e.g. ball_bowled) — max 1 per 500ms
function useDebounce<T extends (...args: any[]) => any>(fn: T, ms = 500) {
  const timer = useRef<NodeJS.Timeout | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

// Queue events in memory and batch-flush every 5s
const eventQueue: any[] = []
let flushTimer: NodeJS.Timeout | null = null

function queueEvent(payload: any) {
  eventQueue.push(payload)
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 5000)
  }
}

async function flushEvents() {
  flushTimer = null
  if (!eventQueue.length) return
  const batch = eventQueue.splice(0, 20)   // max 20 per flush
  try {
    await trackEvents(batch)
  } catch {}
}

// Main track function
export function track(
  event: EventName,
  properties: Record<string, any> = {},
  opts: TrackOptions = {}
) {
  if (typeof window === 'undefined') return

  // user_id and created_at are no longer sent: the API stamps both from
  // the session and the server clock, so events cannot be backdated or
  // attributed to another account.
  const payload = {
    event,
    session_id:  getSessionId(),
    properties:  {
      ...properties,
      url:         window.location.pathname,
      referrer:    document.referrer || null,
      viewport:    `${window.innerWidth}x${window.innerHeight}`,
      device:      window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    },
    page:        window.location.pathname,
  }

  queueEvent(payload)

  // Flush immediately for high-value events
  if (['upgrade_complete', 'match_start', 'match_complete'].includes(event)) {
    flushEvents()
  }
}

// React hook
export function useAnalytics(userId?: string | null) {
  const opts: TrackOptions = { userId: userId ?? null, sessionId: getSessionId() }

  useEffect(() => {
    track('page_view', {}, opts)
    return () => { flushEvents() }
  }, [])

  const trackEvent = useCallback((event: EventName, props: Record<string, any> = {}) => {
    track(event, props, opts)
  }, [userId])

  return { track: trackEvent }
}

// ── SERVER-SIDE AGGREGATE QUERIES ─────────────────────────────────

// The userId argument is ignored — the endpoint scopes to the session
// user. It is kept so existing call sites compile unchanged.
export async function getAnalyticsSummary(_userId?: string) {
  const { events, matches } = await getAnalyticsSummaryData()

  const tally = (rows: any[], key: string): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const r of rows) if (r[key]) out[r[key]] = (out[r[key]] ?? 0) + 1
    return out
  }

  const byEvent  = tally(events, 'event')
  const byFormat = tally(matches, 'format')

  return {
    totalEvents:     events.length,
    matchesPlayed:   matches.length,
    matchesWon:      matches.filter(m => m.winner === 'A').length,
    avgScore:        matches.length ? Math.round(matches.reduce((s, m) => s + (m.innings1_score ?? 0), 0) / matches.length) : 0,
    favoriteFormat:  Object.entries(byFormat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'T20',
    sixesHit:        byEvent['six_hit'] ?? 0,
    wicketsFell:     byEvent['wicket_fell'] ?? 0,
    autoModeUses:    byEvent['auto_mode_on'] ?? 0,
    coachMessages:   byEvent['coach_message'] ?? 0,
  }
}

// ── ADMIN ANALYTICS QUERIES ───────────────────────────────────────

// The DAU rollup and event counts are now grouped in SQL rather than by
// pulling every raw event into the browser, and the endpoint is behind an
// admin check — previously any signed-in user could read this.
export async function getAdminAnalytics(days = 30) {
  const { dauByDay, eventCounts, paidPlans } = await getAdminAnalyticsData(days)

  const mrr = paidPlans.reduce(
    (s, r) => s + (r.plan === 'pro' ? 3.49 : r.plan === 'elite' ? 9.49 : 0) * r.count, 0)

  return {
    dauByDay,
    eventCounts,
    mrr: Math.round(mrr * 100) / 100,
    totalPaidUsers: paidPlans.reduce((s, r) => s + r.count, 0),
  }
}
