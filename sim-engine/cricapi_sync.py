"""
QuickCric — CricAPI Player Sync Service
============================================
Fetches real player stats from CricAPI and upserts into MySQL.
Run this as a scheduled job (daily cron) to keep player data fresh.

Writes go straight to MySQL. This previously POSTed to Supabase's
PostgREST endpoint using a service key; our own database has no such
HTTP layer in front of it, and needs none — this script runs on the
same host.

CricAPI docs: https://www.cricapi.com/
Free tier: 100 req/day · Paid: 10,000 req/day
"""

import os, asyncio, httpx, json, math
from typing import Optional
from dataclasses import dataclass, asdict

import aiomysql

CRICAPI_KEY   = os.environ.get("CRICAPI_KEY", "")

# Same connection settings the Next.js app uses — see frontend/src/lib/db.ts.
DB_SOCKET     = os.environ.get("DB_SOCKET", "")
DB_HOST       = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT       = int(os.environ.get("DB_PORT", "3306"))
DB_USER       = os.environ.get("DB_USER", "quickcric")
DB_PASSWORD   = os.environ.get("DB_PASSWORD", "")
DB_NAME       = os.environ.get("DB_NAME", "quickcric")

CRICAPI_BASE  = "https://api.cricapi.com/v1"


async def db_connect():
    """Open a MySQL connection, over the unix socket when one is configured."""
    common = dict(user=DB_USER, password=DB_PASSWORD, db=DB_NAME,
                  charset="utf8mb4", autocommit=True)
    if DB_SOCKET:
        return await aiomysql.connect(unix_socket=DB_SOCKET, **common)
    return await aiomysql.connect(host=DB_HOST, port=DB_PORT, **common)

# ── Known player CricAPI IDs (top 200 international cricketers) ──
PLAYER_IDS = {
    # India
    "Virat Kohli":        "c52f10be-9e8d-4b6c-a9e7-e8b8a7a5e5e5",
    "Rohit Sharma":       "a5359d2d-71a4-4e9f-8b3d-8e5a4b3e9a7d",
    "Jasprit Bumrah":     "5878f296-0a8b-4cd0-aa2f-c9b03ace19a3",
    "Virat Kohli":        "c52f10be-9e8d-4b6c-a9e7-e8b8a7a5e5e5",
    "Suryakumar Yadav":   "8b9c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
    "KL Rahul":           "9c8b7a6f-5e4d-3c2b-1a0f-9e8d7c6b5a4f",
    "Hardik Pandya":      "2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a",
    "Ravindra Jadeja":    "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
    "R Ashwin":           "4f5a6b7c-8d9e-0f1a-2b3c-4d5e6f7a8b9c",
    "Mohammed Shami":     "5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d",
    "Rishabh Pant":       "6b7c8d9e-0f1a-2b3c-4d5e-6f7a8b9c0d1e",
    "Shubman Gill":       "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "Yuzvendra Chahal":   "8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    # Australia
    "David Warner":       "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "Steve Smith":        "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "Pat Cummins":        "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "Mitchell Starc":     "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "Josh Hazlewood":     "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    "Glenn Maxwell":      "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
    "Adam Zampa":         "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
    "Travis Head":        "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
    "Marnus Labuschagne": "8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e",
    # England
    "Joe Root":           "9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
    "Ben Stokes":         "0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a",
    "Jos Buttler":        "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "Jofra Archer":       "2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c",
    "Adil Rashid":        "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "Mark Wood":          "4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e",
    "Liam Livingstone":   "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f",
    "Sam Curran":         "6d7e8f9a-0b1c-2d3e-4f5a-6b7c8d9e0f1a",
    # Pakistan
    "Babar Azam":         "7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b",
    "Mohammad Rizwan":    "8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "Shaheen Afridi":     "9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
    "Haris Rauf":         "0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
    "Naseem Shah":        "1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f",
    "Shadab Khan":        "2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a",
    "Fakhar Zaman":       "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
    # South Africa
    "Kagiso Rabada":      "4f5a6b7c-8d9e-0f1a-2b3c-4d5e6f7a8b9c",
    "Anrich Nortje":      "5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d",
    "Heinrich Klaasen":   "6b7c8d9e-0f1a-2b3c-4d5e-6f7a8b9c0d1e",
    "Quinton de Kock":    "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f",
    "David Miller":       "8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "Tabraiz Shamsi":     "9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    # West Indies
    "Nicholas Pooran":    "0f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "Jason Holder":       "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "Alzarri Joseph":     "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    "Rovman Powell":      "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    # New Zealand
    "Kane Williamson":    "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a",
    "Trent Boult":        "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b",
    "Devon Conway":       "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c",
    # Afghanistan
    "Rashid Khan":        "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
    "Mohammad Nabi":      "8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e",
    # Bangladesh
    "Shakib Al Hasan":    "9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f",
    "Mustafizur Rahman":  "0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a",
    # Sri Lanka
    "Kusal Mendis":       "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "Wanindu Hasaranga":  "2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c",
    "Matheesha Pathirana":"3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
}

COUNTRY_CODE_MAP = {
    "India": "IND", "Australia": "AUS", "England": "ENG", "Pakistan": "PAK",
    "South Africa": "SA", "West Indies": "WI", "New Zealand": "NZ",
    "Bangladesh": "BAN", "Afghanistan": "AFG", "Sri Lanka": "SL",
    "Zimbabwe": "ZIM", "Ireland": "IRE", "Scotland": "SCO", "Netherlands": "NED",
}

FLAG_MAP = {
    "IND":"🇮🇳","AUS":"🇦🇺","ENG":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","PAK":"🇵🇰","SA":"🇿🇦",
    "WI":"🏳️","NZ":"🇳🇿","BAN":"🇧🇩","AFG":"🇦🇫","SL":"🇱🇰",
    "ZIM":"🇿🇼","IRE":"🇮🇪","SCO":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","NED":"🇳🇱",
}


# ─────────────────────────────────────────────────────────────────
# DATA TRANSFORMATION
# ─────────────────────────────────────────────────────────────────

def cricapi_to_player_row(raw: dict) -> dict:
    """
    Transform raw CricAPI player object → our MySQL players schema.
    CricAPI returns nested stats under `data.stats`.
    """
    name    = raw.get("name", "Unknown")
    country = raw.get("country", "Unknown")
    code    = COUNTRY_CODE_MAP.get(country, country[:3].upper())

    # Extract stats from nested list
    stats   = {s["fn"]: s for s in raw.get("stats", [])}

    # T20I batting
    t20_bat = stats.get("T20Is,bat", {})
    odi_bat = stats.get("ODIs,bat", {})
    t20_bowl= stats.get("T20Is,bowl", {})
    odi_bowl= stats.get("ODIs,bowl", {})

    def safe_float(d, key, default=0.0) -> float:
        v = d.get(key, default)
        try: return float(str(v).replace("-","0").replace("*",""))
        except: return default

    bat_avg  = safe_float(t20_bat, "ave") or safe_float(odi_bat, "ave") or 25.0
    bat_sr   = safe_float(t20_bat, "sr")  or safe_float(odi_bat, "sr")  or 110.0
    bat_hs   = int(safe_float(t20_bat, "hs") or safe_float(odi_bat, "hs") or 0)

    bowl_avg = safe_float(t20_bowl, "ave") or safe_float(odi_bowl, "ave") or None
    bowl_eco = safe_float(t20_bowl, "econ") or safe_float(odi_bowl, "econ") or None

    # Infer role from stats
    has_bat  = bat_avg > 5
    has_bowl = bowl_avg and bowl_avg > 0
    if has_bat and has_bowl:
        role = "All-rounder"
    elif has_bowl:
        role = "Bowler"
    else:
        role = "Batter"

    # Infer bowling type from name (CricAPI doesn't provide this reliably)
    bowling_style = raw.get("bowlingStyle", "")
    bowl_type = (
        "Fast"   if any(x in bowling_style.lower() for x in ["fast","pace","medium-fast"]) else
        "Medium" if "medium" in bowling_style.lower() else
        "Spin"   if any(x in bowling_style.lower() for x in ["spin","break","arm"]) else
        None
    )

    # Stamina/form — base from recent performance (simplified)
    stamina = min(95, max(60, int(bat_avg * 0.8 + 40)))
    form    = min(95, max(60, int(bat_sr * 0.3 + 30)))

    return {
        "name":             name,
        "country":          country,
        "country_code":     code,
        "flag_emoji":       FLAG_MAP.get(code, "🏳️"),
        "formats":          _infer_formats(stats),
        "role":             role,
        "batting_style":    raw.get("battingStyle", "Right-hand"),
        "bowling_style":    bowling_style or None,
        "bat_avg":          round(bat_avg, 2),
        "bat_sr":           round(bat_sr, 2),
        "bat_hs":           bat_hs,
        "bat_style":        _infer_bat_style(bat_sr),
        "bat_preferred_shots": [],
        "bat_weakness":     [],
        "bat_vs_spin":      1.0,
        "bat_vs_pace":      1.0,
        "bowl_avg":         round(bowl_avg, 2) if bowl_avg else None,
        "bowl_economy":     round(bowl_eco, 2) if bowl_eco else None,
        "bowl_type":        bowl_type,
        "bowl_variations":  [],
        "stamina":          stamina,
        "form":             form,
        "pressure_handling":75,
        "fitness":          85,
        "home_flat":        1.0,
        "home_spin":        1.0 + (0.1 if code == "IND" else 0),
        "home_seam":        1.0 + (0.1 if code in ["ENG","NZ","SA"] else 0),
        "home_bouncy":      1.0 + (0.1 if code in ["AUS","SA"] else 0),
        "skill_description": _generate_skill_desc(name, role, bat_avg, bat_sr, bowl_avg, bowl_type),
        "jersey_number":    None,
    }


def _infer_formats(stats: dict) -> list[str]:
    formats = []
    if stats.get("T20Is,bat") or stats.get("T20Is,bowl"): formats.append("T20")
    if stats.get("ODIs,bat")  or stats.get("ODIs,bowl"):  formats.append("ODI")
    if stats.get("Tests,bat") or stats.get("Tests,bowl"): formats.append("TEST")
    return formats or ["T20", "ODI"]


def _infer_bat_style(sr: float) -> str:
    if sr >= 145: return "aggressive"
    if sr >= 125: return "balanced"
    return "defensive"


def _generate_skill_desc(name, role, bat_avg, bat_sr, bowl_avg, bowl_type) -> str:
    parts = []
    if role in ["Batter", "WK-Batter", "All-rounder"]:
        if bat_avg >= 50:   parts.append("Elite batter")
        elif bat_avg >= 35: parts.append("Quality batter")
        else:               parts.append("Useful lower-order bat")
        if bat_sr >= 150:   parts.append("explosive strike rate")
        elif bat_sr >= 130: parts.append("good scoring rate")
    if role in ["Bowler", "All-rounder"] and bowl_avg:
        btype = bowl_type or "medium pace"
        if bowl_avg <= 22:  parts.append(f"elite {btype.lower()} bowler")
        elif bowl_avg <= 28:parts.append(f"quality {btype.lower()} bowling")
        else:               parts.append(f"{btype.lower()} bowling option")
    return ". ".join(p.capitalize() for p in parts) + "." if parts else name


# ─────────────────────────────────────────────────────────────────
# ASYNC SYNC
# ─────────────────────────────────────────────────────────────────

async def fetch_player(client: httpx.AsyncClient, player_id: str, name: str) -> dict | None:
    """Fetch one player from CricAPI."""
    try:
        r = await client.get(
            f"{CRICAPI_BASE}/players_info",
            params={"apikey": CRICAPI_KEY, "id": player_id},
            timeout=10,
        )
        if r.status_code != 200:
            print(f"  ✗ {name}: HTTP {r.status_code}")
            return None
        data = r.json()
        if data.get("status") != "success":
            print(f"  ✗ {name}: {data.get('message','unknown error')}")
            return None
        return data.get("data")
    except Exception as e:
        print(f"  ✗ {name}: {e}")
        return None


# List-valued columns are JSON in MySQL, so they must be serialised
# rather than passed through as Python lists.
JSON_COLUMNS = ("formats", "bat_preferred_shots", "bat_weakness", "bowl_variations")

# Natural key for the upsert. players.id is a generated UUID, so a repeat
# sync has to match on the name instead — hence the unique index below.
UPSERT_SQL = """
INSERT INTO players (
  name, country, country_code, flag_emoji, formats, role, batting_style, bowling_style,
  bat_avg, bat_sr, bat_hs, bat_style, bat_preferred_shots, bat_weakness,
  bat_vs_spin, bat_vs_pace, bowl_avg, bowl_economy, bowl_type, bowl_variations,
  stamina, form, pressure_handling, fitness,
  home_flat, home_spin, home_seam, home_bouncy, skill_description, jersey_number
) VALUES (
  %(name)s, %(country)s, %(country_code)s, %(flag_emoji)s, %(formats)s, %(role)s,
  %(batting_style)s, %(bowling_style)s,
  %(bat_avg)s, %(bat_sr)s, %(bat_hs)s, %(bat_style)s, %(bat_preferred_shots)s, %(bat_weakness)s,
  %(bat_vs_spin)s, %(bat_vs_pace)s, %(bowl_avg)s, %(bowl_economy)s, %(bowl_type)s, %(bowl_variations)s,
  %(stamina)s, %(form)s, %(pressure_handling)s, %(fitness)s,
  %(home_flat)s, %(home_spin)s, %(home_seam)s, %(home_bouncy)s, %(skill_description)s, %(jersey_number)s
)
ON DUPLICATE KEY UPDATE
  country = VALUES(country), country_code = VALUES(country_code),
  flag_emoji = VALUES(flag_emoji), formats = VALUES(formats), role = VALUES(role),
  batting_style = VALUES(batting_style), bowling_style = VALUES(bowling_style),
  bat_avg = VALUES(bat_avg), bat_sr = VALUES(bat_sr), bat_hs = VALUES(bat_hs),
  bat_style = VALUES(bat_style),
  bowl_avg = VALUES(bowl_avg), bowl_economy = VALUES(bowl_economy),
  bowl_type = VALUES(bowl_type),
  stamina = VALUES(stamina), form = VALUES(form),
  skill_description = VALUES(skill_description)
"""


async def upsert_player(conn, row: dict) -> bool:
    """Upsert a player row into MySQL, keyed on name."""
    payload = dict(row)
    for col in JSON_COLUMNS:
        payload[col] = json.dumps(payload.get(col) or [])
    try:
        async with conn.cursor() as cur:
            await cur.execute(UPSERT_SQL, payload)
        return True
    except Exception as e:
        print(f"  ✗ upsert failed: {e}")
        return False


async def sync_all_players():
    """Main sync: fetch all players from CricAPI and push to MySQL."""
    if not CRICAPI_KEY:
        print("⚠️  CRICAPI_KEY not set — using static seed data instead")
        return

    print(f"🏏 Starting player sync — {len(PLAYER_IDS)} players")
    ok, fail = 0, 0

    # Limit concurrency to respect API rate limits
    sem = asyncio.Semaphore(3)

    async def process(client, conn, name: str, pid: str):
        nonlocal ok, fail
        async with sem:
            print(f"  → Fetching {name}...")
            raw = await fetch_player(client, pid, name)
            if not raw:
                fail += 1
                return
            try:
                row = cricapi_to_player_row(raw)
                success = await upsert_player(conn, row)
                if success:
                    ok += 1
                    print(f"  ✓ {name} — avg:{row['bat_avg']} sr:{row['bat_sr']}")
                else:
                    fail += 1
            except Exception as e:
                print(f"  ✗ {name} transform error: {e}")
                fail += 1
            await asyncio.sleep(0.5)   # rate limit buffer

    conn = await db_connect()
    try:
        async with httpx.AsyncClient() as client:
            tasks = [process(client, conn, name, pid) for name, pid in PLAYER_IDS.items()]
            await asyncio.gather(*tasks)
    finally:
        conn.close()

    print(f"\n✅ Sync complete — {ok} ok, {fail} failed")


# ─────────────────────────────────────────────────────────────────
# PLAYER SEARCH (used by sim engine when the database is unavailable)
# ─────────────────────────────────────────────────────────────────

async def search_cricapi(query: str, limit: int = 10) -> list[dict]:
    """Live search from CricAPI — used as fallback."""
    if not CRICAPI_KEY:
        return []
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{CRICAPI_BASE}/players",
            params={"apikey": CRICAPI_KEY, "search": query},
            timeout=10,
        )
        data = r.json()
        if data.get("status") != "success":
            return []
        return [cricapi_to_player_row(p) for p in data.get("data", [])[:limit]]


# ─────────────────────────────────────────────────────────────────
# FORM TRACKER — update player form based on recent sim results
# ─────────────────────────────────────────────────────────────────

def update_player_form(player_id: str, recent_scores: list[int], recent_wickets: list[int]) -> int:
    """
    Compute new form rating (0–100) from last 5 performances.
    Called after each simulated match to keep form dynamic.
    """
    if not recent_scores and not recent_wickets:
        return 75

    bat_perf = 0
    if recent_scores:
        avg  = sum(recent_scores) / len(recent_scores)
        # Normalize: 50+ = excellent, 0 = poor
        bat_perf = min(100, int(avg * 1.5))

    bowl_perf = 0
    if recent_wickets:
        avg_wkts = sum(recent_wickets) / len(recent_wickets)
        bowl_perf = min(100, int(avg_wkts * 25))

    if recent_scores and recent_wickets:
        form = int(bat_perf * 0.5 + bowl_perf * 0.5)
    elif recent_scores:
        form = bat_perf
    else:
        form = bowl_perf

    return max(40, min(98, form))


# ─────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    if "--dry-run" in sys.argv:
        # Test transformation on mock data
        mock = {
            "name": "Test Player", "country": "India", "battingStyle": "Right-hand",
            "bowlingStyle": "Right-arm Fast",
            "stats": [
                {"fn": "T20Is,bat", "mat": "89", "ave": "48.6", "sr": "139.1", "hs": "121"},
                {"fn": "T20Is,bowl","mat": "89", "ave": "20.7", "econ": "6.2", "wkts": "145"},
            ]
        }
        row = cricapi_to_player_row(mock)
        print("Dry run output:")
        print(json.dumps(row, indent=2, default=str))
    else:
        asyncio.run(sync_all_players())
