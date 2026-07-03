'use client'
/**
 * QuickCric Analytics
 * ─────────────────────
 * Lightweight privacy-first event tracker.
 * Stores to Supabase analytics_events table.
 * No third-party trackers. GDPR compliant by default.
 */

import { useCallback, useEffect, useRef } from 'react'
import { supabase } from './supabase'

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
    await supabase.from('analytics_events').insert(batch)
  } catch {}
}

// Main track function
export function track(
  event: EventName,
  properties: Record<string, any> = {},
  opts: TrackOptions = {}
) {
  if (typeof window === 'undefined') return

  const payload = {
    event,
    session_id:  getSessionId(),
    user_id:     opts.userId ?? null,
    properties:  {
      ...properties,
      url:         window.location.pathname,
      referrer:    document.referrer || null,
      viewport:    `${window.innerWidth}x${window.innerHeight}`,
      device:      window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    },
    page:        window.location.pathname,
    created_at:  new Date().toISOString(),
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

export async function getAnalyticsSummary(userId: string) {
  const [eventsRes, matchRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('event, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('matches')
      .select('format, pitch_type, winner, innings1_score, created_at')
      .eq('user_id', userId)
      .eq('status', 'complete')
      .limit(100),
  ])

  const events  = eventsRes.data  ?? []
  const matches = matchRes.data   ?? []

  const byEvent = events.reduce((acc, e) => {
    acc[e.event] = (acc[e.event] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalEvents:     events.length,
    matchesPlayed:   matches.length,
    matchesWon:      matches.filter(m => m.winner === 'A').length,
    avgScore:        matches.length ? Math.round(matches.reduce((s, m) => s + (m.innings1_score ?? 0), 0) / matches.length) : 0,
    favoriteFormat:  Object.entries(
      matches.reduce((acc, m) => ({ ...acc, [m.format]: (acc[m.format] ?? 0) + 1 }), {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'T20',
    sixesHit:        byEvent['six_hit'] ?? 0,
    wicketsFell:     byEvent['wicket_fell'] ?? 0,
    autoModeUses:    byEvent['auto_mode_on'] ?? 0,
    coachMessages:   byEvent['coach_message'] ?? 0,
  }
}

// ── ADMIN ANALYTICS QUERIES ───────────────────────────────────────

export async function getAdminAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const [dau, events, revenue] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('user_id, created_at')
      .gte('created_at', since)
      .eq('event', 'page_view'),
    supabase
      .from('analytics_events')
      .select('event')
      .gte('created_at', since),
    supabase
      .from('user_profiles')
      .select('plan')
      .in('plan', ['pro', 'elite']),
  ])

  const dauData   = dau.data    ?? []
  const eventData = events.data ?? []
  const revData   = revenue.data ?? []

  // Daily active users
  const byDay: Record<string, Set<string>> = {}
  dauData.forEach(e => {
    const day = e.created_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = new Set()
    if (e.user_id) byDay[day].add(e.user_id)
  })
  const dauByDay = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => ({ date, count: users.size }))

  // Event counts
  const eventCounts = eventData.reduce((acc, e) => {
    acc[e.event] = (acc[e.event] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // MRR
  const mrr = revData.reduce((s, u) => s + (u.plan === 'pro' ? 3.49 : u.plan === 'elite' ? 9.49 : 0), 0)

  return { dauByDay, eventCounts, mrr: Math.round(mrr * 100) / 100, totalPaidUsers: revData.length }
}
