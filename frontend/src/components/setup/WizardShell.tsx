'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export const WIZARD_STEPS = [
  { label: 'Format',    href: '/setup' },
  { label: 'Stadium',   href: '/setup' },
  { label: 'Conditions',href: '/setup' },
  { label: 'Teams',     href: '/setup/teams' },
  { label: 'Captain',   href: '/setup/captain' },
  { label: 'Batting',   href: '/setup/batting-order' },
  { label: 'Bowling',   href: '/setup/bowling-overs' },
  { label: 'Bowl order',href: '/setup/bowling-order' },
  { label: 'Review',    href: '/setup/review' },
  { label: 'Toss',      href: '/setup/toss' },
]

export function WizardHeader({ title, subtitle, stepIndex }: { title: string; subtitle: string; stepIndex: number }) {
  const router = useRouter()
  const activeStepRef = useRef<HTMLDivElement>(null)

  // On phones the 10-step strip is wider than the screen — keep the current
  // step in view as the user advances.
  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [stepIndex])

  return (
    <>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border)] bg-[rgba(234,243,251,0.95)] sticky top-0 z-10 backdrop-blur-md">
        <div
          className="font-bold tracking-widest text-[var(--gold)] text-xl cursor-pointer"
          style={{ fontFamily: 'monospace' }}
          onClick={() => router.push('/')}
        >
          QUICK<span className="text-[var(--cream)]">CRIC</span>
        </div>
        {/* Right side is reserved for the WizardFooter nav buttons (fixed
            top-right on desktop; on mobile they live in a bottom bar). */}
        <div className="hidden sm:block w-[280px]" />
      </div>

      <div className="flex items-center gap-0 px-4 sm:px-6 pt-6 mb-2 overflow-x-auto">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.label} ref={i === stepIndex ? activeStepRef : undefined} className="flex items-center shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all
                ${i < stepIndex  ? 'bg-[var(--pitch-light)] text-white' :
                  i === stepIndex ? 'border border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.1)]' :
                               'border border-[var(--border)] text-[var(--muted)] bg-[var(--dark2)]'}
              `}
            >{i < stepIndex ? '✓' : i + 1}</div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`w-6 h-px ${i < stepIndex ? 'bg-[var(--pitch-light)]' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-6 pb-2">
        <div className="text-base font-medium">{title}</div>
        <div className="text-xs text-[var(--muted)] mb-4">{subtitle}</div>
      </div>
    </>
  )
}

// Despite the name (kept so call sites don't churn), this now renders the
// wizard nav at the TOP-RIGHT of the screen, in line with the header bar —
// users asked for the "next" action up top, labelled with the actual next
// step ("Choose captains") instead of a generic "Next".
export function WizardFooter({
  backHref, onBack, nextHref, onNext, nextDisabled, nextLabel = 'Next step →',
}: {
  backHref?: string
  onBack?: () => void
  nextHref?: string
  onNext?: () => boolean | void
  nextDisabled?: boolean
  nextLabel?: string
}) {
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const goNext = () => {
    if (navigating) return
    const result = onNext ? onNext() : true
    if (result === false) return
    if (nextHref) {
      setNavigating(true)
      router.push(nextHref)
    }
  }
  // Mobile: full-width bar fixed to the bottom of the screen (thumb reach).
  // Desktop (sm+): the same buttons sit top-right, in line with the header.
  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-[rgba(234,243,251,0.97)] border-t border-[var(--border)] backdrop-blur-md
                    sm:bottom-auto sm:left-auto sm:top-0 sm:right-4 sm:h-[61px] sm:px-0 sm:py-0 sm:pb-0 sm:bg-transparent sm:border-t-0 sm:backdrop-blur-none">
      {(backHref || onBack) && (
        <button
          onClick={() => (onBack ? onBack() : router.push(backHref!))}
          disabled={navigating}
          className="px-4 py-3 sm:py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] rounded-lg hover:text-[var(--cream)] hover:border-[var(--border-hi)] transition-all text-xs disabled:opacity-50"
        >
          ← Back
        </button>
      )}
      <button
        onClick={goNext}
        disabled={nextDisabled || navigating}
        className="flex-1 sm:flex-none px-5 py-3 sm:py-2 bg-[var(--gold)] text-white rounded-lg font-semibold text-xs disabled:opacity-40 hover:bg-[var(--gold-light)] transition-all sm:min-w-[150px]"
      >
        {navigating
          ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle" />
          : nextLabel}
      </button>
    </div>
  )
}
