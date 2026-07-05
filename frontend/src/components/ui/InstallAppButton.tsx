'use client'
import { useEffect, useState } from 'react'

// "Install app" button for the landing page.
//
// Chrome/Edge on Android + desktop fire `beforeinstallprompt` when the PWA
// is installable — we stash that event and replay it on click, which opens
// the native install dialog. iOS Safari never fires it (Apple only allows
// manual Share → Add to Home Screen), so there we show the instruction
// instead. Renders nothing when already installed or not installable —
// the button never dead-ends.
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<any>(null)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    if (standalone) { setInstalled(true); return }

    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || (!deferred && !isIos)) return null

  const install = async () => {
    if (deferred) {
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setDeferred(null)
    } else {
      setShowIosHelp(s => !s)
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center">
      <button
        onClick={install}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-hi)] bg-[var(--card)] text-sm font-semibold text-[var(--cream)] hover:border-[var(--gold)] hover:shadow-[0_4px_16px_rgba(0,40,80,0.12)] transition-all"
      >
        📲 Install the app <span className="text-[10px] font-normal text-[var(--muted)]">free · no store needed</span>
      </button>
      {showIosHelp && (
        <div className="mt-2 text-xs text-[var(--muted)] max-w-xs text-center leading-relaxed">
          On iPhone: tap the <span className="font-semibold text-[var(--cream)]">Share</span> button in Safari,
          then <span className="font-semibold text-[var(--cream)]">&ldquo;Add to Home Screen&rdquo;</span>.
        </div>
      )}
    </div>
  )
}
