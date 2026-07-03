let audioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null
let unlockListenerAdded = false

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  // Autoplay policy keeps the context suspended until a user gesture on THIS
  // page — with auto-play mode the user may never click, so hook the first
  // tap/keypress anywhere to unlock sound.
  if (!unlockListenerAdded) {
    unlockListenerAdded = true
    const unlock = () => { audioCtx?.resume().catch(() => {}) }
    document.addEventListener('pointerdown', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
  }
  return audioCtx
}

// A couple of seconds of white noise, reused and filtered differently per
// event — this is what makes the "crowd" texture instead of a buzzy tone.
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const len = ctx.sampleRate * 2.5
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return buf
}

// Filtered-noise "crowd" swell — attack/decay envelope, no tonal buzz.
function crowdSwell(ctx: AudioContext, { duration, peakGain, filterFreq, filterQ = 0.7 }: {
  duration: number; peakGain: number; filterFreq: number; filterQ?: number
}) {
  const src = ctx.createBufferSource()
  src.buffer = getNoiseBuffer(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = filterQ
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + duration * 0.15)
  gain.gain.linearRampToValueAtTime(peakGain * 0.6, ctx.currentTime + duration * 0.55)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
  src.start(ctx.currentTime)
  src.stop(ctx.currentTime + duration)
}

// Short percussive "bat on ball" click — a fast pitch-drop blip, not a buzz.
function batHit(ctx: AudioContext, strength = 1) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1200 * strength, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.09)
  gain.gain.setValueAtTime(0.25 * strength, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1)
}

// Low, dull "stumps rattling" thud for a wicket.
function wicketThud(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(140, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25)
  gain.gain.setValueAtTime(0.22, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
  osc.connect(gain); gain.connect(ctx.destination)
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
}

export function playCrowdReaction(outcome: '6' | '4' | 'W' | '0' | string) {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    if (outcome === '6') {
      batHit(ctx, 1.3)
      crowdSwell(ctx, { duration: 2.6, peakGain: 0.5, filterFreq: 1400, filterQ: 0.6 })
    } else if (outcome === '4') {
      batHit(ctx, 1.1)
      crowdSwell(ctx, { duration: 1.6, peakGain: 0.35, filterFreq: 1600, filterQ: 0.8 })
    } else if (outcome === 'W') {
      wicketThud(ctx)
      setTimeout(() => crowdSwell(ctx, { duration: 1.4, peakGain: 0.3, filterFreq: 900, filterQ: 0.9 }), 150)
    } else if (Number(outcome) > 0) {
      batHit(ctx, 0.7)
    }
    // Dot balls stay silent — matches a real broadcast, and avoids a click on every delivery.
  } catch {
    // Web Audio unsupported/blocked — silently skip, it's a cosmetic touch.
  }
}
