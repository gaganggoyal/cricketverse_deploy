'use client'
/**
 * QuickCric Voice Commentary
 * ─────────────────────────────
 * Three-tier audio system:
 *  1. Browser Web Speech API (free, instant, any device)
 *  2. ElevenLabs API (premium — realistic cricket commentator voice)
 *  3. Pre-generated audio clips for signature moments (six, wicket, boundary)
 *
 * Commentary style: Ravi Shastri / Ian Bishop energy —
 *   dramatic pauses, "THAT IS GONE!", rising intonation on sixes.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { CommentaryLang } from '@/types'
import { SIGNATURE_LINES, PERSONAS, playerSixLine, playerBanterLine } from '@/data/commentary'

export type VoiceProvider = 'browser' | 'elevenlabs' | 'off'

interface VoiceConfig {
  provider:    VoiceProvider
  volume:      number       // 0–1
  rate:        number       // 0.8–1.4
  pitch:       number       // 0.8–1.2
  apiKey?:     string       // ElevenLabs key
  voiceId?:    string       // ElevenLabs voice ID
}

const DEFAULT_CONFIG: VoiceConfig = {
  provider: 'browser',
  volume:   0.85,
  rate:     1.05,
  pitch:    0.95,
}

export function useVoiceCommentary(config: Partial<VoiceConfig> = {}) {
  const cfg        = { ...DEFAULT_CONFIG, ...config }
  const synthRef   = useRef<SpeechSynthesis | null>(null)
  const queueRef   = useRef<string[]>([])
  const speaking   = useRef(false)
  const [enabled,  setEnabled]  = useState(true)
  const [provider, setProvider] = useState<VoiceProvider>(cfg.provider)
  const [voices,   setVoices]   = useState<SpeechSynthesisVoice[]>([])
  const [selVoice, setSelVoice] = useState<string>('')
  const [lang,     setLang]     = useState<CommentaryLang>('en')

  useEffect(() => {
    if (typeof window === 'undefined') return
    synthRef.current = window.speechSynthesis
    const loadVoices = () => {
      const v = synthRef.current?.getVoices() ?? []
      setVoices(v)
    }
    loadVoices()
    synthRef.current?.addEventListener('voiceschanged', loadVoices)

    // Chrome drops speak() calls until the page has received a user gesture,
    // and can leave the synth wedged in a paused state. Claim activation with
    // a silent utterance on the first tap/keypress anywhere.
    const unlock = () => {
      try {
        synthRef.current?.resume()
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        synthRef.current?.speak(u)
      } catch { /* not supported — nothing to unlock */ }
    }
    document.addEventListener('pointerdown', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })

    return () => {
      synthRef.current?.removeEventListener('voiceschanged', loadVoices)
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [])

  // Re-pick the closest available voice whenever language or voice list changes.
  // Punjabi (pa-IN) system voices are rare — falls back to Hindi, then English.
  useEffect(() => {
    if (!voices.length) return
    const wanted = PERSONAS[lang].voiceLang
    const pref = voices.find(x => x.lang === wanted)
      ?? voices.find(x => x.lang.startsWith(wanted.split('-')[0]))
      ?? (lang === 'pa' ? voices.find(x => x.lang.startsWith('hi')) : undefined)
      ?? voices.find(x => x.lang.startsWith('en'))
      ?? voices[0]
    if (pref) setSelVoice(pref.voiceURI)
  }, [lang, voices])

  const speakBrowser = useCallback((text: string) => {
    if (!synthRef.current || !enabled) return
    if (synthRef.current.paused) synthRef.current.resume()
    const utt = new SpeechSynthesisUtterance(text)
    utt.volume = cfg.volume
    utt.rate   = cfg.rate
    utt.pitch  = cfg.pitch
    if (selVoice) {
      const v = voices.find(x => x.voiceURI === selVoice)
      if (v) utt.voice = v
    }
    utt.onend   = () => { speaking.current = false; processQueue() }
    utt.onerror = () => { speaking.current = false; processQueue() }
    speaking.current = true
    synthRef.current.speak(utt)
  }, [enabled, cfg, selVoice, voices])

  const speakElevenLabs = useCallback(async (text: string) => {
    if (!cfg.apiKey || !enabled) return
    try {
      const voiceId = cfg.voiceId ?? 'pNInz6obpgDQGcFmaJgB' // Adam — deep broadcast voice
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'xi-api-key':   cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.45, similarity_boost: 0.82, style: 0.35, use_speaker_boost: true },
        }),
      })
      if (!res.ok) { speakBrowser(text); return }
      const blob   = await res.blob()
      const url    = URL.createObjectURL(blob)
      const audio  = new Audio(url)
      audio.volume = cfg.volume
      audio.onended = () => { speaking.current = false; URL.revokeObjectURL(url); processQueue() }
      speaking.current = true
      audio.play()
    } catch { speakBrowser(text) }
  }, [cfg, enabled, speakBrowser])

  const processQueue = useCallback(() => {
    if (speaking.current || queueRef.current.length === 0) return
    const text = queueRef.current.shift()!
    if (provider === 'elevenlabs' && cfg.apiKey) speakElevenLabs(text)
    else speakBrowser(text)
  }, [provider, cfg.apiKey, speakBrowser, speakElevenLabs])

  const speak = useCallback((text: string, priority = false) => {
    if (!enabled || provider === 'off') return
    if (priority) {
      synthRef.current?.cancel()
      queueRef.current = [text]
      speaking.current = false
    } else {
      // Spoken lines are slower than the ball cadence. Keep at most ONE
      // pending line — a newer ball's line replaces a stale unspoken one,
      // so the voice never drifts behind the written commentary.
      queueRef.current = [text]
    }
    processQueue()
  }, [enabled, provider, processQueue])

  // Exactly ONE spoken line per ball — big moments use the signature bank
  // (with priority, cutting off any stale line), everything else reads the
  // sim's commentary (English) or a localized line (Hindi/Punjabi).
  const speakBallEvent = useCallback((outcome: string, commentary: string, extra?: {
    batter?: string; bowler?: string; runs?: number; wickets?: number; overs?: string
  }) => {
    if (!enabled) return
    const bank = SIGNATURE_LINES[lang]
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

    if (outcome === '6') {
      // Star batters get their signature call half the time ("Dhoni
      // finishes off in style!"), the energetic bank otherwise.
      const special = Math.random() < 0.5 ? playerSixLine(lang, extra?.batter) : null
      speak(special ?? pick(bank.six), true)
    }
    else if (outcome === '4') speak(pick(bank.four), true)
    else if (outcome === 'W') speak(pick(bank.wicket), true)
    else {
      // Quiet balls occasionally surface a viral stump-mic moment
      // ("garden mein ghumne aaye ho kya?!") instead of routine lines.
      const banter = Math.random() < 0.12 ? playerBanterLine(lang, extra?.batter, extra?.bowler) : null
      if (banter)             speak(banter)
      else if (lang === 'en') speak(commentary)
      else                    speak(pick(bank.dot))
    }
  }, [enabled, speak, lang])

  const announceInningsBreak = useCallback((score: number, wickets: number, target: number) => {
    const text = lang === 'hi' ? `पारी का ब्रेक! लक्ष्य है ${target} रन। स्कोर ${score}/${wickets}।`
      : lang === 'pa' ? `ਪਾਰੀ ਦਾ ਬ੍ਰੇਕ! ਟੀਚਾ ਹੈ ${target} ਦੌੜਾਂ। ਸਕੋਰ ${score}/${wickets}।`
      : `Innings break! The batting side set a target of ${target} runs. ${score} for ${wickets}. What a contest this could be!`
    speak(text, true)
  }, [speak, lang])

  const announceResult = useCallback((winner: string, margin: string) => {
    const text = lang === 'hi' ? `और मैच खत्म! ${winner} जीता ${margin} से! शानदार मुकाबला!`
      : lang === 'pa' ? `ਤੇ ਮੈਚ ਖਤਮ! ${winner} ਜਿੱਤਿਆ ${margin} ਨਾਲ! ਬੱਲੇ ਬੱਲੇ!`
      : `AND THAT IS THE MATCH! ${winner} wins by ${margin}! What a brilliant game of cricket!`
    speak(text, true)
  }, [speak, lang])

  const stop = useCallback(() => {
    synthRef.current?.cancel()
    queueRef.current = []
    speaking.current = false
  }, [])

  return {
    enabled, setEnabled,
    provider, setProvider,
    voices, selVoice, setSelVoice,
    lang, setLang,
    speak, speakBallEvent,
    announceInningsBreak, announceResult,
    stop,
  }
}

// ── Voice settings panel component ────────────────────────────────
import React from 'react'

export function VoiceSettingsPanel({
  hook,
  apiKey,
  onApiKeyChange,
}: {
  hook: ReturnType<typeof useVoiceCommentary>
  apiKey: string
  onApiKeyChange: (k: string) => void
}) {
  const { enabled, setEnabled, provider, setProvider, voices, selVoice, setSelVoice, lang, setLang } = hook

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--cream)]">Voice commentary</div>
          <div className="text-[10px] text-[var(--muted)]">Live AI narration of every ball</div>
        </div>
        <button
          onClick={() => setEnabled(e => !e)}
          className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-[var(--gold)]' : 'bg-[var(--border)]'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Commentator / language */}
          <div>
            <div className="text-xs text-[var(--muted)] mb-2">Commentator</div>
            <div className="flex gap-2">
              {(['en','hi','pa'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${lang === l ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)]' : 'border-[var(--border)] text-[var(--muted)]'}`}
                >
                  {PERSONAS[l].name}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-[var(--muted)] mt-1.5">{PERSONAS[lang].tagline}</div>
          </div>

          {/* Provider */}
          <div>
            <div className="text-xs text-[var(--muted)] mb-2">Voice engine</div>
            <div className="flex gap-2">
              {([['browser','Browser (free)'],['elevenlabs','ElevenLabs (premium)']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setProvider(k)}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${provider === k ? 'border-[var(--gold)] text-[var(--gold)] bg-[rgba(22,115,199,0.08)]' : 'border-[var(--border)] text-[var(--muted)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Browser voice select */}
          {provider === 'browser' && voices.length > 0 && (
            <div>
              <div className="text-xs text-[var(--muted)] mb-1.5">Commentator voice</div>
              <select
                value={selVoice}
                onChange={e => setSelVoice(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg text-xs text-[var(--cream)] outline-none"
              >
                {voices
                  .filter(v => v.lang.startsWith(lang === 'pa' ? 'pa' : lang === 'hi' ? 'hi' : 'en') || v.lang.startsWith('en'))
                  .map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
              </select>
            </div>
          )}

          {/* ElevenLabs key */}
          {provider === 'elevenlabs' && (
            <div>
              <div className="text-xs text-[var(--muted)] mb-1.5">ElevenLabs API key</div>
              <input
                type="password"
                value={apiKey}
                onChange={e => onApiKeyChange(e.target.value)}
                placeholder="xi-..."
                className="w-full px-3 py-2 bg-[var(--dark2)] border border-[var(--border)] rounded-lg text-xs text-[var(--cream)] placeholder-[var(--muted)] outline-none focus:border-[var(--border-hi)]"
              />
              <div className="text-[9px] text-[var(--muted)] mt-1">
                Get key at elevenlabs.io · ~$5/mo for 10k characters
              </div>
            </div>
          )}

          <button
            onClick={() => hook.speak('Welcome to QuickCric. The toss has been done. Let play begin!', true)}
            className="w-full py-2 border border-[var(--border)] text-xs text-[var(--muted)] rounded-lg hover:text-[var(--cream)] hover:border-[var(--border-hi)] transition-all"
          >
            Test voice
          </button>
        </>
      )}
    </div>
  )
}
