'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    '₹0',
    period:   '/month',
    features: [
      '5 AI matches per month',
      '3 stadiums',
      'T20 & T10 formats',
      'Basic 3D ground',
      'Ball-by-ball commentary',
    ],
    cta:      'Current plan',
    disabled: true,
    highlight: false,
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    '₹299',
    usd:      '$3.49',
    period:   '/month',
    features: [
      'Unlimited AI matches',
      'All 15 stadiums',
      'All formats (T5–ODI)',
      'Full 3D Babylon.js stadium',
      'AI post-match analysis',
      'Match history & replays',
      'Player form tracking',
      'Priority simulation speed',
    ],
    cta:      'Start Pro →',
    disabled: false,
    highlight: true,
    priceId:  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    id:       'elite',
    name:     'Elite',
    price:    '₹799',
    usd:      '$9.49',
    period:   '/month',
    features: [
      'Everything in Pro',
      'Multiplayer matches',
      'Fantasy cricket mode',
      'Custom tournaments',
      'AI coaching analysis',
      'Export match replays',
      'Early access to new features',
    ],
    cta:      'Start Elite →',
    disabled: false,
    highlight: false,
    priceId:  process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
  },
]

export default function BillingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const subscribe = async (priceId: string, planId: string) => {
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error(e)
      alert('Billing setup required — add Stripe keys to .env.local')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-10 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-xs text-[var(--muted)] mb-6 hover:text-[var(--cream)] transition-colors">
        ← Back
      </button>

      <div className="text-center mb-10">
        <div className="text-[10px] tracking-widest text-[var(--gold)] mb-2">PLANS & PRICING</div>
        <h1 className="text-4xl font-bold mb-2" style={{fontFamily:'Georgia,serif'}}>
          Upgrade your <span className="text-[var(--gold)]">game</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">Unlimited AI cricket. Real players. Real stats. Any time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`rounded-2xl p-5 border relative ${
              plan.highlight
                ? 'border-[var(--gold)] bg-[rgba(201,168,76,0.07)]'
                : 'border-[var(--border)] bg-[var(--card)]'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-[var(--dark)] text-[9px] font-bold px-3 py-0.5 rounded-full tracking-widest">
                MOST POPULAR
              </div>
            )}

            <div className="mb-4">
              <div className="text-[10px] tracking-widest text-[var(--muted)] uppercase mb-1">{plan.name}</div>
              <div className="font-mono text-3xl font-medium text-[var(--cream)]">
                {plan.price}
                <span className="text-sm font-normal text-[var(--muted)]">{plan.period}</span>
              </div>
              {'usd' in plan && (
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{plan.usd}/month USD</div>
              )}
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="text-xs text-[rgba(245,240,232,0.75)] flex items-start gap-2">
                  <span className="text-[var(--gold)] mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => !plan.disabled && plan.priceId && subscribe(plan.priceId, plan.id)}
              disabled={plan.disabled || loading === plan.id}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                plan.disabled
                  ? 'border border-[var(--border)] text-[var(--muted)] cursor-default'
                  : plan.highlight
                  ? 'bg-[var(--gold)] text-[var(--dark)] hover:bg-[var(--gold-light)]'
                  : 'border border-[var(--border)] text-[var(--cream)] hover:border-[var(--border-hi)]'
              }`}
            >
              {loading === plan.id ? 'Redirecting...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-xs text-[var(--muted)]">
        Payments processed securely by Stripe · Cancel anytime · No hidden fees
      </div>
    </div>
  )
}
