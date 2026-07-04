import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How QuickCric handles your data, cookies and advertising.',
}

const UPDATED = '4 July 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--dark)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-[var(--gold)] hover:underline">← QuickCric</Link>
        <h1 className="text-3xl font-black text-[var(--cream)] mt-4 mb-1">Privacy Policy</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: {UPDATED}</p>

        <div className="space-y-6 text-sm leading-relaxed text-[var(--cream)]">
          <section>
            <h2 className="font-bold mb-1">What QuickCric is</h2>
            <p>
              QuickCric (quickcric.online) is a cricket match simulator. Matches are generated from
              publicly available career statistics and simulated entirely by software — no real match
              footage or betting of any kind is involved.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Data we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Account data</span> — if you sign up, we store your email address and a display name with our authentication provider (Supabase).</li>
              <li><span className="font-medium">Match history</span> — scorecards of matches you simulate, linked to your account if signed in, otherwise kept only in your browser&apos;s local storage.</li>
              <li><span className="font-medium">Technical data</span> — standard server logs (IP address, browser type) used for security and to keep the service running.</li>
            </ul>
            <p className="mt-2">We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Cookies &amp; local storage</h2>
            <p>
              We use cookies to keep you signed in, and local/session storage to remember match
              setups and history on your device. You can clear these at any time in your browser
              settings; the site keeps working (you&apos;ll just be signed out).
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Advertising</h2>
            <p>
              We show ads served by <span className="font-medium">Google AdSense</span>. Google and
              its partners may use cookies (including the DoubleClick cookie) to show ads based on
              your interests and prior visits to this and other websites. You can opt out of
              personalised advertising at{' '}
              <a className="text-[var(--gold)] underline" href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>{' '}
              or learn more at{' '}
              <a className="text-[var(--gold)] underline" href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">How Google uses ads</a>.
              Where required by law (e.g. in the EEA/UK), you will be asked for consent before
              advertising cookies are used.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Third-party services</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-medium">Supabase</span> — authentication and database hosting.</li>
              <li><span className="font-medium">Google AdSense</span> — advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold mb-1">Your choices</h2>
            <p>
              You can use QuickCric without an account (nothing is stored server-side about you),
              request deletion of your account and match history, or ask us anything about your
              data by emailing{' '}
              <a className="text-[var(--gold)] underline" href="mailto:indiaoffers.in@gmail.com">indiaoffers.in@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Children</h2>
            <p>QuickCric is a general-audience game and is not directed at children under 13.</p>
          </section>

          <section>
            <h2 className="font-bold mb-1">Changes</h2>
            <p>
              If this policy changes, the date at the top of this page will be updated.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
