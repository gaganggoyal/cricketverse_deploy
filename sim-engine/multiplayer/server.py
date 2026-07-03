"""
CricketVerse Multiplayer Server
================================
Socket.io server that lets two players:
 1. Create / join a lobby room
 2. Each pick their 11 players (turn-based draft or free pick)
 3. Watch the same simulated match live together in sync
 4. Chat during the match
 5. See opponent's reactions (emojis) in real time

Architecture:
  Room  → has 2 slots (host + guest)
  Match → pre-computed ball queue, streamed to both via broadcast
  Chat  → simple room-scoped message relay
"""

import asyncio, json, uuid, time
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our sim engine
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from simulator import CricketSimulator, PlayerStats, PitchType, TimeOfPlay, BallEvent

app = FastAPI(title="CricketVerse Multiplayer")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─────────────────────────────────────────────
# IN-MEMORY ROOM REGISTRY
# ─────────────────────────────────────────────

class Player:
    def __init__(self, ws: WebSocket, user_id: str, display_name: str):
        self.ws           = ws
        self.user_id      = user_id
        self.display_name = display_name
        self.team:   list = []
        self.ready:  bool = False

class Room:
    def __init__(self, room_id: str, host: Player, settings: dict):
        self.room_id    = room_id
        self.host       = host
        self.guest:     Optional[Player] = None
        self.settings   = settings          # format, pitch, time, stadium
        self.status     = "waiting"         # waiting | drafting | playing | finished
        self.ball_queue: list[BallEvent]   = []
        self.ball_idx   = 0
        self.score      = {"A": {"r":0,"w":0,"b":0}, "B": {"r":0,"w":0,"b":0}}
        self.innings    = 1
        self.target:    Optional[int]      = None
        self.auto_task: Optional[asyncio.Task] = None
        self.chat:      list[dict]         = []
        self.created_at = time.time()

    @property
    def full(self): return self.guest is not None

    async def broadcast(self, msg: dict, exclude: Optional[WebSocket] = None):
        """Send to all players in room."""
        for p in [self.host, self.guest]:
            if p and p.ws != exclude:
                try:
                    await p.ws.send_text(json.dumps(msg))
                except: pass

    async def send_to(self, ws: WebSocket, msg: dict):
        try: await ws.send_text(json.dumps(msg))
        except: pass

rooms: dict[str, Room] = {}


# ─────────────────────────────────────────────
# REST — room management
# ─────────────────────────────────────────────

class CreateRoomReq(BaseModel):
    user_id:      str
    display_name: str
    format:       str = "T20"
    total_overs:  int = 20
    pitch:        str = "flat"
    time_of_play: str = "evening"
    stadium_name: str = "Wankhede Stadium"

@app.post("/room/create")
def create_room(req: CreateRoomReq):
    room_id = str(uuid.uuid4())[:8].upper()
    # Room will be populated when host connects via WS
    return {
        "room_id":   room_id,
        "join_url":  f"/multiplayer/{room_id}",
        "ws_url":    f"/room/{room_id}/ws",
        "settings":  req.dict(),
    }

@app.get("/room/{room_id}/status")
def room_status(room_id: str):
    r = rooms.get(room_id)
    if not r: return {"status": "not_found"}
    return {
        "room_id":    room_id,
        "status":     r.status,
        "host":       r.host.display_name if r.host else None,
        "guest":      r.guest.display_name if r.guest else None,
        "full":       r.full,
        "settings":   r.settings,
    }

@app.get("/rooms/open")
def open_rooms():
    """List rooms waiting for a second player."""
    return [
        {"room_id": r.room_id, "host": r.host.display_name, "format": r.settings.get("format")}
        for r in rooms.values()
        if r.status == "waiting" and not r.full
        and time.time() - r.created_at < 600    # max 10 min old
    ]


# ─────────────────────────────────────────────
# WEBSOCKET — room connection
# ─────────────────────────────────────────────

@app.websocket("/room/{room_id}/ws")
async def room_ws(websocket: WebSocket, room_id: str):
    await websocket.accept()
    player: Optional[Player] = None
    room:   Optional[Room]   = None

    try:
        # First message must be HELLO
        raw  = await asyncio.wait_for(websocket.receive_text(), timeout=10)
        msg  = json.loads(raw)
        assert msg["type"] == "hello"

        user_id      = msg["user_id"]
        display_name = msg["display_name"]
        team_data    = msg.get("team", [])          # list of player dicts
        is_host      = msg.get("host", False)
        settings     = msg.get("settings", {})

        player = Player(websocket, user_id, display_name)
        player.team = team_data

        # Join or create room
        if is_host or room_id not in rooms:
            room = Room(room_id, player, settings)
            rooms[room_id] = room
            await room.send_to(websocket, {"type": "room_created", "room_id": room_id})
        else:
            room = rooms[room_id]
            if room.full:
                await websocket.send_text(json.dumps({"type": "error", "message": "Room is full"}))
                await websocket.close()
                return
            room.guest = player
            room.status = "drafting"
            await room.broadcast({
                "type":  "player_joined",
                "guest": display_name,
                "room":  {"host": room.host.display_name, "guest": room.guest.display_name},
            })

        # If both players present and both have teams → start
        if room.full and room.host.team and room.guest.team:
            await _start_match(room)

        # Message loop
        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            await _handle_message(room, player, msg)

    except WebSocketDisconnect:
        if room and player:
            await room.broadcast({"type": "player_left", "name": player.display_name}, exclude=websocket)
            if room.auto_task: room.auto_task.cancel()
            # Clean up if host left
            if player == room.host:
                rooms.pop(room_id, None)

    except Exception as e:
        try: await websocket.send_text(json.dumps({"type":"error","message":str(e)}))
        except: pass


# ─────────────────────────────────────────────
# MESSAGE HANDLERS
# ─────────────────────────────────────────────

async def _handle_message(room: Room, player: Player, msg: dict):
    t = msg.get("type")

    if t == "set_team":
        player.team  = msg["team"]
        player.ready = True
        await room.broadcast({
            "type":  "player_ready",
            "name":  player.display_name,
            "ready": True,
        })
        # Start if both ready
        if room.host.ready and room.guest and room.guest.ready:
            await _start_match(room)

    elif t == "bowl":
        if room.status == "playing":
            await _send_next_ball(room)

    elif t == "auto":
        speed = msg.get("speed_ms", 1200)
        if room.auto_task: room.auto_task.cancel()
        room.auto_task = asyncio.create_task(_auto_bowl(room, speed))

    elif t == "pause":
        if room.auto_task:
            room.auto_task.cancel()
            room.auto_task = None

    elif t == "chat":
        entry = {
            "type":    "chat",
            "from":    player.display_name,
            "message": msg["message"][:200],
            "ts":      int(time.time()),
        }
        room.chat.append(entry)
        await room.broadcast(entry)

    elif t == "reaction":
        await room.broadcast({
            "type":     "reaction",
            "from":     player.display_name,
            "emoji":    msg.get("emoji","🏏"),
        })

    elif t == "rematch":
        await room.broadcast({"type": "rematch_vote", "from": player.display_name})


# ─────────────────────────────────────────────
# MATCH ENGINE
# ─────────────────────────────────────────────

def _build_player_stats(raw: dict) -> PlayerStats:
    return PlayerStats(
        id=raw.get("id","?"),
        name=raw.get("name","Unknown"),
        country=raw.get("country","?"),
        role=raw.get("role","Batter"),
        bat_avg=float(raw.get("bat_avg",30)),
        bat_sr=float(raw.get("bat_sr",120)),
        bat_style=raw.get("bat_style","balanced"),
        bat_vs_spin=float(raw.get("bat_vs_spin",1.0)),
        bat_vs_pace=float(raw.get("bat_vs_pace",1.0)),
        bowl_avg=float(raw["bowl_avg"]) if raw.get("bowl_avg") else None,
        bowl_economy=float(raw["bowl_economy"]) if raw.get("bowl_economy") else None,
        bowl_type=raw.get("bowl_type"),
        stamina=int(raw.get("stamina",85)),
        form=int(raw.get("form",75)),
        pressure_handling=int(raw.get("pressure_handling",75)),
    )

async def _start_match(room: Room):
    room.status = "playing"
    s = room.settings

    team_a = [_build_player_stats(p) for p in room.host.team]
    team_b = [_build_player_stats(p) for p in room.guest.team]

    # Pad if needed
    while len(team_a) < 11:
        team_a.append(PlayerStats(id="pad",name="Player",country="X",role="Batter",bat_avg=20,bat_sr=110,bat_style="defensive"))
    while len(team_b) < 11:
        team_b.append(PlayerStats(id="pad",name="Player",country="X",role="Batter",bat_avg=20,bat_sr=110,bat_style="defensive"))

    try:
        pitch = PitchType(s.get("pitch","neutral"))
        top   = TimeOfPlay(s.get("time_of_play","afternoon"))
    except:
        pitch = PitchType.NEUTRAL
        top   = TimeOfPlay.AFTERNOON

    sim = CricketSimulator(
        team_a_players=team_a[:11],
        team_b_players=team_b[:11],
        total_overs=int(s.get("total_overs",20)),
        pitch=pitch,
        time_of_play=top,
    )

    inn1 = sim.simulate_innings("A")
    target = inn1["total"] + 1
    inn2 = sim.simulate_innings("B", target=target)

    # Store pre-computed ball queue
    room.ball_queue = inn1["ball_events"] + inn2["ball_events"]
    room.innings1_result = inn1
    room.innings2_result = inn2
    room.sim = sim
    room.innings1_boundary = len(inn1["ball_events"])

    toss_winner = room.host.display_name
    await room.broadcast({
        "type":         "match_started",
        "toss_winner":  toss_winner,
        "batting_first": room.host.display_name,
        "target":        target,
        "format":        s.get("format","T20"),
        "stadium":       s.get("stadium_name","Unknown"),
        "team_a_name":   room.host.display_name,
        "team_b_name":   room.guest.display_name if room.guest else "Guest",
    })

    # Auto-start streaming
    room.auto_task = asyncio.create_task(_auto_bowl(room, 1100))


async def _send_next_ball(room: Room):
    if room.ball_idx >= len(room.ball_queue):
        await _end_match(room)
        return

    ev = room.ball_queue[room.ball_idx]
    room.ball_idx += 1

    # Determine innings
    inn_num = 1 if room.ball_idx <= room.innings1_boundary else 2

    # Running score
    if inn_num == 1:
        sc = room.score["A"]
    else:
        sc = room.score["B"]

    if ev.is_wicket:
        sc["w"] += 1
    else:
        sc["r"] += ev.runs
    sc["b"] += 1

    payload = {
        "type":       "ball",
        "innings":    inn_num,
        "over":       ev.over,
        "ball":       ev.ball,
        "label":      ev.label,
        "batter":     ev.batter_name,
        "bowler":     ev.bowler_name,
        "outcome":    ev.outcome.value,
        "runs":       ev.runs,
        "is_wicket":  ev.is_wicket,
        "wicket_type":ev.wicket_type,
        "speed_kmh":  ev.speed_kmh,
        "delivery":   ev.delivery_type,
        "commentary": ev.commentary,
        "animation":  ev.animation_key,
        "landing":    {"x": ev.landing_x, "z": ev.landing_z},
        "score_a":    room.score["A"],
        "score_b":    room.score["B"],
    }

    # Innings break
    if room.ball_idx == room.innings1_boundary:
        await room.broadcast({"type":"innings_break","score_a": room.score["A"],"target": room.innings2_result.get("target") or (room.score["A"]["r"]+1)})
        await asyncio.sleep(3)

    await room.broadcast(payload)


async def _auto_bowl(room: Room, speed_ms: int):
    try:
        while room.ball_idx < len(room.ball_queue) and room.status == "playing":
            await _send_next_ball(room)
            await asyncio.sleep(speed_ms / 1000)
        if room.ball_idx >= len(room.ball_queue):
            await _end_match(room)
    except asyncio.CancelledError:
        pass


async def _end_match(room: Room):
    if room.status == "finished": return
    room.status = "finished"
    if room.auto_task: room.auto_task.cancel()

    result = room.sim.get_result()
    winner_team = "A" if result["winner"] == "A" else "B"
    winner_name = room.host.display_name if winner_team == "A" else (room.guest.display_name if room.guest else "Guest")

    await room.broadcast({
        "type":        "match_over",
        "winner":      winner_name,
        "margin":      result["margin"],
        "score_a":     room.score["A"],
        "score_b":     room.score["B"],
        "man_of_match":result.get("man_of_match",{}).get("name",""),
        "top_scorer":  result.get("top_scorer",{}),
        "best_bowler": result.get("best_bowler",{}),
    })

    # Clean up after 10 min
    await asyncio.sleep(600)
    rooms.pop(room.room_id, None)
