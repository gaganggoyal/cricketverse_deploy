'use client'
import { useState, useRef, useEffect } from 'react'
import { Player } from '@/types'
import { searchPlayers } from '@/lib/supabase'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  { label: 'Best XI against spin', prompt: 'Build me the best XI from all available players specifically to tackle heavy spin conditions on a turning pitch in India.' },
  { label: 'Death over strategy', prompt: 'What is the best death over bowling strategy (overs 17-20) for a T20 chase of 185? Which bowlers and what field placements?' },
  { label: 'Rate my team', prompt: 'Analyse this team and give each player a rating 1-10 with a reason, then give the team an overall score and tactical weaknesses.' },
  { label: 'Best T20 World XI', prompt: 'Pick the best possible T20 World XI right now based on current form and recent sim performance data.' },
  { label: 'Chasing 200 in T20', prompt: 'My team needs to chase 200 in a T20. What batting order and strategy do you recommend?' },
  { label: 'Pitch tactic guide', prompt: 'Give me a complete tactical guide for batting and bowling on a green seaming pitch in England.' },
]

export default function CoachPage() {
  const [messages,   setMessages]  = useState<Message[]>([{
    role: 'assistant',
    content: `Welcome to your **AI Cricket Coach** 🏏\n\nI can help you with:\n• Team selection and player analysis\n• Batting and bowling tactics\n• Match situation strategy\n• Player vs condition matchups\n• Post-match analysis and improvement tips\n\nWhat would you like to work on today?`
  }])
  const [input,      setInput]     = useState('')
  const [loading,    setLoading]   = useState(false)
  const [myTeam,     setMyTeam]    = useState<Player[]>([])
  const [players,    setPlayers]   = useState<Player[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    searchPlayers({limit:50}).then(p => setPlayers(p as unknown as Player[])).catch(()=>{})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:'smooth'})
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    try {
      // Build context with player data and user's team
      const playerContext = myTeam.length > 0
        ? `\n\nUser's current team:\n${myTeam.map(p => `- ${p.name} (${p.country}): Bat avg ${p.bat_avg}, SR ${p.bat_sr}, ${p.role}${p.bowl_avg ? `, Bowl avg ${p.bowl_avg}` : ''}`).join('\n')}`
        : ''

      const systemPrompt = `You are an elite cricket coach and analyst with deep knowledge of all international players, tactics, conditions, and match strategy. You have access to the QuickCric AI match simulator where players perform based on their real career statistics.

Available player pool includes: Virat Kohli (avg 57.2), Rohit Sharma (avg 48.6), Jasprit Bumrah (bowl avg 20.7), Babar Azam (avg 57.1), Shaheen Afridi (bowl avg 22.1), Rashid Khan (bowl avg 13.8), Joe Root (avg 51.3), Pat Cummins (bowl avg 22.6), Mitchell Starc (bowl avg 21.4), Steve Smith (avg 60.1), Kane Williamson (avg 47.8), and 200+ more real cricketers with accurate stats.${playerContext}

Give tactical, specific, data-driven advice. Use real player stats. Be direct and decisive. Format with markdown for clarity.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1000,
          system:     systemPrompt,
          messages:   newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      const reply = data.content?.[0]?.text ?? 'I could not generate a response. Please try again.'

      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Unable to connect to AI coach. Please check your API key configuration.' }])
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• /gm, '→ ')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="min-h-screen bg-[var(--dark)] flex flex-col max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] bg-[var(--dark2)]">
        <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.15)] border border-[var(--gold)] flex items-center justify-center text-xl">
          🏏
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--cream)]">AI Cricket Coach</div>
          <div className="text-[10px] text-[var(--muted)]">Powered by Claude · Tactical expert</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <div className="text-[10px] text-[var(--muted)]">Online</div>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-3 border-b border-[var(--border)] overflow-x-auto">
        <div className="flex gap-2 w-max">
          {QUICK_PROMPTS.map(q => (
            <button
              key={q.label}
              onClick={() => sendMessage(q.prompt)}
              className="text-[10px] px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all whitespace-nowrap flex-shrink-0"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
            {m.role==='assistant' && (
              <div className="w-7 h-7 rounded-lg bg-[rgba(201,168,76,0.15)] border border-[var(--gold)] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">
                🏏
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role==='user'
                ? 'bg-[var(--pitch)] border border-[var(--pitch-light)] text-green-100 rounded-br-sm'
                : 'bg-[var(--card)] border border-[var(--border)] text-[rgba(245,240,232,0.85)] rounded-bl-sm'
            }`}
              dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }}
            />
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg bg-[rgba(201,168,76,0.15)] border border-[var(--gold)] flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">🏏</div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-bounce" style={{animationDelay:`${i*150}ms`}} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[var(--border)] bg-[var(--dark2)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask your coach anything..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)] disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-[var(--gold)] text-[var(--dark)] rounded-xl font-medium text-sm disabled:opacity-40 hover:bg-[var(--gold-light)] transition-all"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
