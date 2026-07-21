// src/app/api/admin/sync-players/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser, isAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdmin(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Trigger sync on sim engine
  try {
    const simUrl = process.env.NEXT_PUBLIC_SIM_URL ?? 'http://localhost:8000'
    const res    = await fetch(`${simUrl}/admin/sync-players`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json',
                 'X-Admin-Key': process.env.ADMIN_SECRET_KEY ?? '' },
    })

    if (!res.ok) throw new Error(`Sim engine returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ success: true, log: data.log ?? 'Sync triggered' })
  } catch (e: any) {
    // Fallback: return instructions
    return NextResponse.json({
      success: false,
      log: `Run manually:\n  cd sim-engine\n  CRICAPI_KEY=your_key python cricapi_sync.py\n\nError: ${e.message}`,
    })
  }
}
