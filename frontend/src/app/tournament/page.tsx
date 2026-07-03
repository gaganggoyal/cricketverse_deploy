'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Format = 'round_robin' | 'knockout' | 'group_knockout'
type TournamentStatus = 'setup' | 'running' | 'complete'

interface TournamentTeam { name: string; players: string[]; wins: number; losses: number; nrr: number; points: number }
interface TournamentMatch { id: string; teamA: string; teamB: string; result?: { winner: string; scoreA: string; scoreB: string; margin: string }; status: 'pending' | 'live' | 'done' }

const TOURNAMENT_FORMATS = [
  { key:'round_robin',     label:'Round Robin',       desc:'Every team plays each other · Top 2 advance',  icon:'🔄', teams: 4 },
  { key:'knockout',        label:'Knockout',           desc:'Single elimination · Best team wins',          icon:'⚔️', teams: 8 },
  { key:'group_knockout',  label:'Groups + Knockout',  desc:'Group stage then semis & final · Like ICC',    icon:'🏆', teams: 8 },
]

export default function TournamentPage() {
  const router = useRouter()
  const [format,     setFormat]    = useState<Format>('round_robin')
  const [tourName,   setTourName]  = useState('')
  const [matchFormat,setMatchFmt]  = useState('T20')
  const [status,     setStatus]    = useState<TournamentStatus>('setup')
  const [teams,      setTeams]     = useState<TournamentTeam[]>([
    { name:'India',        players:[], wins:0, losses:0, nrr:0, points:0 },
    { name:'Australia',    players:[], wins:0, losses:0, nrr:0, points:0 },
    { name:'England',      players:[], wins:0, losses:0, nrr:0, points:0 },
    { name:'Pakistan',     players:[], wins:0, losses:0, nrr:0, points:0 },
  ])
  const [matches,    setMatches]   = useState<TournamentMatch[]>([])
  const [simming,    setSimming]   = useState(false)
  const [curMatch,   setCurMatch]  = useState<string|null>(null)

  const addTeam = () => {
    if (teams.length >= 8) return
    setTeams(t=>[...t, {name:`Team ${t.length+1}`,players:[],wins:0,losses:0,nrr:0,points:0}])
  }

  const removeTeam = (i: number) => setTeams(t=>t.filter((_,idx)=>idx!==i))

  const updateName = (i: number, name: string) => setTeams(t=>t.map((x,idx)=>idx===i?{...x,name}:x))

  const generateFixtures = () => {
    const fixtures: TournamentMatch[] = []
    if (format === 'round_robin') {
      for (let i=0;i<teams.length;i++)
        for (let j=i+1;j<teams.length;j++)
          fixtures.push({id:`${i}-${j}`,teamA:teams[i].name,teamB:teams[j].name,status:'pending'})
    } else if (format === 'knockout') {
      // Pair teams for QF
      for (let i=0;i<teams.length;i+=2)
        fixtures.push({id:`qf-${i}`,teamA:teams[i].name,teamB:teams[i+1]?.name??'BYE',status:'pending'})
    } else {
      // Groups of 4 then knockouts
      const g1 = teams.slice(0,4), g2 = teams.slice(4,8)
      ;[g1,g2].forEach((g,gi) => {
        for (let i=0;i<g.length;i++)
          for (let j=i+1;j<g.length;j++)
            fixtures.push({id:`g${gi}-${i}-${j}`,teamA:g[i].name,teamB:g[j].name,status:'pending'})
      })
    }
    setMatches(fixtures)
    setStatus('running')
  }

  const simulateMatch = async (matchId: string) => {
    setSimming(true); setCurMatch(matchId)
    // Simulate delay then random result
    await new Promise(r=>setTimeout(r,1500))
    const match = matches.find(m=>m.id===matchId)!
    const aWins = Math.random()>0.5
    const ra    = Math.floor(130+Math.random()*80)
    const wa    = Math.floor(Math.random()*10)
    const rb    = aWins ? Math.floor(ra*0.6+Math.random()*ra*0.3) : Math.floor(ra+Math.random()*20)
    const wb    = Math.floor(Math.random()*10)
    const margin= aWins ? `${ra-rb} runs` : `${10-wb} wickets`

    setMatches(m=>m.map(x=>x.id===matchId ? {...x,status:'done',result:{
      winner: aWins?match.teamA:match.teamB,
      scoreA:`${ra}/${wa}`,scoreB:`${rb}/${wb}`,margin,
    }}:x))

    setTeams(t=>t.map(team=>{
      if(team.name===match.teamA)      return {...team, wins:team.wins+(aWins?1:0), losses:team.losses+(aWins?0:1), points:team.points+(aWins?2:0)}
      else if(team.name===match.teamB) return {...team, wins:team.wins+(aWins?0:1), losses:team.losses+(aWins?1:0), points:team.points+(aWins?0:2)}
      return team
    }))
    setSimming(false); setCurMatch(null)
  }

  const simAll = async () => {
    const pending = matches.filter(m=>m.status==='pending')
    for (const m of pending) { await simulateMatch(m.id); await new Promise(r=>setTimeout(r,400)) }
  }

  const sortedTeams = [...teams].sort((a,b)=>b.points-a.points||(b.wins-a.wins))
  const allDone     = matches.length>0 && matches.every(m=>m.status==='done')

  // ── SETUP ──────────────────────────────────────────────────────
  if (status==='setup') return (
    <div className="min-h-screen bg-[var(--dark)] px-4 py-6 max-w-lg mx-auto">
      <button onClick={()=>router.back()} className="text-xs text-[var(--muted)] mb-5 hover:text-[var(--cream)]">← Back</button>
      <div className="text-[10px] tracking-widest text-[var(--gold)] mb-1">TOURNAMENT</div>
      <div className="text-2xl font-bold text-[var(--cream)] mb-6" style={{fontFamily:'Georgia,serif'}}>Create tournament</div>

      {/* Name */}
      <div className="mb-4">
        <div className="text-xs text-[var(--muted)] mb-2">Tournament name</div>
        <input value={tourName} onChange={e=>setTourName(e.target.value)} placeholder="e.g. QuickCric World Cup 2024" className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]" />
      </div>

      {/* Format */}
      <div className="mb-4">
        <div className="text-xs text-[var(--muted)] mb-2">Format</div>
        <div className="space-y-2">
          {TOURNAMENT_FORMATS.map(f=>(
            <div key={f.key} onClick={()=>setFormat(f.key as Format)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${format===f.key ? 'border-[var(--gold)] bg-[rgba(22,115,199,0.06)]' : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-hi)]'}`}>
              <div className="text-2xl">{f.icon}</div>
              <div>
                <div className="text-sm font-medium text-[var(--cream)]">{f.label}</div>
                <div className="text-[10px] text-[var(--muted)]">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match format */}
      <div className="mb-4">
        <div className="text-xs text-[var(--muted)] mb-2">Match format</div>
        <div className="flex gap-2">
          {['T10','T20','ODI'].map(f=>(
            <button key={f} onClick={()=>setMatchFmt(f)} className={`flex-1 py-2 text-xs rounded-lg border transition-all ${matchFormat===f ? 'border-[var(--gold)] text-[var(--gold)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-[var(--muted)]">Teams ({teams.length}/8)</div>
          {teams.length<8 && <button onClick={addTeam} className="text-xs text-[var(--gold)]">+ Add team</button>}
        </div>
        <div className="space-y-2">
          {teams.map((t,i)=>(
            <div key={i} className="flex items-center gap-2">
              <input value={t.name} onChange={e=>updateName(i,e.target.value)} className="flex-1 px-3 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm text-[var(--cream)] outline-none focus:border-[var(--border-hi)]" />
              {teams.length>2 && <button onClick={()=>removeTeam(i)} className="text-[var(--muted)] hover:text-red-400 text-xs">×</button>}
            </div>
          ))}
        </div>
      </div>

      <button onClick={generateFixtures} disabled={teams.length<2 || !tourName} className="w-full py-3.5 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-bold tracking-widest text-sm disabled:opacity-40 hover:bg-[var(--gold-light)] transition-all">
        START TOURNAMENT →
      </button>
    </div>
  )

  // ── RUNNING ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--dark)] px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-widest text-[var(--gold)]">🏆 TOURNAMENT</div>
          <div className="text-lg font-medium text-[var(--cream)]">{tourName || 'QuickCric Cup'}</div>
        </div>
        {!allDone && (
          <button onClick={simAll} disabled={simming} className="text-xs px-3 py-2 bg-[var(--gold)] text-[var(--dark)] rounded-lg font-medium disabled:opacity-50">
            {simming ? 'Simming...' : 'Sim all →'}
          </button>
        )}
      </div>

      {/* Standings */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl mb-4 overflow-hidden">
        <div className="px-3 py-2 border-b border-[var(--border)]">
          <div className="text-xs font-medium text-[var(--cream)]">Standings</div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          <div className="px-3 py-1.5 grid grid-cols-5 text-[9px] text-[var(--muted)] uppercase tracking-widest">
            <div className="col-span-2">Team</div><div className="text-center">W</div><div className="text-center">L</div><div className="text-center">Pts</div>
          </div>
          {sortedTeams.map((t,i)=>(
            <div key={t.name} className={`px-3 py-2 grid grid-cols-5 items-center ${i<2?'bg-[rgba(201,168,76,0.04)]':''}`}>
              <div className="col-span-2 flex items-center gap-2">
                {i<2 && <span className="text-[9px] text-[var(--gold)]">↑</span>}
                <span className="text-sm text-[var(--cream)]">{t.name}</span>
              </div>
              <div className="text-center font-mono text-xs text-green-400">{t.wins}</div>
              <div className="text-center font-mono text-xs text-red-400">{t.losses}</div>
              <div className="text-center font-mono text-xs font-medium text-[var(--gold)]">{t.points}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixtures */}
      <div className="text-xs font-medium text-[var(--cream)] mb-3">Fixtures</div>
      <div className="space-y-2">
        {matches.map(m=>(
          <div key={m.id} className={`bg-[var(--card)] border rounded-xl p-3 ${m.id===curMatch?'border-[var(--gold)]':'border-[var(--border)]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${m.result?.winner===m.teamA?'text-[var(--gold)]':'text-[var(--cream)]'}`}>{m.teamA}</span>
                  {m.result && <span className="font-mono text-xs text-[var(--muted)]">{m.result.scoreA}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${m.result?.winner===m.teamB?'text-[var(--gold)]':'text-[var(--cream)]'}`}>{m.teamB}</span>
                  {m.result && <span className="font-mono text-xs text-[var(--muted)]">{m.result.scoreB}</span>}
                </div>
                {m.result && <div className="text-[10px] text-[var(--gold)] mt-1">{m.result.winner} won by {m.result.margin}</div>}
              </div>
              <div className="ml-3">
                {m.status==='pending' && (
                  <button onClick={()=>simulateMatch(m.id)} disabled={simming} className="text-[10px] px-2.5 py-1.5 bg-[var(--pitch)] border border-[var(--pitch-light)] text-green-200 rounded-lg disabled:opacity-40">
                    {curMatch===m.id?'...':'Sim'}
                  </button>
                )}
                {m.status==='done' && <div className="text-[10px] text-green-400 font-medium">Done ✓</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="mt-5 bg-[rgba(22,115,199,0.08)] border border-[var(--gold)] rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-xl font-bold text-[var(--gold)]">{sortedTeams[0]?.name} wins the tournament!</div>
          <div className="text-sm text-[var(--muted)] mt-1">{sortedTeams[0]?.wins} wins · {sortedTeams[0]?.points} points</div>
        </div>
      )}
    </div>
  )
}
