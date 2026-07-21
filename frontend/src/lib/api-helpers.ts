// ─────────────────────────────────────────────────────────────────
// Shared plumbing for the /api routes that replaced direct Supabase
// access from the browser.
// ─────────────────────────────────────────────────────────────────
import 'server-only'
import { NextResponse } from 'next/server'
import { HttpError } from './auth-server'

/**
 * Wraps a handler so thrown HttpErrors become their status code and
 * anything else becomes a 500 without leaking a stack trace to the
 * client. Every route below is force-dynamic: they read cookies and
 * hit the database, so caching them would serve one user's data to
 * another.
 */
export function handler<T extends any[]>(fn: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error('[api]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

export const ok      = (data: any, init?: ResponseInit) => NextResponse.json(data, init)
export const badReq  = (msg: string) => NextResponse.json({ error: msg }, { status: 400 })

/** Clamp a user-supplied limit so a crafted query can't scan a whole table. */
export function clampLimit(raw: string | null, fallback = 50, max = 500): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}
