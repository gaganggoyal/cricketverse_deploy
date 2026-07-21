'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSetupStore } from '@/lib/store'
import { Stadium } from '@/types'
import { getStadiums } from '@/lib/api'
import { WizardHeader, WizardFooter } from '@/components/setup/WizardShell'
import { useState } from 'react'

const FORMATS = [
  { label: 'T5',  overs: 5,  desc: '5 overs · Demo mode',      badge: 'FASTEST' },
  { label: 'T10', overs: 10, desc: '10 overs · Blast format',   badge: '' },
  { label: 'T20', overs: 20, desc: '20 overs · World Cup',      badge: 'POPULAR' },
  { label: 'ODI', overs: 50, desc: '50 overs · Classic format', badge: '' },
]

const PITCHES = [
  { key: 'flat',    icon: '🟫', label: 'Flat',         desc: 'High scores · True bounce · Batter paradise' },
  { key: 'spin',    icon: '🌀', label: 'Spin',         desc: 'Turn & grip · Slow · Spinners dominate' },
  { key: 'seam',   icon: '🟢', label: 'Green seamer',  desc: 'Lateral movement · Helpful for pacers' },
  { key: 'dusty',  icon: '🟡', label: 'Dusty',         desc: 'Crumbles late · Spinners feast' },
  { key: 'damp',   icon: '💧', label: 'Damp',          desc: 'Swing heaven · Early wickets likely' },
  { key: 'bouncy', icon: '⚪', label: 'Hard & bouncy', desc: 'High bounce · Express pace threat' },
]

const TIMES = [
  { key: 'morning',   icon: '🌅', label: 'Morning',     desc: 'Dew factor · Swing likely' },
  { key: 'afternoon', icon: '☀️', label: 'Afternoon',   desc: 'True conditions · Fast outfield' },
  { key: 'evening',   icon: '🌆', label: 'Day-Night',   desc: 'Dew in 2nd innings · Pace aided' },
  { key: 'night',     icon: '🌙', label: 'Floodlit',    desc: 'Heavy dew · Batting favoured' },
  { key: 'overcast',  icon: '☁️', label: 'Overcast',    desc: 'Cloud cover aids swing' },
  { key: 'drizzle',   icon: '🌦️', label: 'Drizzle risk', desc: 'D/L method possible' },
]

const FALLBACK_STADIUMS: Stadium[] = [
  { id:'s1', name:'Narendra Modi Stadium', city:'Ahmedabad', country:'India', capacity:132000, pitch_bias:'flat', avg_first_innings_score:175, dew_factor:true, altitude:53 },
  { id:'s2', name:'Melbourne Cricket Ground', city:'Melbourne', country:'Australia', capacity:100024, pitch_bias:'bouncy', avg_first_innings_score:165, dew_factor:false, altitude:31 },
  { id:'s3', name:"Lord's", city:'London', country:'England', capacity:31100, pitch_bias:'seam', avg_first_innings_score:155, dew_factor:false, altitude:12 },
  { id:'s4', name:'Eden Gardens', city:'Kolkata', country:'India', capacity:68000, pitch_bias:'spin', avg_first_innings_score:170, dew_factor:true, altitude:6 },
  { id:'s5', name:'Wankhede Stadium', city:'Mumbai', country:'India', capacity:33108, pitch_bias:'flat', avg_first_innings_score:180, dew_factor:true, altitude:11 },
  { id:'s6', name:'Newlands', city:'Cape Town', country:'South Africa', capacity:25000, pitch_bias:'seam', avg_first_innings_score:160, dew_factor:false, altitude:24 },
]

export default function SetupPage() {
  const router = useRouter()
  const { step, setup, setStep, setFormat, setStadium, setPitch, setTimeOfPlay } = useSetupStore()
  const [stadiums, setStadiums] = useState<Stadium[]>([])

  useEffect(() => {
    getStadiums().then(setStadiums).catch(() => setStadiums(FALLBACK_STADIUMS))
  }, [])

  const localStep = step > 2 ? 0 : step

  const canNext = () => {
    if (localStep === 0) return !!setup.format
    if (localStep === 1) return !!setup.stadium
    if (localStep === 2) return !!(setup.pitch && setup.time_of_play)
    return true
  }

  const next = () => {
    if (!canNext()) return false
    if (localStep < 2) setStep(localStep + 1)
    else return true // WizardFooter will navigate to /setup/teams
  }
  const prev = () => { if (localStep > 0) setStep(localStep - 1) }

  // Single-choice steps advance on selection — the top-right button stays
  // as a fallback for users returning to change an earlier answer.
  const advanceToTeams = () => setTimeout(() => router.push('/setup/teams'), 300)

  const titles = [
    ['Match Format', 'Choose the type of match you want to watch'],
    ['Choose Stadium', `${stadiums.length} iconic venues worldwide`],
    ['Pitch & conditions', 'Set the stage for the match'],
  ]

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      <WizardHeader stepIndex={localStep} title={titles[localStep][0]} subtitle={titles[localStep][1]} />

      <div className="px-6 max-w-2xl mx-auto pb-32">

        {localStep === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {FORMATS.map(f => (
              <div
                key={f.label}
                onClick={() => { setFormat(f.label, f.overs); setStep(1) }}
                className={`relative border rounded-xl p-5 cursor-pointer transition-all ${
                  setup.format === f.label
                    ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.08)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]'
                }`}
              >
                {f.badge && (
                  <div className="absolute top-2 right-2 text-[9px] px-2 py-0.5 bg-[var(--pitch)] text-green-300 rounded-full tracking-wide">
                    {f.badge}
                  </div>
                )}
                <div className="text-3xl font-bold text-[var(--gold)]" style={{fontFamily:'monospace'}}>{f.label}</div>
                <div className="text-xs text-[var(--muted)] mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        )}

        {localStep === 1 && (
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {(stadiums.length ? stadiums : FALLBACK_STADIUMS).map(s => (
              <div
                key={s.id}
                onClick={() => { setStadium(s); setTimeout(() => setStep(2), 250) }}
                className={`border rounded-xl p-3 cursor-pointer transition-all ${
                  setup.stadium?.id === s.id
                    ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.06)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]'
                }`}
              >
                <div className="text-lg mb-1">🏟️</div>
                <div className="text-sm font-medium text-[var(--cream)] leading-tight">{s.name}</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{s.city}, {s.country}</div>
                <div className="text-[10px] font-mono text-[var(--gold)] mt-1">Cap: {s.capacity?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {localStep === 2 && (
          <div className="space-y-5">
            <div>
              <div className="text-sm font-medium mb-3">Pitch type</div>
              <div className="grid grid-cols-3 gap-2">
                {PITCHES.map(p => (
                  <div
                    key={p.key}
                    onClick={() => { setPitch(p.key); if (setup.time_of_play) advanceToTeams() }}
                    className={`border rounded-xl p-3 cursor-pointer text-center transition-all ${
                      setup.pitch === p.key
                        ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.08)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{p.icon}</div>
                    <div className="text-xs font-medium">{p.label}</div>
                    <div className="text-[9px] text-[var(--muted)] mt-1 leading-tight">{p.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-3">Time of play</div>
              <div className="grid grid-cols-3 gap-2">
                {TIMES.map(t => (
                  <div
                    key={t.key}
                    onClick={() => { setTimeOfPlay(t.key); if (setup.pitch) advanceToTeams() }}
                    className={`border rounded-xl p-3 cursor-pointer text-center transition-all ${
                      setup.time_of_play === t.key
                        ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.08)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]'
                    }`}
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <div className="text-xs font-medium">{t.label}</div>
                    <div className="text-[9px] text-[var(--muted)] mt-1 leading-tight">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <WizardFooter
        onBack={localStep > 0 ? prev : undefined}
        onNext={next}
        nextHref={localStep === 2 ? '/setup/teams' : undefined}
        nextDisabled={!canNext()}
        nextLabel={localStep === 0 ? 'Choose stadium →' : localStep === 1 ? 'Set conditions →' : 'Build teams →'}
      />
    </div>
  )
}
