'use client'
import { useRouter } from 'next/navigation'

const PRIVACY_SECTIONS = [
  {
    title: 'What we collect',
    body: `QuickCric collects only what we need to run the service: your email address (for login), match history (to show your stats), and usage events (to improve the product). We do not collect sensitive personal data, sell your data, or share it with advertisers.`
  },
  {
    title: 'How we use it',
    body: `Your data is used to: power your account, save your match history, compute leaderboard rankings, and improve the simulation engine. Anonymous usage events help us understand which features are popular. You can delete your account and all associated data at any time from Settings.`
  },
  {
    title: 'Third-party services',
    body: `We use Supabase for database and authentication (hosted in the EU), Stripe for payment processing (PCI-compliant), Anthropic Claude API for AI commentary (your match data is sent as context but not stored by Anthropic for training), and CricAPI for real player statistics.`
  },
  {
    title: 'Cookies',
    body: `We use only essential cookies required for authentication (Supabase session tokens). We do not use advertising or tracking cookies. You can clear cookies at any time from your browser settings.`
  },
  {
    title: 'Data retention',
    body: `Match data is retained for as long as your account is active. Analytics events are automatically deleted after 90 days. If you delete your account, all personal data is removed within 30 days.`
  },
  {
    title: 'Your rights (GDPR)',
    body: `If you are in the EU/EEA, you have the right to access, correct, export, or delete your personal data. Contact privacy@cricketverse.app to exercise these rights. We will respond within 30 days.`
  },
  {
    title: 'Contact',
    body: `For privacy questions: privacy@cricketverse.app\nRegistered address: QuickCric, [Your Address]\nLast updated: January 2025`
  },
]

const TERMS_SECTIONS = [
  {
    title: 'Service description',
    body: `QuickCric is an AI-powered cricket match simulator. It uses real player statistics to generate simulated match outcomes for entertainment purposes. Results are probabilistic and do not represent actual match outcomes.`
  },
  {
    title: 'Acceptable use',
    body: `You may use QuickCric for personal entertainment. You may not use the service to generate content for commercial use without written permission, reverse-engineer the simulation engine, or attempt to abuse the platform.`
  },
  {
    title: 'Player data',
    body: `Player statistics are sourced from publicly available career records via CricAPI. Player names and statistics are used for simulation purposes. QuickCric is not affiliated with any cricket board, player, or agency.`
  },
  {
    title: 'Subscriptions & billing',
    body: `Paid plans (Pro, Elite) are billed monthly via Stripe. You can cancel at any time — your plan remains active until the end of the billing period. Refunds are available within 7 days of first purchase if you have not used the service.`
  },
  {
    title: 'Limitation of liability',
    body: `QuickCric is provided "as is". We are not liable for service interruptions, simulation inaccuracies, or any indirect damages. Total liability is limited to the amount paid in the last 12 months.`
  },
  {
    title: 'Changes to terms',
    body: `We may update these terms from time to time. We will notify you by email at least 14 days before significant changes take effect. Continued use of the service constitutes acceptance of updated terms.`
  },
]

export default function LegalPage({ params }: { params: { type: string } }) {
  const router  = useRouter()
  const isPrivacy = params.type === 'privacy'
  const sections  = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS
  const title     = isPrivacy ? 'Privacy Policy' : 'Terms of Service'

  return (
    <div className="min-h-screen bg-[var(--dark)] px-5 py-10 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-xs text-[var(--muted)] mb-6 hover:text-[var(--cream)]">
        ← Back
      </button>

      <div className="text-[10px] tracking-widest text-[var(--gold)] mb-2">QUICKCRIC</div>
      <h1 className="text-3xl font-bold text-[var(--cream)] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        {title}
      </h1>
      <p className="text-xs text-[var(--muted)] mb-10">Last updated: January 2025</p>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={i}>
            <h2 className="text-base font-medium text-[var(--cream)] mb-3">
              {i + 1}. {s.title}
            </h2>
            <p className="text-sm text-[rgba(245,240,232,0.7)] leading-relaxed whitespace-pre-line">
              {s.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-[var(--border)] flex gap-4">
        <button onClick={() => router.push(isPrivacy ? '/terms' : '/privacy')} className="text-xs text-[var(--gold)] hover:underline">
          {isPrivacy ? 'Terms of Service →' : 'Privacy Policy →'}
        </button>
        <button onClick={() => router.push('/')} className="text-xs text-[var(--muted)] hover:text-[var(--cream)]">
          Back to QuickCric
        </button>
      </div>
    </div>
  )
}
