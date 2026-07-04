'use client'
import { useEffect, useRef } from 'react'

// Google AdSense display unit. Renders nothing until BOTH env vars are set
// (baked at build time), so the site is completely ad-free until the
// AdSense account is approved and configured:
//   NEXT_PUBLIC_ADSENSE_CLIENT  ca-pub-XXXXXXXXXXXXXXXX
//   NEXT_PUBLIC_ADSENSE_SLOT    the display ad unit id (one responsive
//                               unit reused across placements is fine)
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const SLOT   = process.env.NEXT_PUBLIC_ADSENSE_SLOT

export function AdSlot({ className = '' }: { className?: string }) {
  const pushed = useRef(false)

  useEffect(() => {
    if (!CLIENT || !SLOT || pushed.current) return
    pushed.current = true
    try {
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch { /* blocked by an ad blocker — fine, the slot stays empty */ }
  }, [])

  if (!CLIENT || !SLOT) return null
  return (
    <div className={className}>
      <div className="text-[8px] uppercase tracking-widest text-[var(--muted)] mb-1 text-center">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
