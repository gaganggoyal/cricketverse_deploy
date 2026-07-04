'use client'
import { useEffect } from 'react'

// Registers the service worker that makes QuickCric installable ("Add to
// Home Screen" → standalone app). Production only: in dev a SW caches
// on top of hot reload and serves stale chunks.
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
