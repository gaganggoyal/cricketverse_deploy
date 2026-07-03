# 🚀 CricketVerse — Deployment Guide

## Fastest path: watch a match in 10 seconds (zero setup)
Open `frontend/public/match3d.html` directly in any browser.
The full 3D TV broadcast match works standalone — no server, no keys.

---

## Option 1 — Full stack locally with Docker (5 min)
```bash
cp .env.example .env        # fill in Supabase + Anthropic keys
docker compose up --build
# Frontend    → http://localhost:3000
# 3D match    → http://localhost:3000/watch
# Sim engine  → http://localhost:8000/health
# Multiplayer → http://localhost:8001/rooms/open
```

## Option 2 — Deploy to production (free tiers)

### A. Database — Supabase (free)
1. Create project at supabase.com
2. SQL Editor → run in order:
   `database/schema.sql` → `002_phase3.sql` → `003_phase4.sql` → `004_phase5.sql` → `005_match_history.sql`
3. Copy Project URL + anon key + service key

### B. Backend — Railway
```bash
npm i -g @railway/cli
railway login
railway init          # from repo root (railway.toml is already here)
railway up
# Set env vars in Railway dashboard: ANTHROPIC_API_KEY, CRICAPI_KEY,
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
```

### C. Frontend — Vercel
```bash
npm i -g vercel
cd frontend
vercel --prod
# Set env vars in Vercel dashboard (see .env.example for the full list)
# Point NEXT_PUBLIC_SIM_URL / NEXT_PUBLIC_MP_URL at your Railway URLs
```

### D. Stripe webhooks (only if using billing)
Stripe Dashboard → Webhooks → add endpoint:
`https://yourdomain.com/api/stripe/webhook`
Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

### E. Daily player sync (optional, needs CricAPI key)
```bash
cd sim-engine && CRICAPI_KEY=xxx python cricapi_sync.py
```

## Minimum env vars to boot
| Var | Needed for |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL / ANON_KEY | auth, DB, everything |
| ANTHROPIC_API_KEY | AI coach + commentary |
| Everything else | optional (Stripe, CricAPI, ElevenLabs) |

## CI/CD
Push to `main` → `.github/workflows/deploy.yml` runs tests → deploys
Railway + Vercel → health checks → Slack notify.
Add secrets: `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
