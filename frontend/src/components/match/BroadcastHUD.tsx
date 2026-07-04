'use client'
/**
 * Broadcast HUD — one coherent layout instead of scattered panels:
 *   top-right:   delivery info
 *   left column: crease cards (striker / non-striker / bowler)
 *   right column:commentary box (lines + EN/HI + audio toggle)
 *   bottom band: scorebug + this-over pips + stats, with a clearly
 *                labelled WIN PROBABILITY bar beneath, above the controls.
 *
 * Purely a presentation layer over the real match state in useLiveMatch.
 */
import { useLiveMatch, useSetupStore } from '@/lib/store'
import { BallEvent, CommentaryLang, InningsState, Outcome } from '@/types'
import { PERSONAS, SIGNATURE_LINES } from '@/data/commentary'

const GLASS = 'bg-[rgba(255,255,255,0.93)] border border-[rgba(0,0,0,0.08)] shadow-[0_2px_12px_rgba(0,40,80,0.15)]'
const INK = 'text-[#16222c]'
const INK_MUTED = 'text-[rgba(22,34,44,0.55)]'
const BLUE = '#1673c7'

function pipClass(o: Outcome) {
  if (o === '6') return 'bp-6'
  if (o === '4') return 'bp-4'
  if (o === 'W') return 'bp-W'
  if (o === 'WD' || o === 'NB') return 'bg-yellow-500 text-white'
  return 'bp-r'
}

// ── WIN PROBABILITY ──────────────────────────────────────────────
function computeWinProb(current: InningsState, totalOvers: number): number {
  let pBatting = 50
  if (!current.target) {
    const rr = current.balls > 0 ? current.score / (current.balls / 6) : 7.5
    pBatting = 50 + (rr - 7.5) * 3.2 - current.wickets * 3
  } else {
    const need = current.target - current.score
    const remBalls = totalOvers * 6 - current.balls
    if (need <= 0) pBatting = 100
    else if (remBalls <= 0 || current.wickets >= 10) pBatting = 0
    else {
      const reqRate = need / (remBalls / 6)
      const curRate = current.balls > 0 ? current.score / (current.balls / 6) : reqRate
      pBatting = 50 + (curRate - reqRate) * 6 + (10 - current.wickets - 5) * 3
    }
  }
  return Math.max(2, Math.min(98, Math.round(pBatting)))
}

// ── MAIN COMPONENT ───────────────────────────────────────────────
export function BroadcastHUD({
  lang, onLangChange, audioEnabled, onToggleAudio,
}: {
  lang: CommentaryLang
  onLangChange: (l: CommentaryLang) => void
  audioEnabled: boolean
  onToggleAudio: () => void
}) {
  const { innings1, innings2, viewInnings, status } = useLiveMatch()
  const { setup } = useSetupStore()
  const current = viewInnings === 1 ? innings1 : innings2

  const totalOvers = setup.total_overs ?? 20
  const teamAName = setup.team_a_name ?? 'Team A'
  const teamBName = setup.team_b_name ?? 'Team B'
  const battingName = current?.batting_team === 'A' ? teamAName : teamBName
  const bowlingName = current?.batting_team === 'A' ? teamBName : teamAName

  const winProb = current ? computeWinProb(current, totalOvers) : 50
  const teamAWP = current?.batting_team === 'A' ? winProb : 100 - winProb

  // Localized line for a ball — English uses the sim's full commentary,
  // Hindi/Punjabi use the signature banks (stable pick per ball).
  const lineFor = (ev: BallEvent) => {
    if (lang === 'en') return ev.commentary
    const bank = SIGNATURE_LINES[lang]
    const pool = ev.outcome === '6' ? bank.six : ev.outcome === '4' ? bank.four : ev.outcome === 'W' ? bank.wicket : bank.dot
    return pool[(ev.over * 6 + ev.ball) % pool.length]
  }

  if (!current) return null
  const rr = current.run_rate?.toFixed(2) ?? '0.00'
  const rrr = current.required_rate?.toFixed(2)
  const recentBalls = current.commentary.slice(0, 3)

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* ── DELIVERY INFO (top-right) — desktop only; on phones it
          collides with the top-left pills and eats field view. ──── */}
      {current.last_ball && (
        <div className={`hidden md:block absolute top-3 right-3 min-w-[170px] rounded-lg overflow-hidden ${GLASS}`}>
          <div className="text-white text-[9px] font-bold tracking-widest px-3 py-1 uppercase" style={{ background: BLUE }}>Delivery</div>
          <div className="px-3 py-2 space-y-1.5">
            <div className="flex justify-between text-xs gap-4"><span className={INK_MUTED}>Bowler</span><span className={`font-semibold ${INK}`}>{current.bowler?.player.name ?? '—'}</span></div>
            <div className="flex justify-between text-xs gap-4"><span className={INK_MUTED}>Type</span><span className={INK}>{current.last_ball.delivery_type}</span></div>
            <div className="flex justify-between text-xs gap-4"><span className={INK_MUTED}>Speed</span><span className={`font-semibold ${INK}`}>{current.last_ball.speed_kmh} km/h</span></div>
            <div className="flex justify-between text-xs gap-4"><span className={INK_MUTED}>Over · Ball</span><span className={INK}>{current.last_ball.label}</span></div>
          </div>
        </div>
      )}

      {/* ── BOTTOM STACK (crease strip · commentary · band) ───────
          One bottom-anchored column instead of magic pixel offsets, so
          the layout holds together at any width. On desktop the crease
          strip sits left and the commentary right (TV-style); on phones
          they stack full-width. */}
      <div className="absolute bottom-[calc(50px+env(safe-area-inset-bottom))] left-0 right-0 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-1.5 px-3 pb-1.5">

          {/* Crease strip — striker filled blue with the *, non-striker
              neutral glass (desktop only), bowler in opposition red. */}
          <div className="flex flex-row items-stretch gap-1.5 overflow-x-auto">
            {current.batter1 && (
              <div className="rounded-md px-3 py-1.5 flex-1 md:flex-none min-w-0 md:min-w-[172px] text-white shadow-[0_2px_12px_rgba(0,40,80,0.25)]" style={{ background: BLUE }}>
                <div className="text-[7px] font-bold tracking-[2px] opacity-80 mb-0.5">BATTING · ON STRIKE</div>
                <div className="text-sm font-bold leading-none truncate">
                  {current.batter1.player.name} <span className="font-black">*</span>
                </div>
                <div className="text-[10px] font-mono opacity-90">{current.batter1.runs} ({current.batter1.balls}) · SR {current.batter1.balls > 0 ? ((current.batter1.runs / current.batter1.balls) * 100).toFixed(0) : '—'}</div>
              </div>
            )}
            {current.batter2 && (
              <div className={`hidden md:block rounded-md px-3 py-1.5 min-w-[150px] ${GLASS}`}>
                <div className={`text-[7px] font-bold tracking-[2px] mb-0.5 ${INK_MUTED}`}>NON-STRIKER</div>
                <div className={`text-sm font-semibold leading-none ${INK}`}>{current.batter2.player.name}</div>
                <div className={`text-[10px] font-mono ${INK_MUTED}`}>{current.batter2.runs} ({current.batter2.balls})</div>
              </div>
            )}
            {current.bowler && (
              <div className="rounded-md px-3 py-1.5 flex-1 md:flex-none min-w-0 md:min-w-[172px] text-white shadow-[0_2px_12px_rgba(80,10,0,0.25)] bg-[#c0392b]">
                <div className="text-[7px] font-bold tracking-[2px] opacity-80 mb-0.5">BOWLING</div>
                <div className="text-sm font-bold leading-none truncate">{current.bowler.player.name}</div>
                <div className="text-[10px] font-mono opacity-90">{current.bowler.wickets}-{current.bowler.runs} ({current.bowler.overs}) · Econ {current.bowler.economy.toFixed(1)}</div>
              </div>
            )}
          </div>

          {/* Commentary box — full width on phones (latest ball only),
              fixed 370px on desktop (last three balls). */}
          <div className={`w-full md:w-[370px] shrink-0 rounded-lg overflow-hidden pointer-events-auto ${GLASS}`}>
            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: BLUE }}>
              <div className="text-[9px] font-bold tracking-widest text-white uppercase truncate">
                Commentary · {PERSONAS[lang].name}
              </div>
              <div className="flex gap-1.5 items-center shrink-0">
                {(['en', 'hi'] as const).map(l => (
                  <button key={l} onClick={() => onLangChange(l)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${lang === l ? 'bg-white' : 'bg-[rgba(255,255,255,0.2)] text-white'}`}
                    style={lang === l ? { color: BLUE } : undefined}>
                    {l === 'en' ? 'ENGLISH' : 'हिंदी'}
                  </button>
                ))}
                <button onClick={onToggleAudio}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${audioEnabled ? 'bg-white' : 'bg-[rgba(255,255,255,0.2)] text-white opacity-70'}`}
                  style={audioEnabled ? { color: BLUE } : undefined}>
                  AUDIO {audioEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <div className="px-3 py-2 space-y-1.5 min-h-[40px] md:min-h-[64px]">
              {recentBalls.length === 0 && <div className={`text-xs ${INK_MUTED}`}>Play is underway…</div>}
              {recentBalls.map((ev, i) => (
                <div key={`${ev.label}-${i}`} className={`items-start gap-2 ${i > 0 ? 'hidden md:flex opacity-55' : 'flex'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${pipClass(ev.outcome)}`}>
                    {ev.outcome === 'W' ? 'W' : ev.runs}
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[10px] font-mono mr-1.5 ${INK_MUTED}`}>{ev.label}</span>
                    <span className={`text-xs leading-snug ${INK}`}>{lineFor(ev)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BROADCAST BAND ─────────────────────────────────────── */}
        <div className="bg-[rgba(255,255,255,0.96)] border-t border-[rgba(0,0,0,0.1)] shadow-[0_-2px_10px_rgba(0,40,80,0.12)]">
          {/* Row 1 — scorebug · this over · stats (stats desktop-only) */}
          <div className="flex flex-wrap md:flex-nowrap items-stretch md:h-[58px]">
            <div className="px-3 md:px-4 py-1.5 md:py-0 flex flex-col justify-center min-w-[110px] md:min-w-[150px] border-l-4" style={{ borderLeftColor: BLUE }}>
              <div className={`text-[10px] tracking-wide truncate ${INK_MUTED}`}>{battingName}</div>
              <div className={`font-mono text-xl md:text-2xl font-black leading-none ${INK}`}>{current.score}/{current.wickets}</div>
              <div className={`text-[9px] font-mono ${INK_MUTED}`}>{current.overs} / {totalOvers} ov</div>
            </div>
            <div className="px-2.5 md:px-3 flex flex-col items-center justify-center min-w-[48px] md:min-w-[54px] text-white" style={{ background: BLUE }}>
              {status === 'live' && <span className="w-2 h-2 rounded-full bg-red-400 blink" />}
              <div className="text-[9px] font-black tracking-widest mt-0.5">LIVE</div>
              <div className="text-[7px] font-bold opacity-80">{setup.format}</div>
            </div>
            <div className="px-3 md:px-4 py-1.5 md:py-0 flex flex-col justify-center min-w-[110px] md:min-w-[150px]">
              <div className={`text-[10px] tracking-wide truncate ${INK_MUTED}`}>{bowlingName}</div>
              {current.target ? (
                <>
                  <div className={`font-mono text-sm font-bold ${INK}`}>Target {current.target}</div>
                  <div className="text-[9px] font-semibold" style={{ color: BLUE }}>Need {current.target - current.score} off {totalOvers * 6 - current.balls} balls</div>
                </>
              ) : (
                <div className={`text-[10px] ${INK_MUTED}`}>Yet to bat</div>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-0 md:border-l border-[rgba(0,0,0,0.08)]">
              <span className={`text-[8px] tracking-widest mr-1 ${INK_MUTED}`}>THIS OVER</span>
              {current.over_balls.map((b, i) => (
                <div key={i} className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[9px] font-bold ${pipClass(b)}`}>
                  {b === 'W' ? 'W' : b}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 6 - current.over_balls.length) }).map((_, i) => (
                <div key={i} className="w-[20px] h-[20px] rounded-full bp-e" />
              ))}
            </div>

            <div className="hidden lg:flex items-center ml-auto">
              {[['RUN RATE', rr], ['REQUIRED', rrr ?? '—'], ['PARTNERSHIP', String(current.partnership)], ['WKTS LEFT', String(10 - current.wickets)]].map(([l, v]) => (
                <div key={l} className="px-4 py-1.5 border-l border-[rgba(0,0,0,0.08)] text-center">
                  <div className={`font-mono text-sm font-bold ${INK}`}>{v}</div>
                  <div className={`text-[7px] tracking-widest uppercase ${INK_MUTED}`}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 — WIN PROBABILITY, clearly labelled */}
          <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 border-t border-[rgba(0,0,0,0.07)]">
            <span className={`hidden sm:inline text-[9px] font-black tracking-widest ${INK_MUTED}`}>WIN PROBABILITY</span>
            <span className="text-[11px] font-bold min-w-0 md:min-w-[110px] text-right truncate" style={{ color: BLUE }}>{teamAName} {teamAWP}%</span>
            <div className="flex-1 h-[8px] rounded-full overflow-hidden bg-[rgba(0,0,0,0.1)]">
              <div className="h-full transition-all duration-700" style={{ width: `${teamAWP}%`, background: BLUE }} />
            </div>
            <span className={`text-[11px] font-bold min-w-0 md:min-w-[110px] truncate ${INK_MUTED}`}>{100 - teamAWP}% {teamBName}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
