'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useLiveMatch } from '@/lib/store'
import { WSMessage } from '@/types'

const SIM_URL = process.env.NEXT_PUBLIC_SIM_URL ?? 'ws://localhost:8000'

export function useMatchWebSocket(matchId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  const { applyBallEvent, setInningsBreak, setResult, autoMode } = useLiveMatch()
  const autoTimer = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!matchId) return
    ws.current = new WebSocket(`${SIM_URL}/match/${matchId}/live`)

    ws.current.onopen = () => {
      console.log('[WS] connected to match', matchId)
    }

    ws.current.onmessage = (e) => {
      const msg: WSMessage = JSON.parse(e.data)
      if (msg.type === 'ball') {
        applyBallEvent(msg.data)
      } else if (msg.type === 'innings_break') {
        setInningsBreak(msg.data.target, msg.data.batting_team)
      } else if (msg.type === 'match_over') {
        setResult(msg.data)
        stopAuto()
      }
    }

    ws.current.onerror = (e) => console.error('[WS] error', e)
    ws.current.onclose = () => console.log('[WS] disconnected')
  }, [matchId, applyBallEvent, setInningsBreak, setResult])

  useEffect(() => {
    connect()
    return () => { ws.current?.close() }
  }, [connect])

  const send = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  const bowlBall = useCallback(() => send({ action: 'bowl' }), [send])
  const bowlOver = useCallback(() => send({ action: 'over' }), [send])

  const startAuto = useCallback((speedMs = 900) => {
    send({ action: 'auto', speed_ms: speedMs })
  }, [send])

  const stopAuto = useCallback(() => {
    send({ action: 'pause' })
    if (autoTimer.current) clearInterval(autoTimer.current)
  }, [send])

  return { bowlBall, bowlOver, startAuto, stopAuto }
}
