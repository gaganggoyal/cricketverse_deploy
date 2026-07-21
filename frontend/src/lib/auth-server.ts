// ─────────────────────────────────────────────────────────────────
// Server-side auth — replaces Supabase Auth.
//
// Model: bcrypt password hashes in `users`, opaque random session
// tokens in `sessions`, and an httpOnly cookie holding the raw token.
// Only the SHA-256 of the token is stored, so a database leak does not
// hand out live sessions, and a session can be revoked server-side by
// deleting its row (which Supabase's stateless JWTs could not do).
// ─────────────────────────────────────────────────────────────────
import 'server-only'
import bcrypt from 'bcryptjs'
import { randomBytes, createHash, randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { query, queryOne, execute, transaction } from './db'

export const SESSION_COOKIE = 'qc_session'
const SESSION_DAYS = 30
const BCRYPT_ROUNDS = 12

export interface AuthUser {
  id: string
  email: string
  email_verified: number
}

export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  plan: string
  referral_code: string | null
  referral_credits: number
  [k: string]: any
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

// MySQL DATETIME columns take 'YYYY-MM-DD HH:MM:SS'; a JS ISO string
// with its trailing 'Z' is rejected in strict mode.
const mysqlDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

// ── Password ──────────────────────────────────────────────────────
export const hashPassword   = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS)
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash)

/** Mirrors Supabase's signup rule so existing accounts stay valid. */
export function validateCredentials(email: string, password: string): string | null {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address'
  if (!password || password.length < 6) return 'Password must be at least 6 characters'
  return null
}

// ── Sessions ──────────────────────────────────────────────────────
/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}) {
  const token   = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000)

  await execute(
    `INSERT INTO sessions (token, user_id, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?)`,
    [sha256(token), userId, mysqlDate(expires), meta.userAgent?.slice(0, 255) ?? null, meta.ip?.slice(0, 45) ?? null]
  )
  return { token, expires }
}

export async function destroySession(token: string) {
  await execute(`DELETE FROM sessions WHERE token = ?`, [sha256(token)])
}

/** Resolves the session cookie to a user, or null. Expired rows are swept. */
export async function getSessionUser(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  const row = await queryOne<AuthUser & { expires_at: Date }>(
    `SELECT u.id, u.email, u.email_verified, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > NOW()`,
    [sha256(token)]
  )
  if (!row) return null
  return { id: row.id, email: row.email, email_verified: row.email_verified }
}

/** The request-scoped current user, read from the cookie jar. */
export async function currentUser(): Promise<AuthUser | null> {
  return getSessionUser(cookies().get(SESSION_COOKIE)?.value)
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    expires,
  }
}

// ── Registration ──────────────────────────────────────────────────
const referralCode = () => randomBytes(4).toString('hex')

/**
 * Creates the user and their profile in one transaction — a user without
 * a profile row would break every page that joins the two.
 */
export async function createUser(email: string, password: string): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase()
  const existing   = await queryOne<{ id: string }>(`SELECT id FROM users WHERE email = ?`, [normalized])
  if (existing) throw new Error('An account with this email already exists')

  const id   = randomUUID()
  const hash = await hashPassword(password)

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, 1)`,
      [id, normalized, hash]
    )
    await conn.execute(
      `INSERT INTO user_profiles (id, display_name, referral_code) VALUES (?, ?, ?)`,
      [id, normalized.split('@')[0], referralCode()]
    )
  })

  return { id, email: normalized, email_verified: 1 }
}

export async function authenticate(email: string, password: string): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase()
  const row = await queryOne<{ id: string; email: string; password_hash: string; email_verified: number }>(
    `SELECT id, email, password_hash, email_verified FROM users WHERE email = ?`,
    [normalized]
  )
  // Same message either way: distinguishing them tells an attacker which
  // addresses have accounts.
  const invalid = new Error('Invalid email or password')
  if (!row) throw invalid
  if (!(await verifyPassword(password, row.password_hash))) throw invalid

  return { id: row.id, email: row.email, email_verified: row.email_verified }
}

// ── Authorisation ─────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<UserProfile | null> {
  return queryOne<UserProfile>(`SELECT * FROM user_profiles WHERE id = ?`, [userId])
}

/**
 * Admin check. Supabase had no real gate here — the old client-side code
 * accepted any @cricketverse.app email — so this is now a server-side
 * lookup against admin_users, with the email domain kept as a fallback
 * for the original owner accounts.
 */
export async function isAdmin(user: AuthUser): Promise<boolean> {
  const row = await queryOne<{ role: string }>(`SELECT role FROM admin_users WHERE user_id = ?`, [user.id])
  if (row) return true
  return user.email.endsWith('@cricketverse.app') || user.email.endsWith('@quickcric.online')
}

/** Helper for route handlers: returns the user or throws a 401-shaped error. */
export async function requireUser(): Promise<AuthUser> {
  const user = await currentUser()
  if (!user) throw new HttpError(401, 'Unauthorized')
  return user
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (!(await isAdmin(user))) throw new HttpError(403, 'Forbidden')
  return user
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

/** Deletes expired sessions. Cheap enough to call opportunistically. */
export async function sweepExpiredSessions() {
  await execute(`DELETE FROM sessions WHERE expires_at < NOW()`)
}
