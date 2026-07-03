'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ── ANIMATED COUNTER ───────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = target / 60
      const timer = setInterval(() => {
        start = Math.min(start + step, target)
        setVal(Math.round(start))
        if (start >= target) clearInterval(timer)
      }, 16)
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

const FEATURES = [
  { icon: '🏏', title: 'Real players, real stats',
    desc: '200+ international cricketers simulated from actual career averages, strike rates, bowling figures — Bumrah genuinely bowls like Bumrah.' },
  { icon: '🏟️', title: 'Live 3D stadium',
    desc: 'Watch every ball in a fully animated Babylon.js stadium — floodlights, crowd, ball physics, batter swings, wicket explosions.' },
  { icon: '🤖', title: 'AI ball-by-ball commentary',
    desc: 'Claude generates unique commentary for every delivery. Not canned phrases — real sentences, rising with the tension of the match.' },
  { icon: '🎙️', title: 'Voice commentary',
    desc: 'Live narration via browser TTS or ElevenLabs realistic voice. "THAT IS GONE!" sounds like it should.' },
  { icon: '⚔️', title: 'Challenge a friend',
    desc: 'Create a room, share a 6-character code, watch the same AI match together with live chat and emoji reactions.' },
  { icon: '🧙', title: 'Fantasy XI',
    desc: 'Draft your fantasy team, assign captain and vice-captain, watch points stack up live as balls are bowled.' },
  { icon: '🏆', title: 'Tournaments',
    desc: 'Build your own World Cup — round robin, knockout, group stage. Simulate all fixtures or watch each match live.' },
  { icon: '🧑‍💼', title: 'AI cricket coach',
    desc: 'Ask Claude about team selection, tactics, conditions, player matchups. Get specific, data-driven tactical advice instantly.' },
]

const TESTIMONIALS = [
  { name: 'Arjun M.', location: 'Mumbai', plan: 'Pro',
    quote: "I don't need to wait for India to play anymore. I set up India vs Australia at Wankhede every morning while I have chai. Bumrah's yorker is exactly as devastating as real life." },
  { name: 'Sana K.', location: 'Lahore', plan: 'Elite',
    quote: "The fantasy mode is insane — I picked Babar as captain and he scored 94 in the sim. I felt every run. The voice commentary made it feel like I was watching TV." },
  { name: 'James T.', location: 'London', plan: 'Pro',
    quote: "I used the AI coach before fantasy league drafts to understand player matchups on different pitches. It genuinely helped me win my league." },
  { name: 'Priya N.', location: 'Bengaluru', plan: 'Free',
    quote: "The 3D stadium is unreal for a browser app. My son and I play every evening — he picks West Indies every time because of Nicholas Pooran." },
]

const FAQS = [
  { q: 'Are these real players?', a: 'Yes — 200+ real international cricketers, each simulated using their actual career batting average, strike rate, bowling average, economy, and playing style. Stats stay current via CricAPI.' },
  { q: 'How realistic is the simulation?', a: 'Every ball accounts for batter form, stamina, pitch conditions, weather, over phase (powerplay/death), bowler matchup, and a real-time pressure index. Outcomes are probability-weighted from real stats — not random.' },
  { q: 'Can I watch on mobile?', a: 'Yes — the app is a PWA installable on iOS and Android. A native app is on the roadmap. The 3D view scales to any screen.' },
  { q: 'What does Pro unlock?', a: 'Unlimited matches, all 15 stadiums, all formats (T5 to ODI), AI post-match analysis, match history, replay sharing, player form tracking, and priority simulation speed.' },
  { q: 'Can I play against a friend?', a: 'Yes — multiplayer rooms let two users each pick their 11, then watch the same match streamed live in sync with chat and emoji reactions. Available on Elite plan.' },
  { q: 'Is there a free tier?', a: '5 matches per month free, forever. No credit card required. T20 and T10 formats included.' },
]

export default function LandingPage() {
  const router  = useRouter()
  const [faq, setFaq]   = useState<number | null>(null)
  const [nav, setNav]   = useState(false) // scrolled

  useEffect(() => {
    const handler = () => setNav(window.scrollY > 60)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--dark)]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${nav ? 'bg-[rgba(10,15,13,0.96)] backdrop-blur-md border-b border-[var(--border)]' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold tracking-widest text-[var(--gold)] text-xl" style={{ fontFamily: 'monospace' }}>
            CRICKET<span className="text-[var(--cream)]">VERSE</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[var(--muted)]">
            <a href="#features" className="hover:text-[var(--cream)] transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-[var(--cream)] transition-colors">Pricing</a>
            <a href="#faq"      className="hover:text-[var(--cream)] transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/auth/login')}
              className="text-sm text-[var(--muted)] hover:text-[var(--cream)] transition-colors">
              Sign in
            </button>
            <button onClick={() => router.push('/setup')}
              className="text-sm px-4 py-2 bg-[var(--gold)] text-[var(--dark)] rounded-lg font-medium hover:bg-[var(--gold-light)] transition-all">
              Play free →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center px-6 pt-20 pb-16 max-w-6xl mx-auto">
        <div className="flex-1">
          <div className="text-[10px] tracking-widest text-[var(--gold)] mb-5 flex items-center gap-3">
            <span className="w-10 h-px bg-[var(--gold)]" />
            REAL PLAYERS · AI ENGINE · LIVE 3D
            <span className="w-10 h-px bg-[var(--gold)]" />
          </div>
          <h1 className="text-6xl md:text-7xl font-bold leading-[0.92] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Why wait for<br />
            <span className="text-[var(--gold)]">real matches?</span>
          </h1>
          <p className="text-lg text-[rgba(245,240,232,0.7)] max-w-xl mb-4 leading-relaxed">
            Build any cricket match with real international players. Watch it live in 3D — simulated ball-by-ball from actual career statistics. No schedule. No broadcast rights. Any time.
          </p>
          <p className="text-sm text-[rgba(245,240,232,0.45)] max-w-md mb-10 leading-relaxed">
            Bumrah's yorker. Kohli's cover drive. Rashid's googly. All statistically accurate. All waiting for you right now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => router.push('/setup')}
              className="px-8 py-4 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-base hover:bg-[var(--gold-light)] transition-all"
              style={{ fontFamily: 'monospace' }}>
              BUILD YOUR MATCH FREE →
            </button>
            <button onClick={() => router.push('/auth/login')}
              className="px-6 py-4 border border-[var(--border)] text-[var(--muted)] rounded-xl text-sm hover:border-[var(--border-hi)] hover:text-[var(--cream)] transition-all">
              Sign up — 5 free matches/month
            </button>
          </div>
        </div>

        {/* Hero visual */}
        <div className="hidden lg:block flex-shrink-0 w-80">
          <div className="relative">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-green-500" /></div>
                <div className="flex-1 text-center text-[10px] text-[var(--muted)] font-mono">India vs Pakistan • LIVE</div>
              </div>
              <div className="bg-[var(--dark2)] rounded-xl p-4 mb-3">
                <div className="flex justify-between mb-2">
                  <div className="text-xs text-[var(--muted)]">🇮🇳 India</div>
                  <div className="font-mono text-xl font-medium text-[var(--cream)]">187/4</div>
                </div>
                <div className="text-xs text-[var(--muted)] mb-3">18.2 / 20 ov</div>
                <div className="h-1.5 bg-[var(--border)] rounded overflow-hidden">
                  <div className="h-full bg-[var(--gold)] rounded" style={{ width: '91%' }} />
                </div>
              </div>
              <div className="text-xs text-green-400 font-medium mb-2">⚡ SIX! Kohli launches Shaheen into orbit!</div>
              <div className="flex items-center gap-2 bg-[var(--dark2)] rounded-lg p-2.5">
                <div className="text-base">🇮🇳</div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-[var(--cream)]">Virat Kohli</div>
                  <div className="text-[10px] text-[var(--muted)] font-mono">82(54) · SR 151.8</div>
                </div>
                <div className="text-[10px] text-[var(--gold)] font-bold">ON STRIKE</div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-3 -right-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl px-3 py-2 shadow-lg">
              <div className="text-[9px] font-bold tracking-widest">AI POWERED</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      <section className="border-y border-[var(--border)] bg-[var(--card)] py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { target: 200,   suffix: '+', lbl: 'Real players' },
            { target: 15,    suffix: '',  lbl: 'Stadiums' },
            { target: 50000, suffix: '+', lbl: 'Balls simulated' },
            { target: 98,    suffix: '%', lbl: 'Stat accuracy' },
          ].map(({ target, suffix, lbl }) => (
            <div key={lbl}>
              <div className="font-mono text-3xl font-medium text-[var(--gold)]">
                <Counter target={target} suffix={suffix} />
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[10px] tracking-widest text-[var(--gold)] mb-3">WHAT YOU GET</div>
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>
            Everything cricket.<br /><span className="text-[var(--gold)]">No waiting required.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-hi)] transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="text-sm font-medium text-[var(--cream)] mb-2">{f.title}</div>
              <div className="text-xs text-[var(--muted)] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 bg-[var(--dark2)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] tracking-widest text-[var(--gold)] mb-3">PRICING</div>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Simple, fair pricing</h2>
            <p className="text-[var(--muted)] text-sm mt-2">Start free. Upgrade when you want more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name:'Free',  price:'₹0',   period:'forever', badge:'',
                features:['5 matches/month','T20 & T10 formats','3 stadiums','Basic 3D viewer','Ball-by-ball commentary'],
                cta:'Start free', primary:false },
              { name:'Pro',   price:'₹299', period:'/month',  badge:'MOST POPULAR',
                features:['Unlimited matches','All formats (T5–ODI)','All 15 stadiums','Full 3D Babylon.js stadium','AI post-match analysis','Match history & replays','Voice commentary','Player form tracking'],
                cta:'Start Pro', primary:true },
              { name:'Elite', price:'₹799', period:'/month',  badge:'',
                features:['Everything in Pro','Multiplayer rooms','Fantasy XI with live points','AI cricket coach','Tournament mode','Custom league creation','Early access features'],
                cta:'Start Elite', primary:false },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl p-6 relative border ${p.primary ? 'border-[var(--gold)] bg-[rgba(201,168,76,0.05)]' : 'border-[var(--border)] bg-[var(--card)]'}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-[var(--dark)] text-[9px] font-bold px-3 py-0.5 rounded-full tracking-widest">
                    {p.badge}
                  </div>
                )}
                <div className="text-[10px] tracking-widest text-[var(--muted)] uppercase mb-1">{p.name}</div>
                <div className="font-mono text-3xl font-medium text-[var(--cream)] mb-0.5">{p.price}<span className="text-sm font-normal text-[var(--muted)]">{p.period}</span></div>
                <ul className="space-y-2 my-5">
                  {p.features.map(f => (
                    <li key={f} className="text-xs text-[rgba(245,240,232,0.72)] flex items-start gap-2">
                      <span className="text-[var(--gold)] mt-0.5">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push(p.name === 'Free' ? '/setup' : '/billing')}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${p.primary ? 'bg-[var(--gold)] text-[var(--dark)] hover:bg-[var(--gold-light)]' : 'border border-[var(--border)] text-[var(--cream)] hover:border-[var(--border-hi)]'}`}>
                  {p.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-widest text-[var(--gold)] mb-3">WHAT PLAYERS SAY</div>
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Fans love it</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[var(--gold)] text-2xl mb-3">"</div>
              <p className="text-sm text-[rgba(245,240,232,0.78)] leading-relaxed mb-4">{t.quote}</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--cream)]">{t.name}</div>
                  <div className="text-[10px] text-[var(--muted)]">{t.location}</div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full ${t.plan === 'Elite' ? 'bg-purple-900 text-purple-300' : t.plan === 'Pro' ? 'bg-[rgba(201,168,76,0.2)] text-[var(--gold)]' : 'bg-[var(--dark2)] text-[var(--muted)]'}`}>
                  {t.plan}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-6 bg-[var(--dark2)]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] tracking-widest text-[var(--gold)] mb-3">FAQ</div>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Common questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <button onClick={() => setFaq(faq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[var(--cream)] text-left">
                  {f.q}
                  <span className={`text-[var(--gold)] transition-transform ${faq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                {faq === i && (
                  <div className="px-5 pb-4 text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)]" style={{ paddingTop: '12px' }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center max-w-2xl mx-auto">
        <div className="text-[10px] tracking-widest text-[var(--gold)] mb-4">START NOW</div>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Your match is<br /><span className="text-[var(--gold)]">waiting.</span>
        </h2>
        <p className="text-[var(--muted)] text-sm mb-8 leading-relaxed">
          India vs Pakistan at Wankhede. Kohli vs Bumrah in the nets. West Indies 1983 vs England 2019.<br />
          Any match. Any players. Right now.
        </p>
        <button onClick={() => router.push('/setup')}
          className="px-10 py-5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-lg hover:bg-[var(--gold-light)] transition-all"
          style={{ fontFamily: 'monospace' }}>
          BUILD YOUR MATCH FREE →
        </button>
        <div className="text-[10px] text-[var(--muted)] mt-4">No credit card · 5 free matches per month · Forever</div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-bold tracking-widest text-[var(--gold)]" style={{ fontFamily: 'monospace' }}>
            CRICKET<span className="text-[var(--cream)]">VERSE</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[var(--muted)]">
            <a href="/privacy"  className="hover:text-[var(--cream)]">Privacy</a>
            <a href="/terms"    className="hover:text-[var(--cream)]">Terms</a>
            <a href="/contact"  className="hover:text-[var(--cream)]">Contact</a>
            <a href="/admin"    className="hover:text-[var(--cream)]">Admin</a>
          </div>
          <div className="text-xs text-[var(--muted)]">© 2025 CricketVerse · AI match engine</div>
        </div>
      </footer>
    </div>
  )
}
