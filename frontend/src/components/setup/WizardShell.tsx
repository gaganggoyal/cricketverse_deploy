'use client'
import { useState } from 'react'
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
  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[rgba(234,243,251,0.95)] sticky top-0 z-10 backdrop-blur-md">
        <div
          className="font-bold tracking-widest text-[var(--gold)] text-xl cursor-pointer"
          style={{ fontFamily: 'monospace' }}
          onClick={() => router.push('/')}
        >
          QUICK<span className="text-[var(--cream)]">CRIC</span>
        </div>
        {/* Right side is reserved for the WizardFooter nav buttons (fixed top-right). */}
        <div className="w-[280px]" />
      </div>

      <div className="flex items-center gap-0 px-6 pt-6 mb-2 overflow-x-auto">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center shrink-0">
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

      <div className="px-6 pb-2">
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
  return (
    <div className="fixed top-0 right-4 z-20 h-[61px] flex items-center gap-2">
      {(backHref || onBack) && (
        <button
          onClick={() => (onBack ? onBack() : router.push(backHref!))}
          disabled={navigating}
          className="px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] rounded-lg hover:text-[var(--cream)] hover:border-[var(--border-hi)] transition-all text-xs disabled:opacity-50"
        >
          ← Back
        </button>
      )}
      <button
        onClick={goNext}
        disabled={nextDisabled || navigating}
        className="px-5 py-2 bg-[var(--gold)] text-white rounded-lg font-semibold text-xs disabled:opacity-40 hover:bg-[var(--gold-light)] transition-all min-w-[150px]"
      >
        {navigating
          ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin align-middle" />
          : nextLabel}
      </button>
    </div>
  )
}
