'use client'
/**
 * QuickCric Notifications
 * ──────────────────────────
 * Polls /api/notifications every 30s. This replaced Supabase Realtime:
 * self-hosted MySQL has no change-feed to subscribe to, and for a badge
 * that updates on achievements and match invites, a poll on an indexed
 * (user_id, created_at) lookup is cheaper than running a socket layer.
 * The `since` cursor means each poll returns only genuinely new rows.
 *
 * Shows in-app toast + badge. Types:
 *   achievement   — badge earned
 *   challenge     — friend challenged you to a match
 *   match_ready   — opponent joined your room
 *   tournament    — tournament result
 *   fantasy       — fantasy points milestone
 *   system        — plan upgrade, new feature
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api'
import { createPortal } from 'react-dom'

interface Notification {
  id:         string
  type:       string
  title:      string
  body?:      string
  data?:      Record<string, any>
  read:       boolean
  created_at: string
}

interface Toast {
  id:      string
  notif:   Notification
  visible: boolean
}

const TYPE_ICONS: Record<string, string> = {
  achievement:   '🏅',
  challenge:     '⚔️',
  match_ready:   '🏏',
  tournament:    '🏆',
  fantasy:       '🧙',
  system:        '⚡',
  default:       '🔔',
}

const TYPE_COLORS: Record<string, string> = {
  achievement: 'border-[var(--gold)] bg-[rgba(22,115,199,0.1)]',
  challenge:   'border-red-700 bg-[rgba(200,60,60,0.1)]',
  match_ready: 'border-green-700 bg-[rgba(60,160,60,0.1)]',
  tournament:  'border-[var(--gold)] bg-[rgba(22,115,199,0.08)]',
  fantasy:     'border-purple-700 bg-[rgba(120,60,200,0.1)]',
  system:      'border-blue-700 bg-[rgba(60,100,200,0.1)]',
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread,        setUnread]        = useState(0)
  const [toasts,        setToasts]        = useState<Toast[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Newest created_at we have seen, used as the poll cursor. A ref, not
  // state, so advancing it does not re-trigger the polling effect.
  const cursor = useRef<string | null>(null)

  // Initial load
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    getNotifications().then(rows => {
      if (cancelled || !rows.length) return
      setNotifications(rows)
      setUnread(rows.filter(n => !n.read).length)
      cursor.current = rows[0].created_at
    }).catch(() => {})

    return () => { cancelled = true }
  }, [userId])

  // Poll for new arrivals
  useEffect(() => {
    if (!userId) return

    const tick = async () => {
      // Nothing to show while the tab is hidden, and polling a background
      // tab is pure waste.
      if (document.hidden) return
      try {
        const fresh = await getNotifications(cursor.current ?? undefined)
        if (!fresh.length) return

        cursor.current = fresh[0].created_at
        setNotifications(prev => [...fresh, ...prev])
        setUnread(u => u + fresh.length)
        // Announce newest last so the most recent toast ends up on top.
        fresh.slice().reverse().forEach(n => { showToast(n); playSound(n.type) })
      } catch {}
    }

    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [userId])

  const showToast = useCallback((notif: Notification) => {
    const id = notif.id
    setToasts(t => [...t, { id, notif, visible: true }])
    setTimeout(() => setToasts(t => t.map(x => x.id === id ? { ...x, visible: false } : x)), 4500)
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  const playSound = useCallback((type: string) => {
    try {
      const ctx  = new AudioContext()
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = type === 'achievement' ? 880 : type === 'challenge' ? 660 : 440
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }, [])

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
    setUnread(u => Math.max(0, u - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await markAllNotificationsRead()
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    setUnread(0)
  }, [userId])

  return { notifications, unread, toasts, markRead, markAllRead }
}

// ── Toast renderer ─────────────────────────────────────────────────
export function NotificationToasts({ toasts, onDismiss }: {
  toasts:    { id: string; notif: Notification; visible: boolean }[]
  onDismiss: (id: string) => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(({ id, notif, visible }) => (
        <div
          key={id}
          onClick={() => onDismiss(id)}
          className={`pointer-events-all max-w-[320px] rounded-xl border p-3 flex items-start gap-3 shadow-xl cursor-pointer transition-all duration-500 ${
            TYPE_COLORS[notif.type] ?? TYPE_COLORS.system
          } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
        >
          <div className="text-2xl flex-shrink-0">{TYPE_ICONS[notif.type] ?? TYPE_ICONS.default}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--cream)] leading-tight">{notif.title}</div>
            {notif.body && <div className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{notif.body}</div>}
          </div>
          <div className="text-[var(--muted)] text-sm flex-shrink-0">×</div>
        </div>
      ))}
    </div>,
    document.body
  )
}

// ── Notification bell + dropdown ────────────────────────────────────
import React from 'react'

export function NotificationBell({ userId }: { userId: string | null }) {
  const { notifications, unread, toasts, markRead, markAllRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)

  return (
    <>
      <NotificationToasts toasts={toasts} onDismiss={markRead} />

      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="relative w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] flex items-center justify-center hover:border-[var(--border-hi)] transition-all"
        >
          <span className="text-lg">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-80 bg-[var(--dark2)] border border-[var(--border)] rounded-xl shadow-2xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-medium text-[var(--cream)]">Notifications</div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-[var(--gold)] hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[var(--muted)] text-sm">×</button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="text-center py-8 text-[var(--muted)] text-sm">No notifications yet</div>
              )}
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--card)] transition-colors ${!n.read ? 'bg-[rgba(201,168,76,0.04)]' : ''}`}
                >
                  <div className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? TYPE_ICONS.default}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-[var(--cream)] truncate">{n.title}</div>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0" />}
                    </div>
                    {n.body && <div className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2">{n.body}</div>}
                    <div className="text-[9px] text-[var(--muted)] mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
