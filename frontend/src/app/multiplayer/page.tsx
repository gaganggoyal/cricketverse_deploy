'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type RoomStatus = 'idle' | 'waiting' | 'drafting' | 'playing' | 'finished'

interface ChatMsg { from: string; message: string; ts: number }
interface Reaction { from: string; emoji: string; id: string }

const REACTIONS = ['🔥','💯','😤','🏏','👏','😭','🤯','⚡','🎯','💪']

export default function MultiplayerPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params?.roomId as string | undefined

  const ws            = useRef<WebSocket | null>(null)
  const [status,      setStatus]     = useState<RoomStatus>('idle')
  const [roomCode,    setRoomCode]   = useState('')
  const [joinCode,    setJoinCode]   = useState('')
  const [user,        setUser]       = useState<any>(null)
  const [scoreA,      setScoreA]     = useState({r:0,w:0,b:0})
  const [scoreB,      setScoreB]     = useState({r:0,w:0,b:0})
  const [lastBall,    setLastBall]   = useState<any>(null)
  const [chat,        setChat]       = useState<ChatMsg[]>([])
  const [reactions,   setReactions]  = useState<Reaction[]>([])
  const [chatInput,   setChatInput]  = useState('')
  const [opponents,   setOpponents]  = useState<{host:string,guest?:string}>({host:''})
  const [innings,     setInnings]    = useState(1)
  const [target,      setTarget]     = useState<number|null>(null)
  const [matchOver,   setMatchOver]  = useState<any>(null)
  const [autoOn,      setAutoOn]     = useState(false)

  const MP_URL = process.env.NEXT_PUBLIC_MP_URL ?? 'ws://localhost:8001'

  useEffect(() => {
    supabase.auth.getUser().then(({data:{user}}) => setUser(user))
  }, [])

  // Connect WebSocket
  const connect = useCallback((rid: string, isHost: boolean, team: any[], settings?: any) => {
    const wsUrl = `${MP_URL}/room/${rid}/ws`
    ws.current  = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      ws.current!.send(JSON.stringify({
        type:         'hello',
        user_id:      user?.id ?? 'anon',
        display_name: user?.email?.split('@')[0] ?? 'Player',
        host:         isHost,
        team,
        settings,
      }))
    }

    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      handleServerMessage(msg)
    }

    ws.current.onclose = () => setStatus('idle')
  }, [user, MP_URL])

  const handleServerMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'room_created':
        setRoomCode(msg.room_id)
        setStatus('waiting')
        break
      case 'player_joined':
        setOpponents(msg.room)
        setStatus('drafting')
        break
      case 'match_started':
        setStatus('playing')
        setOpponents({host: msg.team_a_name, guest: msg.team_b_name})
        setAutoOn(true)
        break
      case 'ball':
        setLastBall(msg)
        setScoreA(msg.score_a)
        setScoreB(msg.score_b)
        setInnings(msg.innings)
        break
      case 'innings_break':
        setTarget(msg.target)
        break
      case 'match_over':
        setMatchOver(msg)
        setStatus('finished')
        break
      case 'chat':
        setChat(c => [msg, ...c].slice(0, 50))
        break
      case 'reaction':
        const id = Math.random().toString(36).slice(2)
        setReactions(r => [...r, { from: msg.from, emoji: msg.emoji, id }])
        setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 2500)
        break
    }
  }, [])

  const send = (msg: object) => ws.current?.readyState === 1 && ws.current.send(JSON.stringify(msg))

  const createRoom = async () => {
    const res  = await fetch(`${MP_URL.replace('ws','http')}/room/create`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ user_id: user?.id, display_name: user?.email?.split('@')[0], format: 'T20', total_overs: 20, pitch: 'flat', time_of_play: 'evening' }),
    })
    const data = await res.json()
    setRoomCode(data.room_id)
    // Connect as host with sample team
    connect(data.room_id, true, SAMPLE_TEAM_A, data.settings)
  }

  const joinRoom = () => {
    connect(joinCode.toUpperCase(), false, SAMPLE_TEAM_B)
    setStatus('waiting')
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    send({ type: 'chat', message: chatInput })
    setChatInput('')
  }

  const sendReaction = (emoji: string) => send({ type: 'reaction', emoji })
  const toggleAuto   = () => { send(autoOn ? {type:'pause'} : {type:'auto', speed_ms:1100}); setAutoOn(a=>!a) }

  const ov = (b: number) => `${Math.floor(b/6)}.${b%6}`

  // ── IDLE: create or join ──────────────────────────────────────
  if (status === 'idle') return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">⚔️</div>
          <div className="text-2xl font-bold text-[var(--gold)]" style={{fontFamily:'Georgia,serif'}}>Multiplayer</div>
          <div className="text-sm text-[var(--muted)] mt-1">Challenge a friend to a live AI match</div>
        </div>

        <button onClick={createRoom} className="w-full py-3.5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest mb-4 hover:bg-[var(--gold-light)] transition-all">
          CREATE ROOM
        </button>

        <div className="text-center text-xs text-[var(--muted)] mb-3">— or join with a code —</div>

        <div className="flex gap-2">
          <input
            value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code e.g. A3B2F1"
            maxLength={8}
            className="flex-1 px-3 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)] font-mono tracking-widest"
          />
          <button onClick={joinRoom} disabled={joinCode.length < 6} className="px-4 py-3 bg-[var(--pitch)] border border-[var(--pitch-light)] text-green-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-[var(--pitch-light)] transition-all">
            Join
          </button>
        </div>

        <button onClick={() => router.back()} className="w-full mt-4 text-xs text-[var(--muted)] py-2 hover:text-[var(--cream)] transition-colors">
          ← Back to dashboard
        </button>
      </div>
    </div>
  )

  // ── WAITING ───────────────────────────────────────────────────
  if (status === 'waiting') return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🏏</div>
        <div className="text-xl font-medium text-[var(--cream)] mb-2">Waiting for opponent...</div>
        <div className="text-sm text-[var(--muted)] mb-6">Share this code with your friend</div>
        <div className="bg-[var(--card)] border border-[var(--gold)] rounded-2xl px-8 py-5 mb-6">
          <div className="text-5xl font-mono font-bold text-[var(--gold)] tracking-widest">{roomCode}</div>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(roomCode); }}
          className="text-xs text-[var(--muted)] border border-[var(--border)] px-4 py-2 rounded-lg hover:border-[var(--border-hi)] hover:text-[var(--cream)] transition-all"
        >
          Copy code
        </button>
      </div>
    </div>
  )

  // ── MATCH OVER ────────────────────────────────────────────────
  if (status === 'finished' && matchOver) return (
    <div className="min-h-screen bg-[var(--dark)] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏆</div>
        <div className="text-3xl font-bold text-[var(--gold)] mb-1" style={{fontFamily:'Georgia,serif'}}>{matchOver.winner} wins!</div>
        <div className="text-lg text-[var(--cream)] mb-1">{matchOver.margin}</div>
        {matchOver.man_of_match && <div className="text-sm text-[var(--muted)] mb-6">MoM: {matchOver.man_of_match}</div>}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="text-xs text-[var(--muted)]">{opponents.host}</div>
            <div className="font-mono text-xl text-[var(--cream)]">{scoreA.r}/{scoreA.w}</div>
            <div className="text-xs text-[var(--muted)]">{ov(scoreA.b)} ov</div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
            <div className="text-xs text-[var(--muted)]">{opponents.guest}</div>
            <div className="font-mono text-xl text-[var(--cream)]">{scoreB.r}/{scoreB.w}</div>
            <div className="text-xs text-[var(--muted)]">{ov(scoreB.b)} ov</div>
          </div>
        </div>
        <button onClick={() => send({type:'rematch'})} className="w-full py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold mb-3">REMATCH →</button>
        <button onClick={() => router.push('/dashboard')} className="w-full py-3 border border-[var(--border)] text-[var(--muted)] rounded-xl text-sm">Dashboard</button>
      </div>
    </div>
  )

  // ── LIVE MATCH ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--dark)] flex flex-col max-w-lg mx-auto px-4 py-4">

      {/* Scorebug */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            <div className="text-[9px] uppercase tracking-widest text-[var(--muted)]">{opponents.host}</div>
            <div className="font-mono text-3xl font-medium text-[var(--cream)]">{scoreA.r}/{scoreA.w}</div>
            <div className="text-[10px] text-[var(--muted)]">{ov(scoreA.b)} ov</div>
          </div>
          <div className="px-3 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 bg-red-700 text-white text-[9px] font-bold tracking-widest px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white blink" />LIVE
            </div>
            <div className="text-xs text-[var(--muted)]">vs</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[9px] uppercase tracking-widest text-[var(--muted)]">{opponents.guest}</div>
            <div className="font-mono text-3xl font-medium text-[var(--cream)]">{scoreB.r}/{scoreB.w}</div>
            <div className="text-[10px] text-[var(--muted)]">{ov(scoreB.b)} ov</div>
          </div>
        </div>
        {target && innings===2 && (
          <div className="text-center text-xs text-[var(--gold)]">
            Need {target - scoreB.r} from {20*6 - scoreB.b} balls
          </div>
        )}
      </div>

      {/* Last ball */}
      {lastBall && (
        <div className={`rounded-xl p-3 mb-3 border ${
          lastBall.outcome==='6' ? 'border-green-700 bg-[rgba(60,160,60,0.1)]' :
          lastBall.outcome==='4' ? 'border-blue-700 bg-[rgba(60,120,200,0.1)]' :
          lastBall.outcome==='W' ? 'border-red-700 bg-[rgba(200,60,60,0.1)]' :
          'border-[var(--border)] bg-[var(--card)]'
        }`}>
          <div className="flex items-start gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              lastBall.outcome==='6' ? 'bg-green-900 text-green-300' :
              lastBall.outcome==='4' ? 'bg-blue-900 text-blue-300' :
              lastBall.outcome==='W' ? 'bg-red-900 text-red-300' :
              'bg-[var(--dark2)] text-[var(--muted)]'
            }`}>{lastBall.outcome==='W'?'W':lastBall.runs}</div>
            <div>
              <div className="text-xs font-mono text-[var(--muted)]">{lastBall.label} · {lastBall.speed_kmh}km/h · {lastBall.delivery}</div>
              <div className="text-sm text-[var(--cream)] leading-relaxed mt-0.5">{lastBall.commentary}</div>
            </div>
          </div>
        </div>
      )}

      {/* Reactions floating */}
      <div className="relative h-10 mb-2">
        {reactions.map(r => (
          <div key={r.id} className="absolute text-3xl animate-bounce" style={{left:`${Math.random()*80}%`}}>
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Reaction bar */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {REACTIONS.map(e => (
          <button key={e} onClick={() => sendReaction(e)} className="text-2xl flex-shrink-0 hover:scale-125 transition-transform active:scale-95">
            {e}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => send({type:'bowl'})} className="flex-1 py-2.5 bg-[var(--dark2)] border border-[var(--border)] text-[var(--muted)] rounded-lg text-xs font-medium hover:text-[var(--cream)] transition-all">
          Bowl ball
        </button>
        <button onClick={toggleAuto} className={`flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all ${autoOn ? 'bg-[rgba(180,50,40,0.3)] border-[rgba(220,80,70,0.4)] text-[#e07060]' : 'bg-[rgba(22,115,199,0.12)] border-[var(--border-hi)] text-[var(--gold)]'}`}>
          {autoOn ? 'Pause ⏸' : 'Auto ▶'}
        </button>
      </div>

      {/* Chat */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex-1 flex flex-col p-3 min-h-[200px]">
        <div className="text-[9px] uppercase tracking-widest text-[var(--muted)] mb-2">Live chat</div>
        <div className="flex-1 overflow-y-auto space-y-1.5 mb-3 max-h-[160px]">
          {chat.slice(0,20).map((m,i) => (
            <div key={i} className="text-xs">
              <span className="text-[var(--gold)] font-medium">{m.from}: </span>
              <span className="text-[rgba(245,240,232,0.75)]">{m.message}</span>
            </div>
          ))}
          {chat.length === 0 && <div className="text-xs text-[var(--muted)] text-center py-4">No messages yet</div>}
        </div>
        <div className="flex gap-2">
          <input
            value={chatInput} onChange={e=>setChatInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendChat()}
            placeholder="Say something..."
            className="flex-1 px-3 py-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg text-xs text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
          />
          <button onClick={sendChat} className="px-3 py-2 bg-[var(--pitch)] border border-[var(--pitch-light)] text-green-200 rounded-lg text-xs">
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// Sample teams for demo when no real teams selected
const SAMPLE_TEAM_A = [
  {id:'1',name:'Virat Kohli',country:'India',role:'Batter',bat_avg:57.2,bat_sr:138,bat_style:'balanced',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:95,form:90,pressure_handling:98},
  {id:'2',name:'Rohit Sharma',country:'India',role:'Batter',bat_avg:48.6,bat_sr:139,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:88,form:82,pressure_handling:85},
  {id:'3',name:'Suryakumar',country:'India',role:'Batter',bat_avg:46.5,bat_sr:167,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:90,form:88,pressure_handling:88},
  {id:'4',name:'KL Rahul',country:'India',role:'Batter',bat_avg:41.8,bat_sr:136,bat_style:'balanced',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:85,form:82,pressure_handling:85},
  {id:'5',name:'Hardik Pandya',country:'India',role:'All-rounder',bat_avg:32.4,bat_sr:148,bat_style:'aggressive',bowl_avg:31,bowl_economy:7.4,bowl_type:'Medium',stamina:82,form:75,pressure_handling:80},
  {id:'6',name:'Rishabh Pant',country:'India',role:'Batter',bat_avg:35.6,bat_sr:148,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:88,form:80,pressure_handling:80},
  {id:'7',name:'Jadeja',country:'India',role:'All-rounder',bat_avg:26.2,bat_sr:119,bat_style:'defensive',bowl_avg:27,bowl_economy:6.8,bowl_type:'Spin',stamina:92,form:85,pressure_handling:85},
  {id:'8',name:'Ashwin',country:'India',role:'Bowler',bat_avg:17.2,bat_sr:95,bat_style:'defensive',bowl_avg:24,bowl_economy:6.5,bowl_type:'Spin',stamina:85,form:80,pressure_handling:90},
  {id:'9',name:'Bumrah',country:'India',role:'Bowler',bat_avg:7.2,bat_sr:78,bat_style:'defensive',bowl_avg:20.7,bowl_economy:6.2,bowl_type:'Fast',stamina:78,form:85,pressure_handling:95},
  {id:'10',name:'Shami',country:'India',role:'Bowler',bat_avg:4.1,bat_sr:65,bat_style:'defensive',bowl_avg:25,bowl_economy:6.8,bowl_type:'Fast',stamina:80,form:78,pressure_handling:82},
  {id:'11',name:'Siraj',country:'India',role:'Bowler',bat_avg:2.5,bat_sr:55,bat_style:'defensive',bowl_avg:28,bowl_economy:7.1,bowl_type:'Fast',stamina:80,form:75,pressure_handling:78},
]
const SAMPLE_TEAM_B = [
  {id:'12',name:'Babar Azam',country:'Pakistan',role:'Batter',bat_avg:57.1,bat_sr:131,bat_style:'balanced',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:92,form:85,pressure_handling:88},
  {id:'13',name:'Rizwan',country:'Pakistan',role:'Batter',bat_avg:46.3,bat_sr:136,bat_style:'balanced',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:90,form:88,pressure_handling:90},
  {id:'14',name:'Fakhar Zaman',country:'Pakistan',role:'Batter',bat_avg:38.6,bat_sr:141,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:85,form:80,pressure_handling:82},
  {id:'15',name:'Iftikhar',country:'Pakistan',role:'Batter',bat_avg:29.7,bat_sr:142,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:82,form:78,pressure_handling:78},
  {id:'16',name:'Shadab',country:'Pakistan',role:'All-rounder',bat_avg:22.5,bat_sr:136,bat_style:'balanced',bowl_avg:26,bowl_economy:6.7,bowl_type:'Spin',stamina:84,form:80,pressure_handling:82},
  {id:'17',name:'Asif Ali',country:'Pakistan',role:'Batter',bat_avg:19.2,bat_sr:163,bat_style:'aggressive',bowl_avg:null,bowl_economy:null,bowl_type:null,stamina:80,form:75,pressure_handling:78},
  {id:'18',name:'Imad',country:'Pakistan',role:'All-rounder',bat_avg:21.3,bat_sr:131,bat_style:'balanced',bowl_avg:27,bowl_economy:6.3,bowl_type:'Spin',stamina:82,form:78,pressure_handling:80},
  {id:'19',name:'Nawaz',country:'Pakistan',role:'Bowler',bat_avg:16.8,bat_sr:118,bat_style:'defensive',bowl_avg:30,bowl_economy:6.8,bowl_type:'Medium',stamina:78,form:75,pressure_handling:76},
  {id:'20',name:'Shaheen',country:'Pakistan',role:'Bowler',bat_avg:6.8,bat_sr:82,bat_style:'defensive',bowl_avg:22,bowl_economy:6.4,bowl_type:'Fast',stamina:80,form:82,pressure_handling:88},
  {id:'21',name:'Haris Rauf',country:'Pakistan',role:'Bowler',bat_avg:5.2,bat_sr:78,bat_style:'defensive',bowl_avg:28,bowl_economy:7.2,bowl_type:'Fast',stamina:78,form:78,pressure_handling:80},
  {id:'22',name:'Naseem',country:'Pakistan',role:'Bowler',bat_avg:8.5,bat_sr:95,bat_style:'defensive',bowl_avg:25,bowl_economy:6.9,bowl_type:'Fast',stamina:76,form:78,pressure_handling:78},
]
