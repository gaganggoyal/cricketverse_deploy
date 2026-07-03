'use client'
import { useLiveMatch } from '@/lib/store'
import { Outcome } from '@/types'

function BallPip({ outcome }: { outcome: Outcome }) {
  const cls =
    outcome === '6' ? 'bp-6' :
    outcome === '4' ? 'bp-4' :
    outcome === 'W' ? 'bp-W' :
    outcome === 'WD' || outcome === 'NB' ? 'bg-yellow-700 text-yellow-200' :
    'bp-r'
  return (
    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold ${cls}`}>
      {outcome === 'W' ? 'W' : outcome === 'WD' ? 'Wd' : outcome === 'NB' ? 'Nb' : outcome}
    </div>
  )
}

export function ScoreHUD() {
  const { innings1, innings2, innings, viewInnings, setViewInnings, status } = useLiveMatch()
  const current = viewInnings === 1 ? innings1 : innings2
  const other   = viewInnings === 1 ? innings2 : innings1

  if (!current) return null

  const rr = current.run_rate?.toFixed(2) ?? '0.00'
  const rrr = current.required_rate?.toFixed(2)

  return (
    <div className="flex flex-col gap-2">

      {/* Innings tabs */}
      {innings2 && (
        <div className="flex gap-1">
          {[1, 2].map(n => (
            <button
              key={n}
              onClick={() => setViewInnings(n)}
              className={`flex-1 py-1.5 text-xs rounded-md border transition-all ${
                viewInnings === n
                  ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.1)] text-[var(--gold)] font-medium'
                  : 'border-[var(--border)] text-[var(--muted)] bg-transparent'
              }`}
            >
              {n === 1 ? '1st Innings' : '2nd Innings'}
            </button>
          ))}
        </div>
      )}

      {/* Main scorebug */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Batting team */}
          <div className="text-center flex-1">
            <div className="text-[10px] tracking-widest text-[var(--muted)] uppercase mb-1">
              {current.batting_team === 'A' ? 'Team A' : 'Team B'} Batting
            </div>
            <div className="font-mono text-3xl font-medium text-[var(--cream)]">
              {current.score}/{current.wickets}
            </div>
            <div className="font-mono text-xs text-[var(--muted)] mt-0.5">
              {current.overs} ov
            </div>
          </div>

          {/* Live pill + vs */}
          <div className="flex flex-col items-center gap-1 px-3">
            {status === 'live' && (
              <div className="flex items-center gap-1 bg-red-700 text-white text-[9px] font-bold tracking-widest px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white blink" />
                LIVE
              </div>
            )}
            {status === 'innings_break' && (
              <div className="text-[9px] tracking-widest text-yellow-400 font-bold">BREAK</div>
            )}
            <div className="text-xs text-[var(--muted)]">vs</div>
          </div>

          {/* Target / opposition */}
          <div className="text-center flex-1">
            {other ? (
              <>
                <div className="text-[10px] tracking-widest text-[var(--muted)] uppercase mb-1">
                  {current.batting_team === 'A' ? 'Team B' : 'Team A'}
                </div>
                <div className="text-xl font-medium text-[var(--muted)]">
                  {other.score}/{other.wickets}
                </div>
                {current.target && (
                  <div className="text-xs text-[var(--gold)] mt-0.5">
                    Target: {current.target}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[var(--muted)] text-sm">—</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-3">
          <div className="text-center">
            <div className="font-mono text-base font-medium text-[var(--cream)]">{rr}</div>
            <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase">RR</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium text-[var(--cream)]">{rrr ?? '—'}</div>
            <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase">Req</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium text-[var(--cream)]">{current.partnership}</div>
            <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase">Pship</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-base font-medium text-[var(--cream)]">
              {10 - current.wickets}
            </div>
            <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase">Left</div>
          </div>
        </div>
      </div>

      {/* Over worm */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 flex flex-wrap gap-[5px] items-center min-h-[44px]">
        <span className="text-[9px] text-[var(--muted)] mr-1 self-center">OVER</span>
        {current.over_balls.map((b, i) => <BallPip key={i} outcome={b} />)}
        {Array.from({ length: 6 - current.over_balls.length }).map((_, i) => (
          <div key={i} className="w-[18px] h-[18px] rounded-full bp-e" />
        ))}
      </div>
    </div>
  )
}

export function PlayerHUD() {
  const { innings1, innings2, viewInnings } = useLiveMatch()
  const current = viewInnings === 1 ? innings1 : innings2
  if (!current) return null

  const { batter1, batter2, bowler, last_ball } = current

  return (
    <div className="flex flex-col gap-2">
      {/* Batters */}
      <div className="grid grid-cols-2 gap-2">
        {[batter1, batter2].map((bat, i) => bat && (
          <div key={i} className={`bg-[var(--card)] border rounded-xl p-3 ${i === 0 ? 'border-[rgba(22,115,199,0.4)]' : 'border-[var(--border)]'}`}>
            <div className="text-[9px] tracking-widest text-[var(--gold)] uppercase mb-1">
              {i === 0 ? '⚡ On strike' : '🏏 Non-striker'}
            </div>
            <div className="text-sm font-medium text-[var(--cream)] truncate">{bat.player.name}</div>
            <div className="font-mono text-xs text-[var(--muted)] mt-0.5">
              {bat.runs}({bat.balls}) · SR {bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(0) : '—'}
            </div>
            <div className="text-[10px] text-[var(--gold)] mt-1 truncate">{bat.player.skill_description?.split('.')[0]}</div>
            {/* Form bar */}
            <div className="h-[2px] bg-[var(--border)] rounded mt-2 overflow-hidden">
              <div className="h-full rounded bg-[var(--gold)]" style={{ width: `${bat.stamina}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bowler */}
      {bowler && (
        <div className="bg-[var(--card)] border border-[rgba(220,120,60,0.25)] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[9px] tracking-widest text-[#e08050] uppercase mb-1">🎯 Bowling</div>
            <div className="text-sm font-medium text-[var(--cream)]">{bowler.player.name}</div>
            <div className="font-mono text-xs text-[var(--muted)]">
              {bowler.wickets}-{bowler.runs} ({bowler.overs}) · Econ {bowler.economy.toFixed(1)}
            </div>
          </div>
          {last_ball && (
            <div className="text-right">
              <div className="font-mono text-2xl font-light text-[var(--gold)]">{last_ball.speed_kmh}</div>
              <div className="text-[9px] text-[var(--muted)]">km/h</div>
              <div className="text-[10px] text-[#e08050] mt-0.5">{last_ball.delivery_type}</div>
            </div>
          )}
        </div>
      )}

      {/* Commentary */}
      {last_ball && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3">
          <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase mb-1.5">Latest</div>
          <div className="flex items-start gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              last_ball.outcome === '6' ? 'bg-green-900 text-green-300' :
              last_ball.outcome === '4' ? 'bg-blue-900 text-blue-300' :
              last_ball.outcome === 'W' ? 'bg-red-900 text-red-300' :
              'bg-[var(--dark2)] text-[var(--muted)]'
            }`}>
              {last_ball.outcome === 'W' ? 'W' : last_ball.runs}
            </div>
            <p className="text-xs text-[rgba(245,240,232,0.7)] leading-relaxed">{last_ball.commentary}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CommentaryFeed() {
  const { innings1, innings2, viewInnings } = useLiveMatch()
  const current = viewInnings === 1 ? innings1 : innings2
  if (!current?.commentary.length) return null

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 max-h-[220px] overflow-y-auto">
      <div className="text-[9px] tracking-widest text-[var(--muted)] uppercase mb-2">Ball-by-ball</div>
      {current.commentary.slice(0, 30).map((ball, i) => (
        <div key={i} className="flex items-start gap-2 mb-2.5">
          <span className="font-mono text-[10px] text-[var(--muted)] min-w-[28px]">{ball.label}</span>
          <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
            ball.outcome === '6' ? 'bg-green-900 text-green-400' :
            ball.outcome === '4' ? 'bg-blue-900 text-blue-400' :
            ball.outcome === 'W' ? 'bg-red-900 text-red-400' :
            ball.runs > 0 ? 'bg-[rgba(22,115,199,0.2)] text-[var(--gold)]' :
            'bg-[var(--dark2)] text-[var(--muted)]'
          }`}>
            {ball.outcome === 'W' ? 'W' : ball.runs}
          </div>
          <p className="text-[11px] text-[rgba(245,240,232,0.65)] leading-relaxed">{ball.commentary}</p>
        </div>
      ))}
    </div>
  )
}
