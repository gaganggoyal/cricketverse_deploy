# Deploying QuickCric to the Contabo VPS (quickcric.online)

One-time setup is ~15 minutes. Redeploys after that are one command.

## 0. DNS (do this first — certificates need it)

At your domain registrar, add two records pointing at the VPS IP:

| Type | Name | Value |
|------|------|-------|
| A    | @    | `<VPS-IP>` |
| A    | www  | `<VPS-IP>` |

Wait until `ping quickcric.online` answers with the VPS IP before starting
the stack (usually minutes, can take up to an hour).

## 1. Prepare the server (once)

SSH in as root (Contabo emails you the credentials):

```bash
ssh root@<VPS-IP>

# Firewall — SSH + web only
apt update && apt install -y ufw
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# MySQL 8 — runs on the host, not in the compose stack
apt install -y mysql-server
```

Leave MySQL's `bind-address` at `127.0.0.1` and do **not** open 3306. The
containers reach it over the host's unix socket, which
`docker-compose.prod.yml` bind-mounts into them.

## 2. Create the database

```bash
mysql -e "CREATE DATABASE quickcric CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
          CREATE USER 'quickcric'@'localhost' IDENTIFIED BY 'a-strong-password';
          GRANT ALL PRIVILEGES ON quickcric.* TO 'quickcric'@'localhost';
          FLUSH PRIVILEGES;"
```

## 3. Get the code and configure

```bash
git clone https://github.com/gaganggoyal/cricketverse_deploy.git
cd cricketverse_deploy
cp .env.example .env
nano .env
```

Set `DB_PASSWORD` to the password you just chose, fill in the
Stripe/Anthropic keys, and set the **production URLs** — these three lines
are what make the app talk to itself through the domain instead of
localhost:

```env
NEXT_PUBLIC_APP_URL=https://quickcric.online
NEXT_PUBLIC_SIM_URL=https://quickcric.online/sim
NEXT_PUBLIC_MP_URL=wss://quickcric.online/mp
CORS_ORIGINS=https://quickcric.online,https://www.quickcric.online
```

Then apply the schema and seed data:

```bash
mysql -u quickcric -p quickcric < database/mysql/001_schema.sql
mysql -u quickcric -p quickcric < database/mysql/002_seed.sql
```

## 4. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes a few minutes (Next.js production build). Caddy obtains
the HTTPS certificate automatically on first request.

Check:

```bash
docker compose -f docker-compose.prod.yml ps          # all Up
curl -s https://quickcric.online/sim/health            # {"status":...}
```

Then open https://quickcric.online on your phone and play a match.

## 5. Redeploy after code changes

```bash
cd cricketverse_deploy
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes

- **Only Caddy is exposed** (80/443). Frontend, sim engine and Redis are
  internal-only by design — do not add `ports:` to them.
- `.env` lives only on the VPS (it is gitignored). Back it up somewhere
  safe; it is the one file `git clone` can't restore.
- Disk housekeeping every few months: `docker system prune -f`
- The GitHub Actions workflow (`.github/workflows/deploy.yml`) still
  targets Railway/Vercel and will show failed deploy jobs on pushes;
  either ignore, delete it, or replace with an SSH deploy step later.
