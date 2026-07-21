// ─────────────────────────────────────────────────────────────────
// MySQL connection pool — server-side only.
//
// Replaces Supabase. Nothing here may be imported from a client
// component: the browser now talks to /api/* routes, which are the only
// thing that touches the database. That inversion is the whole point —
// with Supabase, security lived in RLS policies and the browser held a
// key; here the browser holds nothing and every query is authorised in
// the route handler.
//
// In production the app runs in Docker and reaches MySQL over the host's
// unix socket (bind-mounted into the container), so the database stays
// bound to 127.0.0.1 with no port published. Set DB_SOCKET for that;
// fall back to host/port for local development.
// ─────────────────────────────────────────────────────────────────
import 'server-only'
import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise'

declare global {
  // Next.js dev server hot-reloads modules; without this the pool would
  // be recreated on every edit until MySQL refuses new connections.
  // eslint-disable-next-line no-var
  var __quickcricPool: Pool | undefined
}

function createPool(): Pool {
  const socketPath = process.env.DB_SOCKET
  const base = {
    user:     process.env.DB_USER     ?? 'quickcric',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME     ?? 'quickcric',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
    queueLimit: 0,
    charset: 'utf8mb4',
    // Return DECIMAL/BIGINT as JS numbers rather than strings, so the
    // shapes match what the Supabase client used to hand back.
    decimalNumbers: true,
    timezone: 'Z',
  }

  return mysql.createPool(
    socketPath
      ? { ...base, socketPath }
      : { ...base, host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306) }
  )
}

export const pool: Pool = global.__quickcricPool ?? createPool()
if (process.env.NODE_ENV !== 'production') global.__quickcricPool = pool

/** SELECT returning many rows. */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  return rows as T[]
}

/** SELECT returning the first row, or null. */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/** INSERT/UPDATE/DELETE. */
export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [res] = await pool.execute<ResultSetHeader>(sql, params)
  return res
}

/** Run several statements atomically on one connection. */
export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const out = await fn(conn)
    await conn.commit()
    return out
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// ── JSON helpers ──────────────────────────────────────────────────
// mysql2 parses JSON columns automatically on read, but a JS array bound
// as a parameter is expanded into a comma list by the driver, so writes
// have to be stringified explicitly.
export const toJson = (v: unknown) => JSON.stringify(v ?? null)

export function fromJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback
  if (typeof v === 'string') { try { return JSON.parse(v) as T } catch { return fallback } }
  return v as T
}
