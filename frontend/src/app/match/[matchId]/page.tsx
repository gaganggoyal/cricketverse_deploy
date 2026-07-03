'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLiveMatch, useSetupStore } from '@/lib/store'
import { CricketEngine } from '@/components/match/MatchEngine3D'
import { BroadcastHUD } from '@/components/match/BroadcastHUD'
import { useVoiceCommentary } from '@/components/match/VoiceCommentary'
import { playCrowdReaction } from '@/lib/crowdSound'
import { simulateLocalInnings, computeLocalResult, fallbackBowlingPlan } from '@/lib/localSim'
import { InningsScorecard } from '@/components/match/InningsScorecard'
import { inningsToCard } from '@/lib/matchHistory'
import { BallEvent } from '@/types'

function battingFirstFromToss(setup: any): 'A' | 'B' {
  if (!setup.toss_winner || !setup.toss_decision) return Math.random() < 0.5 ? 'A' : 'B'
  const winnerBats = setup.toss_decision === 'bat'
  return winnerBats ? setup.toss_winner : (setup.toss_winner === 'A' ? 'B' : 'A')
}

// The sim-engine streams the whole match over the socket in one burst, so
// innings-break and match-over must be processed in queue order behind the
// balls that precede them — reacting to them on arrival flips the scoreboard
// to the 2nd innings while the 1st innings is still being played out.
type QueueItem =
  | BallEvent
  | { marker: 'innings_break'; target: number; batting: string; score: number; wickets: number }
  | { marker: 'match_over'; result: any }

export default function MatchPage() {
  const params   = useParams()
  const router   = useRouter()
  const matchId  = params?.matchId as string

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const engineRef    = useRef<CricketEngine | null>(null)
  const autoTimer    = useRef<NodeJS.Timeout | null>(null)

  const [autoMode,    setAutoMode]    = useState(true)
  const [actionText,  setActionText]  = useState('')

  // Innings break is a full summary page the user reads and dismisses —
  // `proceed` carries whatever kicks off the 2nd innings for the active
  // path (WS marker vs local sim).
  const [breakInfo, setBreakInfo] = useState<{ target: number; proceed: () => void } | null>(null)

  // Lets "Skip innings" work even while a ball is mid-animation: the flag
  // is honoured when the in-flight ball completes.
  const skipRequestedRef = useRef(false)

  // When the user skips, they've opted out of the play-by-play — the break
  // page / result should appear in silence, not with an announcement
  // talking over the transition.
  const suppressAnnounceRef = useRef(false)

  // Speak break/result announcements only AFTER the page transition has
  // landed — never over the tail of ball commentary (which we cut first).
  // The innings-break page is an in-page overlay, so a beat after
  // setBreakInfo is enough.
  const announceAfterTransition = (fn: () => void) => setTimeout(fn, 1200)

  // The result page is a route change whose commit time varies (RSC fetch,
  // unmounting the 3D engine) — announcing on a timer talks over the last
  // seconds of the field view. Wait until the /result URL is actually
  // showing, then speak. (speechSynthesis is global; it survives the
  // navigation even though this component unmounts.)
  const announceOnResultPage = (fn: () => void) => {
    const started = Date.now()
    const iv = setInterval(() => {
      if (window.location.pathname.startsWith('/result')) {
        clearInterval(iv)
        setTimeout(fn, 600)
      } else if (Date.now() - started > 15000) {
        clearInterval(iv)
      }
    }, 200)
  }

  // The delivery queue lives in a ref and is processed imperatively — NEVER
  // inside a setState updater. React Strict Mode double-invokes updater
  // functions in dev, which double-fired every ball's side effects (the
  // duplicate call tripped the engine's re-entry guard and skipped the
  // animation entirely, making play race ahead with doubled commentary).
  const queueRef = useRef<QueueItem[]>([])
  const [queueLen, setQueueLen] = useState(0)
  const processingRef = useRef(false)
  const [processing, setProcessingState] = useState(false)
  const syncQueueLen = () => setQueueLen(queueRef.current.length)
  const setProcessing = (v: boolean) => { processingRef.current = v; setProcessingState(v) }

  const {
    initMatch, applyBallEvent, setResult, setInningsBreak, innings,
    innings1, innings2, viewInnings, status,
  } = useLiveMatch()
  const { setup } = useSetupStore()
  const voice = useVoiceCommentary()
  const localSimRef = useRef<{
    battingFirst: 'A' | 'B'; phase: 1 | 2
    inn1Balls: BallEvent[]; inn1Score: number; inn1Wkts: number
  } | null>(null)

  // ── INIT ENGINE ───────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return
    const eng = new CricketEngine(canvasRef.current)
    const timeOfPlay = setup.time_of_play ?? 'afternoon'
    eng.init().then(() => eng.applyConditions(timeOfPlay)).catch(console.error)
    engineRef.current = eng
    return () => eng.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── LOAD MATCH FROM SIM ENGINE ────────────────────────────────
  // The setup store lives in memory only — on a page refresh or a direct
  // /match/<id> visit there are no teams, which used to leave a dead black
  // screen. Send the user back to the wizard instead.
  useEffect(() => {
    if (matchId && (!setup.team_a?.length || !setup.team_b?.length)) router.replace('/setup')
  }, [matchId, setup.team_a, setup.team_b, router])

  useEffect(() => {
    if (!matchId || !setup.team_a || !setup.team_b) return

    // StrictMode runs this effect twice in dev. Without cleanup that left
    // TWO live sockets auto-bowling the same server-side ball queue — at the
    // innings boundary the two streams raced, and 2nd-innings balls could
    // reach the client BEFORE the innings_break marker, so they were applied
    // into the 1st innings (mixed scorecard, phantom overs, wrong total).
    let cancelled = false
    let ws: WebSocket | null = null

    const battingFirst = battingFirstFromToss(setup)
    initMatch(matchId, setup as any, battingFirst)
    queueRef.current = []
    syncQueueLen()

    // Call sim engine REST to start match & get pre-computed balls
    fetch(`${process.env.NEXT_PUBLIC_SIM_URL}/match/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        format: setup.format,
        total_overs: setup.total_overs,
        pitch: setup.pitch,
        time_of_play: setup.time_of_play,
        stadium_name: setup.stadium?.name ?? 'Unknown',
        team_a_players: setup.team_a,
        team_b_players: setup.team_b,
        toss_winner: setup.toss_winner ?? battingFirst,
        toss_decision: setup.toss_decision ?? 'bat',
      }),
    })
    .then(r => r.json())
    .then(d => {
      if (cancelled) return
      // Connect WebSocket
      ws = connectWS(matchId, d.batting_first)
    })
    .catch(() => {
      // Fallback: simulate locally in browser
      if (!cancelled) startLocalSim(battingFirst)
    })

    return () => {
      cancelled = true
      ws?.close()
    }
  }, [matchId])

  // ── LOCAL SIM FALLBACK (no backend needed for demo) ────────────
  const inningsSides = useCallback((battingFirst: 'A' | 'B') => {
    const battingTeam  = battingFirst === 'A' ? setup.team_a ?? [] : setup.team_b ?? []
    const bowlingTeam  = battingFirst === 'A' ? setup.team_b ?? [] : setup.team_a ?? []
    const battingOrder = (battingFirst === 'A' ? setup.batting_order_a : setup.batting_order_b) ?? battingTeam
    const bowlingOrder = (battingFirst === 'A' ? setup.bowling_order_b : setup.bowling_order_a) ?? bowlingTeam
    const bowlingPlan  = (battingFirst === 'A' ? setup.bowling_plan_b : setup.bowling_plan_a)
      ?? fallbackBowlingPlan(bowlingTeam, setup.total_overs ?? 20)
    return { battingOrder, bowlingOrder, bowlingPlan }
  }, [setup])

  const startLocalSim = useCallback((battingFirst: 'A' | 'B') => {
    const { battingOrder, bowlingOrder, bowlingPlan } = inningsSides(battingFirst)
    const inn1 = simulateLocalInnings({
      battingOrder, bowlingOrder, bowlingPlan, totalOvers: setup.total_overs ?? 20,
    })
    localSimRef.current = { battingFirst, phase: 1, inn1Balls: inn1.balls, inn1Score: inn1.finalScore, inn1Wkts: inn1.finalWickets }
    queueRef.current = [...inn1.balls]
    syncQueueLen()
  }, [inningsSides, setup.total_overs])

  // ── WEBSOCKET ─────────────────────────────────────────────────
  const connectWS = useCallback((matchId: string, battingFirst: string) => {
    const wsUrl = `${process.env.NEXT_PUBLIC_SIM_URL?.replace('http', 'ws')}/match/${matchId}/live`
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'ball') {
        queueRef.current.push(msg.data)
      } else if (msg.type === 'innings_break') {
        queueRef.current.push({
          marker: 'innings_break',
          target: msg.data.target,
          batting: msg.data.batting_team,
          score: msg.data.innings1_score,
          wickets: msg.data.innings1_wickets,
        })
      } else if (msg.type === 'match_over') {
        queueRef.current.push({ marker: 'match_over', result: msg.data })
      }
      syncQueueLen()
    }

    ws.onopen = () => ws.send(JSON.stringify({ action: 'auto', speed_ms: 0 }))
    return ws
  }, [])

  // ── ADVANCE THE LOCAL SIM ONCE ITS INNINGS IS FULLY PLAYED ─────
  // (The WS backend path advances via queue markers instead.)
  useEffect(() => {
    if (processing || queueLen > 0) return

    const sim = localSimRef.current
    if (!sim) return

    if (sim.phase === 1) {
      if ((sim as any).breakShown) return
      ;(sim as any).breakShown = true
      const target = sim.inn1Score + 1
      const chasing: 'A' | 'B' = sim.battingFirst === 'A' ? 'B' : 'A'
      // Silence the last ball's commentary before the break page shows;
      // announce the break over the summary once it's visible — unless the
      // user skipped here, in which case they get to read in peace.
      voice.stop()
      if (!suppressAnnounceRef.current) {
        announceAfterTransition(() => voice.announceInningsBreak(sim.inn1Score, sim.inn1Wkts, target))
      }
      suppressAnnounceRef.current = false
      setBreakInfo({
        target,
        proceed: () => {
          voice.stop() // break announcement mustn't run into ball 1 of the chase
          skipRequestedRef.current = false
          setBreakInfo(null)
          setInningsBreak(target, chasing)
          const { battingOrder, bowlingOrder, bowlingPlan } = inningsSides(chasing)
          const inn2 = simulateLocalInnings({
            battingOrder, bowlingOrder, bowlingPlan, totalOvers: setup.total_overs ?? 20, target,
          })
          localSimRef.current = { ...sim, phase: 2, inn2Balls: inn2.balls, inn2Score: inn2.finalScore, inn2Wkts: inn2.finalWickets } as any
          queueRef.current = [...inn2.balls]
          syncQueueLen()
        },
      })
    } else if (sim.phase === 2) {
      const s: any = sim
      const result = computeLocalResult({
        teamAName: setup.team_a_name ?? 'Team A',
        teamBName: setup.team_b_name ?? 'Team B',
        battingFirst: s.battingFirst,
        inn1Balls: s.inn1Balls, inn1Score: s.inn1Score, inn1Wkts: s.inn1Wkts,
        inn2Balls: s.inn2Balls, inn2Score: s.inn2Score, inn2Wkts: s.inn2Wkts,
        totalOvers: setup.total_overs ?? 20,
      })
      localSimRef.current = null
      setResult(result)
      // Cut leftover ball commentary; announce the winner only once the
      // result page is up (speechSynthesis is global, it survives the
      // navigation) — and not at all if the user skipped to the end.
      voice.stop()
      if (!suppressAnnounceRef.current) {
        announceOnResultPage(() => voice.announceResult(result.winner, result.margin))
      }
      suppressAnnounceRef.current = false
      setTimeout(() => router.push(`/result/${matchId}`), 0)
    }
  }, [queueLen, processing, setResult, setInningsBreak, voice, router, matchId, inningsSides, setup.total_overs, setup.team_a_name, setup.team_b_name])

  // Apply every queued ball of the current innings instantly, stopping at
  // the next marker (innings break / match over).
  const drainInningsBalls = useCallback(() => {
    while (queueRef.current.length && !('marker' in queueRef.current[0])) {
      applyBallEvent(queueRef.current.shift() as BallEvent)
    }
    syncQueueLen()
  }, [applyBallEvent])

  // ── PROCESS NEXT BALL (imperative — StrictMode-safe) ──────────
  const processNextBall = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return
    const ev = queueRef.current.shift()!
    syncQueueLen()

    if ('marker' in ev) {
      // Cut any commentary still talking (last ball's line, queued lines)
      // so the break/result page appears clean, not mid-sentence.
      voice.stop()
      const skipped = suppressAnnounceRef.current
      suppressAnnounceRef.current = false

      if (ev.marker === 'innings_break') {
        // Hold the queue shut for the break so 2nd-innings balls can't
        // apply while the store is still pointed at the 1st innings.
        // The break page stays up until the user proceeds (or the
        // break-timer countdown runs out).
        setProcessing(true)
        if (!skipped) announceAfterTransition(() => voice.announceInningsBreak(ev.score, ev.wickets, ev.target))
        setBreakInfo({
          target: ev.target,
          proceed: () => {
            voice.stop() // break announcement mustn't run into ball 1 of the chase
            skipRequestedRef.current = false
            setBreakInfo(null)
            setInningsBreak(ev.target, ev.batting)
            setProcessing(false)
          },
        })
      } else {
        setResult(ev.result)
        // The sim-engine reports the winner as 'A' | 'B' | 'tie' — say the
        // actual team name, and only once the result page is up.
        const winnerName = ev.result.winner === 'A' ? (setup.team_a_name ?? 'Team A')
          : ev.result.winner === 'B' ? (setup.team_b_name ?? 'Team B') : ''
        if (!skipped && winnerName) announceOnResultPage(() => voice.announceResult(winnerName, ev.result.margin))
        setTimeout(() => router.push(`/result/${matchId}`), 0)
      }
      return
    }

    setProcessing(true)

    // Everything the viewer sees/hears about the OUTCOME fires together,
    // when the ball completes — not when it leaves the bowler's hand.
    const onBallComplete = () => {
      applyBallEvent(ev)

      // A skip requested mid-delivery lands here: fast-forward the rest of
      // the innings silently instead of playing this ball's effects.
      if (skipRequestedRef.current) {
        skipRequestedRef.current = false
        drainInningsBalls()
        setProcessing(false)
        if (queueRef.current.length && 'marker' in queueRef.current[0]) processNextBall()
        return
      }

      // Play-by-play is running again — a later break/result should announce.
      suppressAnnounceRef.current = false

      if (ev.outcome === '6') showAction('SIX!', '#7edb5a')
      else if (ev.outcome === '4') showAction('FOUR!', '#6ab4f0')
      else if (ev.outcome === 'W') showAction('WICKET!', '#e74c3c')
      // Audio is a nice-to-have: a throwing sound stack (blocked autoplay,
      // odd speechSynthesis) must never leave `processing` stuck true and
      // freeze the match.
      try {
        playCrowdReaction(ev.outcome)
        voice.speakBallEvent(ev.outcome, ev.commentary, { batter: ev.batter, bowler: ev.bowler, runs: ev.runs })
      } catch { /* play on in silence */ }

      // Real-match rhythm: the bowler walks back, the field resets — hold
      // the next delivery until the moment (and its commentary) has landed.
      const cooldown = ev.outcome === 'W' ? 6500 : ev.outcome === '6' || ev.outcome === '4' ? 5500 : 3200
      setTimeout(() => setProcessing(false), cooldown)
    }

    if (engineRef.current) {
      engineRef.current.animateBall(ev, onBallComplete)
    } else {
      setTimeout(onBallComplete, 500)
    }
  }, [applyBallEvent, voice, setInningsBreak, setResult, router, matchId, drainInningsBalls, setup.team_a_name, setup.team_b_name])

  // Hold the first delivery until the 3D scene is actually on screen —
  // Babylon's async import + scene build takes seconds, and animateBall
  // before that insta-completes, so ball 1's score and commentary used to
  // play over the black loading canvas. If the engine never gets ready
  // (WebGL unavailable), start anyway after a grace period rather than
  // freezing the match.
  const pageOpenedAtRef = useRef(Date.now())
  const sceneReadyOrTimedOut = () =>
    (engineRef.current?.isReady() ?? false) || Date.now() - pageOpenedAtRef.current > 12000

  // ── AUTO MODE ─────────────────────────────────────────────────
  useEffect(() => {
    if (autoMode) {
      autoTimer.current = setInterval(() => {
        if (!processing && sceneReadyOrTimedOut()) processNextBall()
      }, 1400)
    } else {
      if (autoTimer.current) clearInterval(autoTimer.current)
    }
    return () => { if (autoTimer.current) clearInterval(autoTimer.current) }
  }, [autoMode, processing, processNextBall])

  const showAction = (text: string, color: string) => {
    setActionText(text)
    setTimeout(() => setActionText(''), 2000)
  }

  // Pause must actually stop play: kill the auto interval (via state) and
  // silence queued commentary. The in-flight ball finishes naturally.
  const togglePause = () => {
    setAutoMode(a => {
      if (a) voice.stop()
      return !a
    })
  }

  // Fast-forward the rest of the current innings: apply every remaining ball
  // instantly (no animation/commentary), stopping at the innings-break or
  // match-over marker, which then plays out normally. If a ball is
  // mid-animation the skip is deferred to its completion instead of being
  // dropped — this is why the button never needs to be disabled during play.
  const skipInnings = () => {
    if (breakInfo) return
    voice.stop()
    suppressAnnounceRef.current = true
    if (processingRef.current) {
      skipRequestedRef.current = true
      return
    }
    drainInningsBalls()
    if (queueRef.current.length && 'marker' in queueRef.current[0]) processNextBall()
  }

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--dark)]">

      {/* 3D GROUND — full bleed */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* Broadcast HUD overlay */}
      <BroadcastHUD
        lang={voice.lang}
        onLangChange={voice.setLang}
        audioEnabled={voice.enabled}
        onToggleAudio={() => voice.setEnabled(e => !e)}
      />

      {/* Top nav — back link + match info only, grouped top-left */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
        <button onClick={() => router.push('/')} className="text-sm text-[#16222c] bg-[rgba(255,255,255,0.9)] border border-[rgba(0,0,0,0.08)] px-3 py-1 rounded-full hover:bg-white transition-colors shadow-sm pointer-events-auto">
          ← QuickCric
        </button>
        <div className="text-[10px] tracking-widest text-[#16222c] bg-[rgba(255,255,255,0.8)] px-3 py-1 rounded-full shadow-sm">
          {setup.stadium?.name ?? 'Stadium'} · {setup.format} · {setup.pitch} pitch · {setup.time_of_play}
        </div>
      </div>

      {/* Innings break — opaque overlay (the canvas must stay mounted:
          Babylon is bound to this exact canvas node, so swapping the tree
          out would leave the 2nd innings rendering to a dead context). */}
      {breakInfo && innings1 && (
        <BreakSummary
          innings1={innings1}
          target={breakInfo.target}
          setup={setup}
          onProceed={breakInfo.proceed}
        />
      )}

      {/* Action flash */}
      {actionText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="text-5xl font-bold text-white drop-shadow-2xl" style={{ fontFamily: 'Georgia, serif', letterSpacing: '3px' }}>
            {actionText}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 h-[50px] px-3 flex items-center gap-2 bg-[rgba(255,255,255,0.95)] border-t border-[rgba(0,0,0,0.1)] z-30">
        {/* These stay ENABLED during a ball's animation/cooldown — the
            click handlers guard/defer internally. Disabling on transient
            `processing` made the buttons flicker off mid-play, which read
            as a hover bug. */}
        <button
          onClick={processNextBall}
          disabled={!queueLen}
          className="flex-1 h-[34px] bg-[#1673c7] text-white rounded-md text-xs font-semibold disabled:opacity-40 hover:bg-[#2a8ada] transition-all"
        >
          Bowl ball
        </button>
        <button
          onClick={skipInnings}
          disabled={!queueLen}
          className="flex-1 h-[34px] bg-[#1673c7] text-white rounded-md text-xs font-semibold disabled:opacity-40 hover:bg-[#2a8ada] transition-all"
        >
          Skip innings
        </button>
        <button
          onClick={togglePause}
          className={`flex-1 h-[34px] rounded-md text-xs font-semibold transition-all border ${
            autoMode
              ? 'bg-[rgba(192,57,43,0.1)] border-[rgba(192,57,43,0.4)] text-[#c0392b]'
              : 'bg-[rgba(30,92,14,0.08)] border-[rgba(30,92,14,0.35)] text-[#1e5c0e]'
          }`}
        >
          {autoMode ? 'Pause' : 'Auto play'}
        </button>
      </div>
    </div>
  )
}

// Full 1st-innings summary shown during the break — the user reads it at
// their own pace; the 2nd innings starts on their button press or when the
// break countdown runs out, whichever comes first.
function BreakSummary({ innings1, target, setup, onProceed }: {
  innings1: NonNullable<ReturnType<typeof useLiveMatch.getState>['innings1']>
  target: number
  setup: any
  onProceed: () => void
}) {
  const battedTeamName  = innings1.batting_team === 'A' ? (setup.team_a_name ?? 'Team A') : (setup.team_b_name ?? 'Team B')
  const chasingTeamName = innings1.batting_team === 'A' ? (setup.team_b_name ?? 'Team B') : (setup.team_a_name ?? 'Team A')
  const card = inningsToCard(innings1, battedTeamName)
  const battedNames = new Set(card.batting.map(b => b.name))
  const fullOrder = (innings1.batting_team === 'A' ? setup.batting_order_a ?? setup.team_a : setup.batting_order_b ?? setup.team_b) ?? []
  const didNotBat = fullOrder.map((p: any) => p.name).filter((n: string) => !battedNames.has(n))

  return (
    <div className="fixed inset-0 bg-[var(--dark)] z-50 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 pt-10 pb-32">
        <div className="text-center mb-6">
          <div className="text-[10px] tracking-[4px] text-[var(--gold)] font-semibold mb-2">END OF 1ST INNINGS</div>
          <div className="font-mono text-4xl font-black text-[var(--cream)]">
            {innings1.score}/{innings1.wickets}
            <span className="text-lg font-medium text-[var(--muted)] ml-2">({innings1.overs} ov)</span>
          </div>
          <div className="text-sm text-[var(--cream)] mt-2">
            <span className="font-semibold text-[var(--gold)]">{chasingTeamName}</span> need{' '}
            <span className="font-mono font-bold">{target}</span> to win
          </div>
        </div>

        <InningsScorecard card={card} didNotBat={didNotBat} />
      </div>

      {/* Sticky proceed bar with break countdown */}
      <div className="fixed bottom-0 left-0 right-0 bg-[rgba(234,243,251,0.97)] border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <BreakCountdown seconds={120} onDone={onProceed} />
          <button
            onClick={onProceed}
            className="flex-1 py-3 bg-[#1673c7] text-white rounded-xl font-bold tracking-widest text-sm hover:bg-[#2a8ada] transition-all"
          >
            START 2ND INNINGS →
          </button>
        </div>
      </div>
    </div>
  )
}

// Real matches have a fixed break — count it down and start the 2nd
// innings automatically if the user never presses the button.
function BreakCountdown({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => {
    const t = setInterval(() => setLeft(l => l - 1), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (left === 0) doneRef.current()
  }, [left])
  const shown = Math.max(0, left)
  return (
    <div className="text-center shrink-0">
      <div className="font-mono text-lg font-bold text-[#16222c]">
        {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, '0')}
      </div>
      <div className="text-[9px] tracking-widest text-[rgba(22,34,44,0.55)]">AUTO START</div>
    </div>
  )
}
