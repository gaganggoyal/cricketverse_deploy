# 🏏 CricketVerse — AI Cricket Match Simulator

> **Why wait for real matches? Build your own with real players, real stats, AI-powered simulation, and a live 3D stadium.**

**Live at [quickcric.online](https://quickcric.online)** — playable in the
browser right now.

> Built AI-first, and openly so — AI pair-programming is how one person ships
> a 3D game, a physics sim and a realtime backend solo. Every design call
> (what gets simulated, how, and what it costs) was mine.
> [More ↓](#how-one-person-built-this) · Portfolio:
> [gagan.indiaoffers.in](https://gagan.indiaoffers.in)

---

## What is CricketVerse?

CricketVerse lets you pick any 11 from 200+ real international cricketers, choose a stadium and conditions, then watch a fully animated AI-driven ball-by-ball match — simulated from actual career statistics.

- Bumrah's yorker lands where his real stats say it should
- Kohli's cover drive fires based on his actual strike rate
- Rashid's googly deceives based on his real bowling average
- Every delivery accounts for pitch, weather, stamina, pressure index, over phase

---

## Full feature list

| Feature | Description |
|---|---|
| 🏏 Match simulator | Ball-by-ball AI engine using real career stats |
| 🏟️ 3D Babylon.js stadium | Floodlights, crowd, animated players, ball physics |
| 🎙️ Voice commentary | Browser TTS or ElevenLabs realistic voice |
| ⚔️ Multiplayer | 2-player rooms with live chat and emoji reactions |
| 🧙 Fantasy XI | Draft team, captain/VC multipliers, live points |
| 🏆 Tournament mode | Round robin, knockout, group stage |
| 🎯 AI Coach | Claude-powered tactical assistant |
| 📊 Analytics | Wagon wheel, radar charts, win/loss trends |
| 🔔 Notifications | Real-time Supabase push notifications |
| 🏅 Achievements | 12 unlockable badges |
| 💳 Billing | Stripe Free / Pro (₹299) / Elite (₹799) |
| 📱 Mobile | PWA + Capacitor iOS/Android wrapper |
| 🔗 Share replays | Public shareable match links |

---

## Project structure

```
cricketverse/
│
├── sim-engine/                    ← Python simulation backend
│   ├── simulator.py               ← Core ball-by-ball engine (THE BRAIN)
│   ├── server.py                  ← FastAPI REST + WebSocket (single player)
│   ├── cricapi_sync.py            ← Real player stats sync from CricAPI
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── multiplayer/
│   │   └── server.py              ← Socket.io multiplayer room server
│   └── tests/
│       └── test_simulator.py      ← 19 unit tests (all passing)
│
├── frontend/                      ← Next.js 14 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           ← Landing / home page
│   │   │   ├── layout.tsx         ← Root layout + SEO metadata
│   │   │   ├── globals.css        ← Design tokens + Tailwind base
│   │   │   ├── sitemap.ts         ← Auto-generated sitemap
│   │   │   ├── setup/page.tsx     ← 6-step match builder wizard
│   │   │   ├── match/[matchId]/page.tsx   ← Live 3D match viewer
│   │   │   ├── result/[matchId]/page.tsx  ← Post-match + AI analysis
│   │   │   ├── dashboard/page.tsx ← User dashboard + match history
│   │   │   ├── billing/page.tsx   ← Stripe pricing + checkout
│   │   │   ├── leaderboard/page.tsx ← Global stats leaderboard
│   │   │   ├── multiplayer/page.tsx ← 2-player room lobby + match
│   │   │   ├── fantasy/page.tsx   ← Fantasy XI builder + live points
│   │   │   ├── coach/page.tsx     ← Claude AI tactical coach chat
│   │   │   ├── tournament/page.tsx ← Tournament builder + fixtures
│   │   │   ├── analytics/page.tsx ← Charts, wagon wheel, trends
│   │   │   ├── admin/page.tsx     ← Admin dashboard (protected)
│   │   │   ├── player/[id]/page.tsx ← Player profile + career stats
│   │   │   ├── share/[token]/page.tsx ← Public match replay link
│   │   │   ├── referral/page.tsx  ← Referral system + credits
│   │   │   ├── auth/login/page.tsx ← Google OAuth + email auth
│   │   │   ├── auth/callback/route.ts ← OAuth callback handler
│   │   │   ├── [type]/page.tsx    ← Privacy + Terms pages
│   │   │   └── api/
│   │   │       ├── stripe/checkout/route.ts  ← Stripe checkout session
│   │   │       ├── stripe/webhook/route.ts   ← Stripe webhook handler
│   │   │       └── admin/sync-players/route.ts ← Admin CricAPI sync
│   │   │
│   │   ├── components/
│   │   │   ├── match/
│   │   │   │   ├── MatchEngine3D.tsx    ← Babylon.js 3D engine class
│   │   │   │   ├── ScoreHUD.tsx         ← Live scoreboard + commentary HUD
│   │   │   │   └── VoiceCommentary.tsx  ← TTS voice commentary system
│   │   │   ├── notifications/
│   │   │   │   └── NotificationSystem.tsx ← Realtime bell + toasts
│   │   │   └── ui/
│   │   │       └── GlobalNav.tsx        ← Desktop + mobile nav bar
│   │   │
│   │   ├── hooks/
│   │   │   └── useMatchWebSocket.ts     ← WebSocket connection hook
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts      ← Supabase client + all DB queries
│   │   │   ├── store.ts         ← Zustand global state (setup + match)
│   │   │   └── analytics.ts     ← Event tracker + admin analytics
│   │   │
│   │   ├── middleware.ts         ← Auth route protection
│   │   └── types/index.ts        ← Shared TypeScript types
│   │
│   ├── public/manifest.json      ← PWA manifest
│   ├── capacitor.config.json     ← iOS/Android config
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── database/
│   ├── schema.sql               ← Phase 1: Core tables + 30 seed players
│   ├── 002_phase3.sql           ← Phase 3: Stripe, form tracking, share tokens
│   ├── 003_phase4.sql           ← Phase 4: Tournaments, fantasy, multiplayer, achievements
│   └── 004_phase5.sql           ← Phase 5: Feature flags, analytics, referrals, materialized views
│
├── deployment/
│   └── vps/Caddyfile            ← Production reverse proxy + auto-HTTPS (quickcric.online)
│
├── docker-compose.yml           ← Dev stack: sim + multiplayer + frontend + redis
├── docker-compose.prod.yml      ← Production stack for the VPS (adds Caddy)
├── DEPLOY-VPS.md                ← Step-by-step production deployment guide
├── .env.example                 ← All required environment variables
├── start.sh                     ← One-command startup script
└── README.md                    ← This file
```

---

## Quick start

### Option A — Docker (recommended, everything in one command)

```bash
git clone https://github.com/yourusername/cricketverse
cd cricketverse

# 1. Set up environment
cp .env.example .env
# Edit .env and fill in: Supabase URL/keys + ANTHROPIC_API_KEY (minimum required)

# 2. Run database migrations in Supabase SQL editor (supabase.com → your project → SQL editor)
# Run in order: database/schema.sql → 002_phase3.sql → 003_phase4.sql → 004_phase5.sql

# 3. Start everything
docker compose up --build

# Frontend: http://localhost:3000
# Sim engine: http://localhost:8000/health
# Multiplayer: http://localhost:8001/rooms/open
```

### Option B — Manual (faster for development)

**Terminal 1 — Sim engine:**
```bash
cd sim-engine
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

**Terminal 2 — Multiplayer server:**
```bash
cd sim-engine
uvicorn multiplayer.server:app --reload --port 8001
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

---

## Database setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your project dashboard
3. Run the migration files **in order**:
   - `database/schema.sql` — core tables + 30 seed players
   - `database/002_phase3.sql` — Stripe billing, form tracking
   - `database/003_phase4.sql` — tournaments, fantasy, multiplayer, achievements
   - `database/004_phase5.sql` — analytics, feature flags, referrals
4. Copy your **Project URL** and **anon key** into `.env`

---

## Required API keys

| Service | Purpose | Get it |
|---|---|---|
| **Supabase** | Database + auth + realtime | [supabase.com](https://supabase.com) — free |
| **Anthropic** | AI commentary + AI Coach | [console.anthropic.com](https://console.anthropic.com) |
| **CricAPI** | Real player stats | [cricapi.com](https://cricapi.com) — 100 req/day free |
| **Stripe** | Billing (optional) | [stripe.com](https://stripe.com) |
| **ElevenLabs** | Premium voice (optional) | [elevenlabs.io](https://elevenlabs.io) |

**Minimum to run:** Supabase + Anthropic API key only. Everything else is optional.

---

## How the simulation works

Every ball is computed from real player data:

```
P(wicket) = base(0.072)
  × batter_avg_factor      (Kohli avg 57 → lower wicket chance)
  × bowler_avg_factor      (Bumrah avg 20.7 → higher wicket chance)
  × bat_style              (aggressive → more 6s AND more wickets)
  × stamina_decay          (tired batter → rash shot more likely)
  × pressure_index         (chasing 20 off 1 ball → extreme factor)
  × pitch_modifier         (seam pitch → 1.15×, flat → 0.88×)
  × time_modifier          (overcast → swing factor 1.30×)
  × over_phase             (death overs → 1.08× for all)
```

**Ball event payload** (sent live to frontend per delivery):
```json
{
  "outcome":      "6",
  "runs":         6,
  "batter":       "Virat Kohli",
  "bowler":       "Shaheen Afridi",
  "speed_kmh":    144,
  "delivery":     "In-swinger",
  "commentary":   "SIX! Kohli launches Shaheen way over the long-on boundary!",
  "animation_key":"lofted_drive_six",
  "landing":      { "x": 18.4, "z": 28.2 },
  "pressure":     0.72,
  "score":        184,
  "wickets":      3
}
```

---

## Running tests

```bash
cd sim-engine
pip install pytest pytest-asyncio
python -m pytest tests/ -v

# Expected: 19 passed ✓
```

---

## Deploy to production

The whole stack runs on a single VPS behind Caddy (automatic HTTPS) —
see **[DEPLOY-VPS.md](DEPLOY-VPS.md)** for the full walkthrough:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Stripe webhooks (production):**
```bash
stripe listen --forward-to https://yourdomain.com/api/stripe/webhook
```

**CricAPI player sync (run daily via cron):**
```bash
cd sim-engine
CRICAPI_KEY=your_key python cricapi_sync.py
```

---

## Mobile (iOS + Android)

```bash
cd frontend
npm run build
npx next export          # static export

npx cap add ios
npx cap add android
npx cap sync

npx cap open ios         # opens Xcode → Archive → App Store
npx cap open android     # opens Android Studio → Build → APK
```

---

## Pricing model

| Plan | Price | Matches | Features |
|---|---|---|---|
| **Free** | ₹0 | 5/month | T20, T10, basic 3D, commentary |
| **Pro** | ₹299/mo | Unlimited | All formats, all stadiums, AI analysis, history |
| **Elite** | ₹799/mo | Unlimited | Multiplayer, fantasy, AI coach, tournaments |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| 3D Engine | Babylon.js 6 with Havok physics |
| State | Zustand |
| Sim Engine | Python 3.12, FastAPI, uvicorn |
| Realtime | WebSocket (FastAPI + Socket.io) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (Google OAuth + email) |
| AI | Claude API (Anthropic) |
| Billing | Stripe |
| Voice | Web Speech API + ElevenLabs |
| Deploy | Vercel (frontend) + Railway (backend) |
| Mobile | Capacitor (iOS + Android) |
| CI/CD | GitHub Actions |

---

## How one person built this

No pretending otherwise: this was built with AI pair-programming, a workflow
I trained myself in — it's the only way a solo builder ships a Babylon.js
stadium, a Python simulation engine and a realtime multiplayer backend in
one project. The judgment calls, though, don't come from any scaffold:

- **Stats drive everything** — the rule that Bumrah's yorker, Kohli's strike
  rate and Rashid's googly must behave like their *real* career numbers is
  the product thesis. A generic sim rolls dice; this one respects the
  scorecard.
- **Pressure index, stamina, pitch and weather** made the cut because
  they're what actually decides real matches — a cricket watcher's call,
  not a template's.
- **The pricing tiers** are an operator's decision about what's free and
  what's worth ₹299 — I've priced digital products for a decade.

Built to learn by shipping something people actually play. The whole stack
is here to read.

---

**Gagandeep Goyal** — e-commerce operator and solo builder; ships web
products and AI agents end to end. Portfolio:
[gagan.indiaoffers.in](https://gagan.indiaoffers.in) · GitHub:
[@gaganggoyal](https://github.com/gaganggoyal)
