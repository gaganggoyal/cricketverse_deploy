# 🚀 QuickCric — Deployment Guide

## Fastest path: watch a match in 10 seconds (zero setup)
Open `frontend/public/match3d.html` directly in any browser.
The full 3D TV broadcast match works standalone — no server, no keys.

---

## Local development (Docker)
```bash
cp .env.example .env        # fill in DB_* + Anthropic keys
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

## Database — self-hosted MySQL 8
1. Create the database and user:
   ```bash
   mysql -e "CREATE DATABASE quickcric CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
             CREATE USER 'quickcric'@'localhost' IDENTIFIED BY 'a-strong-password';
             GRANT ALL PRIVILEGES ON quickcric.* TO 'quickcric'@'localhost';"
   ```
2. Apply the schema, then the seed data:
   ```bash
   mysql -u quickcric -p quickcric < database/mysql/001_schema.sql
   mysql -u quickcric -p quickcric < database/mysql/002_seed.sql
   ```
3. Put the credentials in `.env` as `DB_USER` / `DB_PASSWORD` / `DB_NAME`.
   In Docker, keep `DB_SOCKET=/var/run/mysqld/mysqld.sock` so the container
   reaches MySQL over the bind-mounted host socket rather than the network.

The `database/*.sql` files at the top level are the original Supabase
Postgres schema, kept for reference only — MySQL uses `database/mysql/`.

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
