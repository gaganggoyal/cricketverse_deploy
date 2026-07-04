import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── SERVER CLIENT (for Server Components & Route Handlers) ────────
export function createClient(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                                { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any)   { try { cookieStore.set({ name, value, ...options }) } catch {} },
        remove(name: string, options: any)               { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
      },
    }
  )
}

// ── MIDDLEWARE ────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                            { return request.cookies.get(name)?.value },
        set(name: string, value: string, opt: any)   { request.cookies.set({ name, value, ...opt }); response = NextResponse.next({ request: { headers: request.headers } }); response.cookies.set({ name, value, ...opt }) },
        remove(name: string, opt: any)               { request.cookies.set({ name, value: '', ...opt }); response = NextResponse.next({ request: { headers: request.headers } }); response.cookies.set({ name, value: '', ...opt }) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard & match routes. Segment-aware matching: a bare
  // startsWith('/match') would also capture /matches (the local, public
  // match-history page).
  const protectedPaths = ['/dashboard', '/match', '/leaderboard']
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'))

  if (isProtected && !user) {
    // Carry the destination along so sign-in drops the user back where
    // they were headed (e.g. straight into the match they just built),
    // not on the dashboard.
    const login = new URL('/auth/login', request.url)
    login.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
