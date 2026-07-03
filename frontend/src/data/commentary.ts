// ─────────────────────────────────────────────────────────────────
// Original AI commentator personas — crisp, analytical, energetic in
// the style of Indian broadcast commentary, but fictional characters.
// Not modeled on or presented as any real broadcaster. Voice pick
// prefers Indian-English (en-IN) and Hindi (hi-IN) system voices.
//
// The line banks lean on iconic cricket-broadcast phrases fans know
// by heart ("like a tracer bullet", "remember the name", "dancing in
// the aisles") plus viral on-field stump-mic moments tied to specific
// players (see PLAYER_LINES).
// ─────────────────────────────────────────────────────────────────
import { CommentaryLang } from '@/types'

export const PERSONAS: Record<CommentaryLang, { name: string; voiceLang: string; tagline: string }> = {
  en: { name: 'Vikram Rao',      voiceLang: 'en-IN', tagline: 'Sharp, analytical, big on the big moments' },
  hi: { name: 'Rocky Bhatia',    voiceLang: 'hi-IN', tagline: 'हर बॉल पर जोश और जुनून' },
  pa: { name: 'Iqbal "Tiger" Gill', voiceLang: 'pa-IN', tagline: 'ਜੋਸ਼ ਨਾਲ ਭਰਪੂਰ ਕਮੈਂਟਰੀ' },
}

export const SIGNATURE_LINES: Record<CommentaryLang, {
  six: string[]; four: string[]; wicket: string[]; dot: string[]; fifty: string[]; century: string[]
}> = {
  en: {
    six: [
      'That ball has gone like a tracer bullet — into the crowd! Enormous!',
      'Remember the naaame! That is a monster hit, deep into the stands!',
      "It's all happening here! High into the night sky and GONE!",
      "They're dancing in the aisles! What a strike!",
      'Put your seatbelts on — that one has left the stadium!',
      'Bang! No half measures — deposited into the second tier!',
      'Up, up and away! The fielder is just a spectator there!',
      'That is HUGE! Picked the length early and launched it into orbit!',
    ],
    four: [
      'Cracked away — races to the fence like a tracer bullet!',
      'Shot, sir! Shot! Absolutely nothing wrong with that one!',
      'Threaded through the gap — placement over power, four runs!',
      'That is a proper cricket shot — head still, full face of the bat!',
      'Beautifully timed! The outfield does the rest!',
      'Pierces the field! No fielder in the world was stopping that!',
    ],
    wicket: [
      "Bowled 'im! The stumps are everywhere!",
      'GOT HIM! You beauty! The big wicket falls!',
      'GONE! The finger goes up and this crowd erupts!',
      'Timber! Right through the gate — you will not see a better ball today!',
      'Taken! The bowler roars — the plan comes together perfectly!',
      'That is OUT! Beaten by sheer skill — a huge moment in this game!',
    ],
    dot: [
      'Dot ball — tight line, nothing to work with.',
      'Oh, beaten! That one whistled past the outside edge!',
      'No run. The pressure keeps building here.',
      'Defended solidly. The battle within the battle continues.',
    ],
    fifty:  ['FIFTY! Raises the bat — an innings compiled with real craft!'],
    century: ['A HUNDRED! Take a bow — an innings of the very highest quality!'],
  },
  hi: {
    six: [
      'छक्का! गेंद स्टेडियम के बाहर — क्या शॉट है!',
      'हवा से बातें करती हुई — सीधा दर्शकों में! लंबा छक्का!',
      'मारा! बल्ले के बीचों-बीच — गगनचुंबी छक्का!',
      'ओ बल्ले बल्ले! ये गया, गया, गया — छह रन!',
      'क्या ताकत, क्या टाइमिंग! गेंदबाज़ बस देखता रह गया!',
      'गेंदबाज़ के सिर के ऊपर से — शानदार छक्का!',
    ],
    four: [
      'चौका! मक्खन जैसी टाइमिंग — गेंद सीमा रेखा के पार!',
      'करारा शॉट! फील्डर की कोई गुंजाइश नहीं — चार रन!',
      'गैप में से — बिजली की रफ़्तार से बाउंड्री!',
      'क्लासिक शॉट! दर्शकों में जोश — चार रन पक्के!',
      'फील्डर सिर्फ देखता रह गया — चौका!',
    ],
    wicket: [
      'आउट!! स्टंप्स हवा में — क्या गेंद डाली है!',
      'गया! बड़ी मछली फंस गई!',
      'बोल्ड! गिल्लियां उड़ गईं — स्टेडियम में सन्नाटा!',
      'कैच आउट! दबाव का नतीजा — बड़ा विकेट गिरा!',
      'गेंदबाज़ की चाल कामयाब — आउट!',
    ],
    dot: [
      'डॉट बॉल — कसी हुई गेंदबाज़ी।',
      'ओहो! बाल-बाल बचे — गेंद बल्ले के पास से निकली!',
      'कोई रन नहीं। दबाव बढ़ता जा रहा है।',
      'बल्लेबाज़ ने संभलकर खेला।',
    ],
    fifty:  ['अर्धशतक! बल्ला उठा — शानदार पारी!'],
    century: ['शतक!! क्या यादगार पारी — पूरा स्टेडियम खड़ा है!'],
  },
  pa: {
    six: [
      'ਇਹ ਗਿਆ! ਜ਼ਬਰਦਸਤ ਛੱਕਾ — ਸਟੇਡੀਅਮ ਤੋਂ ਬਾਹਰ!',
      'ਸਿੱਧਾ ਸਟੈਂਡ ਵਿੱਚ — ਛੱਕਾ! ਕੀ ਤਾਕਤ!',
      'ਬੱਲੇ ਬੱਲੇ! ਛੇ ਦੌੜਾਂ — ਗੇਂਦ ਹਵਾ ਨਾਲ ਗੱਲਾਂ ਕਰਦੀ ਗਈ!',
      'ਓਏ ਹੋਏ! ਗੇਂਦਬਾਜ਼ ਦੇ ਸਿਰ ਉੱਤੋਂ — ਛੱਕਾ!',
    ],
    four: [
      'ਚੌਕਾ! ਬਹੁਤ ਵਧੀਆ ਸ਼ਾਟ — ਮੱਖਣ ਵਰਗੀ ਟਾਈਮਿੰਗ!',
      'ਸਿੱਧਾ ਬਾਊਂਡਰੀ ਪਾਰ — ਚੌਕਾ!',
      'ਕਮਾਲ ਦਾ ਚੌਕਾ! ਫੀਲਡਰ ਵੇਖਦਾ ਰਹਿ ਗਿਆ!',
    ],
    wicket: [
      'ਆਊਟ!! ਵੱਡੀ ਵਿਕਟ — ਸਟੰਪਾਂ ਖਿੱਲਰ ਗਈਆਂ!',
      'ਗਿਆ! ਗੇਂਦਬਾਜ਼ ਦੀ ਚਾਲ ਕਾਮਯਾਬ!',
      'ਕਮਾਲ ਦੀ ਗੇਂਦ — ਆਊਟ! ਪੂਰਾ ਸਟੇਡੀਅਮ ਗੂੰਜ ਉੱਠਿਆ!',
    ],
    dot: [
      'ਡਾਟ ਬਾਲ। ਵਧੀਆ ਗੇਂਦਬਾਜ਼ੀ।',
      'ਕੋਈ ਦੌੜ ਨਹੀਂ — ਸਖ਼ਤ ਲਾਈਨ।',
      'ਓਹੋ! ਗੇਂਦ ਬੱਲੇ ਦੇ ਕੋਲੋਂ ਲੰਘੀ!',
    ],
    fifty:  ['ਅਰਧ ਸੈਂਕੜਾ! ਬੱਲੇ ਬੱਲੇ!'],
    century: ['ਸੈਂਕੜਾ! ਕਮਾਲ ਦੀ ਪਾਰੀ!'],
  },
}

// ─────────────────────────────────────────────────────────────────
// Viral on-field moments & signature hype, tied to specific players —
// the stump-mic lines and catchphrases every Indian cricket fan knows.
// `six` fires when that player hits one; `banter` drops in occasionally
// on quiet balls while the player is batting or bowling.
// Missing languages fall back hi → en (the viral lines ARE Hindi).
// ─────────────────────────────────────────────────────────────────
type LangLines = Partial<Record<CommentaryLang, string[]>>

export const PLAYER_LINES: Record<string, { six?: LangLines; banter?: LangLines }> = {
  'Rohit Sharma': {
    six: {
      en: ['The Hitman special! Rohit just leans into it and the ball disappears into the stands!'],
      hi: ['हिटमैन का अंदाज़! रोहित ने बस टच किया — और गेंद स्टैंड्स में!'],
    },
    banter: {
      en: ['The stump mic catches Rohit — "Garden mein ghumne aaye ho kya?!" — the captain is not amused!'],
      hi: ['स्टंप माइक पर रोहित की आवाज़ — "गार्डन में घूमने आए हो क्या?!" — कप्तान का गुस्सा साफ सुनाई दे रहा है!'],
    },
  },
  'MS Dhoni': {
    six: {
      en: ['Dhoni finishes off in style! That is the helicopter — miles into the crowd!'],
      hi: ['धोनी फिनिशेस ऑफ इन स्टाइल! हेलीकॉप्टर शॉट — गेंद दर्शकों में!'],
    },
    banter: {
      en: ['You can hear Dhoni behind the stumps — "Le le le le!" — always talking, always three steps ahead!'],
      hi: ['विकेट के पीछे से माही की आवाज़ — "ले ले ले ले!" — धोनी हमेशा तीन कदम आगे!'],
    },
  },
  'Virat Kohli': {
    six: {
      en: ['KING KOHLI! The chase master stands and delivers — that is majestic!'],
      hi: ['किंग कोहली! क्या शानदार छक्का — बादशाह अपने पूरे रंग में!'],
    },
    banter: {
      en: ['Kohli is pumped! You can hear him from the boundary rope — the intensity never drops!'],
      hi: ['कोहली का जोश देखिए! मैदान पर आग लगा दी है — हर गेंद पर जुनून!'],
    },
  },
  'Jasprit Bumrah': {
    banter: {
      en: ['Bumrah at the top of his run-up — batters around the world have nightmares about those yorkers!'],
      hi: ['बुमराह अपने रन-अप पर — उनकी यॉर्कर के आगे बड़े-बड़े बल्लेबाज़ पानी मांगते हैं!'],
    },
  },
  'Hardik Pandya': {
    six: {
      en: ['Hardik Pandya — BANG! Flat, brutal, and deep into the crowd!'],
      hi: ['हार्दिक पांड्या — धमाका! गेंद सीधा दर्शकों में!'],
    },
  },
}

const pickFrom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function langLines(lines: LangLines | undefined, lang: CommentaryLang): string[] | null {
  if (!lines) return null
  const arr = lines[lang] ?? (lang === 'pa' ? lines.hi : undefined) ?? lines.en
  return arr && arr.length ? arr : null
}

// Signature six call for a named player, if we have one.
export function playerSixLine(lang: CommentaryLang, batter?: string): string | null {
  const arr = batter ? langLines(PLAYER_LINES[batter]?.six, lang) : null
  return arr ? pickFrom(arr) : null
}

// Occasional viral stump-mic moment for whoever is batting or bowling.
export function playerBanterLine(lang: CommentaryLang, batter?: string, bowler?: string): string | null {
  for (const name of [batter, bowler]) {
    const arr = name ? langLines(PLAYER_LINES[name]?.banter, lang) : null
    if (arr) return pickFrom(arr)
  }
  return null
}
