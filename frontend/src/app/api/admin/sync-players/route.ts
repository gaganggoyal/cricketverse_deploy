// src/app/api/admin/sync-players/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/middleware'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Verify admin
  const supabase = createClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminCheck } = await supabase
    .from('admin_users').select('role').eq('user_id', user.id).single()

  if (!adminCheck && !user.email?.endsWith('@cricketverse.app')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
