'use client'
import { InningsCard } from '@/lib/matchHistory'

// Full innings scorecard — batting card + bowling figures, styled like a
// broadcast summary. Used on the innings-break page and the final result page.
export function InningsScorecard({ card, didNotBat }: { card: InningsCard; didNotBat?: string[] }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Innings header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[rgba(22,115,199,0.08)] border-b border-[var(--border)]">
        <div className="text-sm font-bold text-[var(--cream)]">{card.teamName}</div>
        <div className="font-mono text-lg font-black text-[var(--gold)]">
          {card.score}/{card.wickets}
          <span className="text-xs font-medium text-[var(--muted)] ml-2">({card.overs} ov)</span>
        </div>
      </div>

      {/* Batting */}
      <div className="px-4 py-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-[var(--muted)]">
              <th className="text-left font-medium pb-1.5">Batting</th>
              <th className="text-right font-medium pb-1.5 w-9">R</th>
              <th className="text-right font-medium pb-1.5 w-9">B</th>
              <th className="text-right font-medium pb-1.5 w-9">4s</th>
              <th className="text-right font-medium pb-1.5 w-9">6s</th>
              <th className="text-right font-medium pb-1.5 w-12">SR</th>
            </tr>
          </thead>
          <tbody>
            {card.batting.map(b => (
              <tr key={b.name} className="border-t border-[rgba(22,115,199,0.08)]">
                <td className="py-1.5 pr-2">
                  <span className="text-[var(--cream)] font-medium">{b.name}</span>
                  <span className={`ml-1.5 text-[9px] ${b.out ? 'text-[var(--muted)]' : 'text-[#1e7a3c] font-semibold'}`}>
                    {b.out ? 'out' : 'not out'}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono font-bold text-[var(--cream)]">{b.runs}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.balls}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.fours}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.sixes}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">
                  {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {didNotBat && didNotBat.length > 0 && (
          <div className="mt-2 text-[10px] text-[var(--muted)]">
            Did not bat: {didNotBat.join(', ')}
          </div>
        )}
      </div>

      {/* Bowling */}
      <div className="px-4 pb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-widest text-[var(--muted)] border-t border-[var(--border)]">
              <th className="text-left font-medium py-1.5">Bowling</th>
              <th className="text-right font-medium py-1.5 w-9">O</th>
              <th className="text-right font-medium py-1.5 w-9">R</th>
              <th className="text-right font-medium py-1.5 w-9">W</th>
              <th className="text-right font-medium py-1.5 w-12">Econ</th>
            </tr>
          </thead>
          <tbody>
            {card.bowling.map(b => (
              <tr key={b.name} className="border-t border-[rgba(22,115,199,0.08)]">
                <td className="py-1.5 pr-2 text-[var(--cream)] font-medium">{b.name}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.overs}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.runs}</td>
                <td className="py-1.5 text-right font-mono font-bold text-[var(--cream)]">{b.wickets}</td>
                <td className="py-1.5 text-right font-mono text-[var(--muted)]">{b.economy.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
