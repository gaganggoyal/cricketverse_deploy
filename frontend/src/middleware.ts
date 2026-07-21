import { NextResponse, type NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────
// Route protection.
//
// Middleware runs on the Edge runtime, which cannot open a MySQL
// connection, so this can only check that a session cookie is *present* —
// it cannot verify that the session is real. That is deliberate and
// sufficient: this redirect exists for UX (don't render a dashboard shell
// to a signed-out visitor), while the actual enforcement lives in the API
// routes, every one of which calls requireUser() and re-reads the session
// from the database. A forged cookie gets an empty page and a 401, not data.
// ─────────────────────────────────────────────────────────────────

const SESSION_COOKIE = 'qc_session'

export function middleware(request: NextRequest) {
  // Segment-aware matching: a bare startsWith('/match') would also capture
  // /matches (the local, public match-history page).
  const protectedPaths = ['/dashboard', '/match', '/leaderboard']
  const { pathname } = request.nextUrl
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected && !request.cookies.get(SESSION_COOKIE)?.value) {
    // Carry the destination along so sign-in drops the user back where
    // they were headed (e.g. straight into the match they just built),
    // not on the dashboard.
    const login = new URL('/auth/login', request.url)
    login.searchParams.set('redirect', pathname)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  // /api is excluded: those routes authorise themselves and must be able
  // to return 401 JSON rather than a redirect to an HTML login page.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
