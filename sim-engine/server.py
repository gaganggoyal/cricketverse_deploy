"""
CricketVerse — FastAPI Simulation Server
=========================================
REST + WebSocket API that wraps the simulation engine.
Frontend connects via WebSocket to receive live ball events.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import uuid
import os

from simulator import (
    CricketSimulator, PlayerStats, BallEvent,
    PitchType, TimeOfPlay, Outcome
)

app = FastAPI(title="CricketVerse Sim Engine", version="1.0.0")

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", 
    "http://localhost:3000,https://cricketverse.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory active match sessions
active_sessions: dict[str, dict] = {}


# ─────────────────────────────────────────────
# REQUEST MODELS
# ─────────────────────────────────────────────

class PlayerInput(BaseModel):
    id: str
    name: str
    country: str
    role: str
    bat_avg: float = 30.0
    bat_sr: float = 120.0
    bat_style: str = "balanced"
    bat_vs_spin: float = 1.0
    bat_vs_pace: float = 1.0
    bat_weakness: list[str] = []
    bowl_avg: Optional[float] = None
    bowl_economy: Optional[float] = None
    bowl_type: Optional[str] = None
    bowl_variations: list[str] = []
    stamina: int = 85
    form: int = 75
    pressure_handling: int = 75
    fitness: int = 85

class StartMatchRequest(BaseModel):
    match_id: str
    format: str                        # 'T5','T10','T20','ODI'
    total_overs: int
    pitch: str = "neutral"
    time_of_play: str = "afternoon"
    stadium_name: str = "Unknown"
    team_a_players: list[PlayerInput]
    team_b_players: list[PlayerInput]
    toss_winner: str                   # 'A' or 'B'
    toss_decision: str                 # 'bat' or 'field'

class SimulateBallRequest(BaseModel):
    match_id: str


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def player_input_to_stats(p: PlayerInput) -> PlayerStats:
    return PlayerStats(
        id=p.id, name=p.name, country=p.country, role=p.role,
        bat_avg=p.bat_avg, bat_sr=p.bat_sr, bat_style=p.bat_style,
        bat_vs_spin=p.bat_vs_spin, bat_vs_pace=p.bat_vs_pace,
        bat_weakness=p.bat_weakness,
        bowl_avg=p.bowl_avg, bowl_economy=p.bowl_economy,
        bowl_type=p.bowl_type, bowl_variations=p.bowl_variations,
        stamina=p.stamina, form=p.form,
        pressure_handling=p.pressure_handling, fitness=p.fitness,
    )

def ball_event_to_dict(ev: BallEvent, score: int, wickets: int) -> dict:
    return {
        "over": ev.over,
        "ball": ev.ball,
        "label": ev.label,
        "batter": ev.batter_name,
        "non_striker": ev.non_striker_name,
        "bowler": ev.bowler_name,
        "outcome": ev.outcome.value,
        "runs": ev.runs,
        "is_wicket": ev.is_wicket,
        "wicket_type": ev.wicket_type,
        "speed_kmh": ev.speed_kmh,
        "delivery_type": ev.delivery_type,
        "commentary": ev.commentary,
        "animation_key": ev.animation_key,
        "landing": {"x": ev.landing_x, "z": ev.landing_z},
        "pressure_index": ev.pressure_index,
        "batter_stamina": ev.batter_stamina,
        "bowler_stamina": ev.bowler_stamina,
        "score": score,
        "wickets": wickets,
    }


# ─────────────────────────────────────────────
# REST ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "active_matches": len(active_sessions)}


@app.post("/match/start")
def start_match(req: StartMatchRequest):
    """
    Initialise a match session. Returns session details.
    Connect via WebSocket at /match/{match_id}/live to stream balls.
    """
    batting_first = req.toss_winner if req.toss_decision == "bat" \
                    else ("B" if req.toss_winner == "A" else "A")

    team_a = [player_input_to_stats(p) for p in req.team_a_players]
    team_b = [player_input_to_stats(p) for p in req.team_b_players]

    sim = CricketSimulator(
        team_a_players=team_a,
        team_b_players=team_b,
        total_overs=req.total_overs,
        pitch=PitchType(req.pitch),
        time_of_play=TimeOfPlay(req.time_of_play),
        stadium_name=req.stadium_name,
    )

    active_sessions[req.match_id] = {
        "sim": sim,
        "batting_first": batting_first,
        "total_overs": req.total_overs,
        "innings": 1,
        "status": "live",
        "ball_queue": [],          # pre-computed balls
        "score": 0,
        "wickets": 0,
        "balls": 0,
        "target": None,
        "connections": [],
    }

    # Pre-simulate the innings (fast) and queue ball events
    _precompute_innings(req.match_id, batting_first)

    return {
        "match_id": req.match_id,
        "batting_first": batting_first,
        "status": "live",
        "ws_url": f"/match/{req.match_id}/live",
    }


def _precompute_innings(match_id: str, batting_team: str):
    """Simulate all balls ahead of time and store in queue."""
    session = active_sessions[match_id]
    sim: CricketSimulator = session["sim"]
    innings_idx = session["innings"] - 1
    target = session["target"]

    result = sim.simulate_innings(batting_team, target=target)
    session["innings_result"] = result
    session["ball_queue"] = list(result["ball_events"])
    session["score"] = 0
    session["wickets"] = 0
    session["balls"] = 0


@app.get("/match/{match_id}/status")
def match_status(match_id: str):
    if match_id not in active_sessions:
        raise HTTPException(404, "Match not found")
    s = active_sessions[match_id]
    return {
        "match_id": match_id,
        "innings": s["innings"],
        "score": s["score"],
        "wickets": s["wickets"],
        "balls": s["balls"],
        "status": s["status"],
        "queue_remaining": len(s["ball_queue"]),
    }


@app.get("/match/{match_id}/scorecard")
def scorecard(match_id: str):
    if match_id not in active_sessions:
        raise HTTPException(404, "Match not found")
    s = active_sessions[match_id]
    sim: CricketSimulator = s["sim"]
    return {
        "innings_results": [
            {k: v for k, v in r.items() if k != "ball_events"}
            for r in sim.innings_results
        ],
        "result": sim.get_result() if len(sim.innings_results) >= 2 else None,
    }


# ─────────────────────────────────────────────
# WEBSOCKET — Live ball streaming
# ─────────────────────────────────────────────

@app.websocket("/match/{match_id}/live")
async def match_websocket(websocket: WebSocket, match_id: str):
    """
    WebSocket endpoint. Client sends:
      { "action": "bowl" }        — bowl one ball
      { "action": "over" }        — bowl full over
      { "action": "auto", "speed_ms": 900 }  — auto-bowl at speed

    Server sends back BallEvent JSON for each delivery.
    """
    if match_id not in active_sessions:
        await websocket.close(code=4004, reason="Match not found")
        return

    await websocket.accept()
    session = active_sessions[match_id]
    session["connections"].append(websocket)
    auto_task = None

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")

            if action == "bowl":
                await _send_next_ball(websocket, match_id)

            elif action == "over":
                # Bowl remaining balls in current over
                session_ref = active_sessions.get(match_id, {})
                current_over = session_ref.get("balls", 0) // 6
                while True:
                    s = active_sessions.get(match_id, {})
                    if not s.get("ball_queue") or s.get("balls", 0) // 6 != current_over:
                        break
                    await _send_next_ball(websocket, match_id)
                    await asyncio.sleep(0.05)

            elif action == "auto":
                speed_ms = msg.get("speed_ms", 900)
                # One streamer per match, not per socket: two concurrent auto
                # tasks pop the same shared ball_queue and race at the innings
                # boundary — a 2nd-innings ball can reach a client before the
                # innings_break message does. The latest "auto" takes over.
                current = active_sessions.get(match_id, {})
                prev = current.get("auto_task")
                if prev:
                    prev.cancel()
                auto_task = asyncio.create_task(_auto_bowl(websocket, match_id, speed_ms))
                current["auto_task"] = auto_task

            elif action == "pause":
                if auto_task:
                    auto_task.cancel()
                    auto_task = None

    except WebSocketDisconnect:
        if websocket in session["connections"]:
            session["connections"].remove(websocket)
        if auto_task:
            auto_task.cancel()
        
        # FIX: Prevent memory leak by cleaning up abandoned matches
        if len(session["connections"]) == 0 and session["status"] == "complete":
            # Optional: delay deletion to allow users to refresh
            del active_sessions[match_id]


async def _send_next_ball(ws: WebSocket, match_id: str):
    """Pop next pre-computed ball from queue and send to client."""
    session = active_sessions.get(match_id)
    if not session or not session["ball_queue"]:
        # Check if innings over
        await _handle_innings_end(ws, match_id)
        return

    ev: BallEvent = session["ball_queue"].pop(0)

    if ev.is_wicket:
        session["wickets"] += 1
    else:
        session["score"] += ev.runs

    session["balls"] += 1
    payload = ball_event_to_dict(ev, session["score"], session["wickets"])
    await ws.send_text(json.dumps({"type": "ball", "data": payload}))

    # Innings over check
    if not session["ball_queue"]:
        await _handle_innings_end(ws, match_id)


async def _handle_innings_end(ws: WebSocket, match_id: str):
    session = active_sessions[match_id]
    sim: CricketSimulator = session["sim"]

    if session["innings"] == 1:
        # Start innings 2
        inn1_result = session.get("innings_result", {})
        target = inn1_result.get("total", 0) + 1
        session["target"] = target
        session["innings"] = 2

        batting_2nd = "B" if session["batting_first"] == "A" else "A"
        _precompute_innings(match_id, batting_2nd)

        await ws.send_text(json.dumps({
            "type": "innings_break",
            "data": {
                "innings1_score": inn1_result.get("total", 0),
                "innings1_wickets": inn1_result.get("wickets", 0),
                "target": target,
                "batting_team": batting_2nd,
            }
        }))
    else:
        # Match over
        result = sim.get_result()
        session["status"] = "complete"
        await ws.send_text(json.dumps({"type": "match_over", "data": result}))


async def _auto_bowl(ws: WebSocket, match_id: str, speed_ms: int):
    """Continuously bowl balls at given speed (ms between deliveries)."""
    try:
        while active_sessions.get(match_id, {}).get("status") == "live":
            session = active_sessions.get(match_id, {})
            if not session.get("ball_queue"):
                break
            
            # Add a safety check to ensure we only send one at a time
            await _send_next_ball(ws, match_id)
            
            # Yield control back to the event loop securely
            await asyncio.sleep(speed_ms / 1000.0)
    except asyncio.CancelledError:
        # Expected behavior when task is cancelled, just pass
        pass
    except Exception as e:
        print(f"Auto-bowl error: {e}")


# ─────────────────────────────────────────────
# CLAUDE AI COMMENTARY
# ─────────────────────────────────────────────

@app.post("/match/{match_id}/ai-analysis")
async def ai_analysis(match_id: str):
    """
    Call Claude API to generate post-match analysis.
    Requires ANTHROPIC_API_KEY env var.
    """
    import os
    import httpx

    if match_id not in active_sessions:
        raise HTTPException(404, "Match not found")

    session = active_sessions[match_id]
    sim: CricketSimulator = session["sim"]

    if len(sim.innings_results) < 2:
        raise HTTPException(400, "Match not complete")

    result = sim.get_result()
    inn1   = sim.innings_results[0]
    inn2   = sim.innings_results[1]

    prompt = f"""
You are a professional cricket commentator. Provide a detailed post-match analysis for this AI-simulated match.

MATCH RESULT:
Winner: Team {result['winner']} by {result['margin']}
Team A: {result['team_a_score']} in {result['team_a_overs']} overs
Team B: {result['team_b_score']} in {result['team_b_overs']} overs

INNINGS 1 BATTING (Team A):
{json.dumps([{k:v for k,v in b.items() if k in ['name','runs','balls','fours','sixes']} for b in inn1['batting_scorecard']], indent=2)}

INNINGS 1 BOWLING (Team B):
{json.dumps(inn1['bowling_figures'], indent=2)}

INNINGS 2 BATTING (Team B):
{json.dumps([{k:v for k,v in b.items() if k in ['name','runs','balls','fours','sixes']} for b in inn2['batting_scorecard']], indent=2)}

INNINGS 2 BOWLING (Team A):
{json.dumps(inn2['bowling_figures'], indent=2)}

Please provide:
1. A 3-paragraph match narrative
2. Player ratings 1-10 for top 6 performers with brief reasoning
3. Man of the Match with justification
4. Key turning points (3 bullet points)
5. Tactical analysis — what each team did well and poorly
"""

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not set", "prompt": prompt}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-6",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30.0,
        )
        data = resp.json()
        analysis_text = data["content"][0]["text"] if "content" in data else "Analysis unavailable"

    return {"analysis": analysis_text, "result": result}
