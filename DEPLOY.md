# 🚀 QuickCric — Deployment Guide

## Fastest path: watch a match in 10 seconds (zero setup)
Open `frontend/public/match3d.html` directly in any browser.
The full 3D TV broadcast match works standalone — no server, no keys.

---

## Local development (Docker)
```bash
cp .env.example .env        # fill in Supabase + Anthropic keys
bash start.sh               # or: docker compose up -d --build
# Frontend    → http://localhost:3000
# 3D match    → http://localhost:3000/watch
# Sim engine  → http://localhost:8000/health
# Multiplayer → http://localhost:8001/rooms/open
```
Source is volume-mounted with hot reload — no rebuild needed for code
changes.

## Production (VPS · quickcric.online)
See **[DEPLOY-VPS.md](DEPLOY-VPS.md)** — the full step-by-step for the
Contabo VPS: DNS, firewall, `.env`, Caddy HTTPS, launch and redeploy.

## Database — Supabase
1. Create project at supabase.com
2. SQL Editor → run in order:
   `database/schema.sql` → `002_phase3.sql` → `003_phase4.sql` → `004_phase5.sql` → `005_match_history.sql`
3. Copy Project URL + anon key + service key into `.env`
4. Authentication → URL Configuration: set Site URL + redirect URL to
   your domain (see DEPLOY-VPS.md §3)

## Stripe webhooks (only if using billing)
Stripe Dashboard → Webhooks → add endpoint:
`https://quickcric.online/api/stripe/webhook`
Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`

## Daily player sync (optional, needs CricAPI key)
```bash
cd sim-engine && CRICAPI_KEY=xxx python cricapi_sync.py
```

## Minimum env vars to boot
| Var | Needed for |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL / ANON_KEY | auth, DB, everything |
| ANTHROPIC_API_KEY | AI coach + commentary |
| Everything else | optional (Stripe, CricAPI, ElevenLabs) |
