"""
CricketVerse Simulation Engine
================================
Ball-by-ball cricket match simulator using real player stats,
stamina decay, pressure index, pitch/weather conditions.
"""

import random
import math
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class Outcome(str, Enum):
    DOT   = "0"
    ONE   = "1"
    TWO   = "2"
    THREE = "3"
    FOUR  = "4"
    SIX   = "6"
    WICKET = "W"
    WIDE   = "WD"
    NO_BALL = "NB"

class PitchType(str, Enum):
    FLAT    = "flat"
    SPIN    = "spin"
    SEAM    = "seam"
    DUSTY   = "dusty"
    DAMP    = "damp"
    BOUNCY  = "bouncy"
    NEUTRAL = "neutral"

class TimeOfPlay(str, Enum):
    MORNING   = "morning"
    AFTERNOON = "afternoon"
    EVENING   = "evening"
    NIGHT     = "night"
    OVERCAST  = "overcast"
    DRIZZLE   = "drizzle"


# ─────────────────────────────────────────────
# DATA CLASSES
# ─────────────────────────────────────────────

@dataclass
class PlayerStats:
    id: str
    name: str
    country: str
    role: str                          # 'Batter', 'Bowler', 'All-rounder', 'WK-Batter'
    bat_avg: float = 30.0
    bat_sr: float = 120.0
    bat_style: str = "balanced"        # aggressive / balanced / defensive
    bat_vs_spin: float = 1.0           # multiplier — >1 means good vs spin
    bat_vs_pace: float = 1.0
    bat_weakness: list = field(default_factory=list)
    bowl_avg: Optional[float] = None
    bowl_economy: Optional[float] = None
    bowl_type: Optional[str] = None    # 'Fast', 'Medium', 'Spin'
    bowl_variations: list = field(default_factory=list)
    stamina: int = 85                  # 0–100, decays during match
    form: int = 75                     # 0–100
    pressure_handling: int = 75        # 0–100
    fitness: int = 85

@dataclass
class BatterState:
    player: PlayerStats
    runs: int = 0
    balls: int = 0
    fours: int = 0
    sixes: int = 0
    out: bool = False
    stamina: int = 100                 # starts full, decays ball by ball
    dots_in_row: int = 0              # consecutive dots increase scoring pressure

@dataclass
class BowlerState:
    player: PlayerStats
    overs_bowled: int = 0
    balls_bowled: int = 0
    runs_conceded: int = 0
    wickets: int = 0
    maidens: int = 0
    stamina: int = 100                 # decays per over

@dataclass
class BallEvent:
    over: int
    ball: int
    label: str                         # e.g. "4.3"
    batter_name: str
    non_striker_name: str
    bowler_name: str
    outcome: Outcome
    runs: int
    is_wicket: bool
    wicket_type: Optional[str]
    speed_kmh: int
    delivery_type: str
    commentary: str
    animation_key: str
    landing_x: float
    landing_z: float
    pressure_index: float
    batter_stamina: int
    bowler_stamina: int


# ─────────────────────────────────────────────
# CONDITION MODIFIERS
# ─────────────────────────────────────────────

PITCH_MODIFIERS = {
    PitchType.FLAT:    {"six": 1.15, "four": 1.10, "wicket": 0.88, "dot": 0.90},
    PitchType.SPIN:    {"six": 0.90, "four": 0.92, "wicket": 1.12, "dot": 1.15},
    PitchType.SEAM:    {"six": 0.88, "four": 0.95, "wicket": 1.15, "dot": 1.10},
    PitchType.DUSTY:   {"six": 0.85, "four": 0.90, "wicket": 1.20, "dot": 1.18},
    PitchType.DAMP:    {"six": 0.82, "four": 0.88, "wicket": 1.25, "dot": 1.20},
    PitchType.BOUNCY:  {"six": 1.05, "four": 1.02, "wicket": 1.08, "dot": 1.05},
    PitchType.NEUTRAL: {"six": 1.00, "four": 1.00, "wicket": 1.00, "dot": 1.00},
}

TIME_MODIFIERS = {
    TimeOfPlay.MORNING:   {"swing": 1.20, "batting": 0.92},
    TimeOfPlay.AFTERNOON: {"swing": 1.00, "batting": 1.00},
    TimeOfPlay.EVENING:   {"swing": 0.95, "batting": 1.05},
    TimeOfPlay.NIGHT:     {"swing": 0.85, "batting": 1.10},  # dew aids batting
    TimeOfPlay.OVERCAST:  {"swing": 1.30, "batting": 0.90},
    TimeOfPlay.DRIZZLE:   {"swing": 1.15, "batting": 0.88},
}

DELIVERY_TYPES_FAST   = ["Yorker","In-swinger","Out-swinger","Bouncer","Full toss","Slower ball","Reverse swing","Back-of-hand"]
DELIVERY_TYPES_SPIN   = ["Leg-break","Googly","Top-spinner","Flipper","Slider","Arm ball","Carrom ball","Drift"]
DELIVERY_TYPES_MEDIUM = ["Outswing","Inswing","Cutter","Slower ball","Knuckle ball","Seam up","Back of hand","Off-cutter"]

WICKET_TYPES = ["Bowled","Caught","LBW","Stumped","Run out","Caught behind","Caught & bowled","Hit wicket"]

ANIMATION_MAP = {
    "six_pull":        "pull_shot_six",
    "six_drive":       "lofted_drive_six",
    "six_slog":        "slog_sweep_six",
    "six_scoop":       "scoop_six",
    "four_drive":      "cover_drive_four",
    "four_cut":        "cut_shot_four",
    "four_flick":      "flick_four",
    "four_sweep":      "sweep_four",
    "run_push":        "push_single",
    "run_rotate":      "rotate_strike",
    "dot_defend":      "defensive_block",
    "dot_miss":        "leave_outside_off",
    "wicket_bowled":   "bowled_wicket",
    "wicket_caught":   "caught_wicket",
    "wicket_lbw":      "lbw_appeal",
    "wicket_stumped":  "stumped_wicket",
}


# ─────────────────────────────────────────────
# COMMENTARY TEMPLATES
# ─────────────────────────────────────────────

COMMENTARY = {
    Outcome.SIX: [
        "MAXIMUM! {batter} launches {bowler} clean over the ropes! The crowd erupts!",
        "SIX! {batter} reads the length early and sends it soaring into the stands!",
        "HUGE SIX! {batter} makes that look effortless — {bowler} can only watch!",
        "That's gone all the way! {batter} clears the boundary with absolute authority!",
        "SIX! Pure timing from {batter}. {bowler}'s {delivery} gets absolutely carted!",
        "Over the rope! {batter} uses the pace and flicks it into orbit!",
    ],
    Outcome.FOUR: [
        "FOUR! {batter} drives beautifully through the covers — exquisite timing!",
        "BOUNDARY! {batter} finds the gap at midwicket and races to the fence!",
        "Four! {bowler}'s {delivery} is punished — {batter} picks it up early!",
        "FOUR! Perfectly placed, impossible to cut off. {batter} looks in supreme touch!",
        "BOUNDARY! {batter} leans into the drive — {bowler} shakes their head!",
        "Four! {batter} gets on top of the bounce and puts it away through extra cover!",
    ],
    Outcome.WICKET: [
        "WICKET! {bowler} gets the breakthrough! {batter} departs for {runs}!",
        "OUT! What a delivery from {bowler}! {batter} had no answer for that one!",
        "GONE! {batter} walks back to the pavilion. {bowler} is pumped!",
        "BOWLED HIM! {bowler} hits the top of off stump — {batter} is shattered!",
        "That's OUT! {batter} has to go for {runs}. The partnership is broken!",
        "CAUGHT! {batter} didn't middle it and the fielder takes a sharp chance!",
    ],
    Outcome.DOT: [
        "Dot ball. {bowler} lands it on a nagging good length — {batter} defends watchfully.",
        "Good delivery from {bowler}. {batter} plays it with respect.",
        "Tight from {bowler}. {batter} can't find the gap.",
        "No run. {bowler} keeps it tight — {delivery} hits the seam and skids through.",
        "Excellent line from {bowler}. {batter} gets behind it and defends.",
    ],
    Outcome.ONE: [
        "One run. {batter} pushes into the gap and scurries across for a single.",
        "Tucked away for one. Smart cricket from {batter}.",
        "Single taken. {batter} rotates the strike with a deft push.",
    ],
    Outcome.TWO: [
        "Two runs! {batter} drives into the gap — they come back for two.",
        "Good running! {batter} and the non-striker communicate well — that's two.",
        "Pushed into the outfield, two runs taken comfortably.",
    ],
    Outcome.THREE: [
        "Three! Excellent running between the wickets — {batter} dives in!",
        "Misfield in the deep! They've pinched three runs there.",
    ],
}


# ─────────────────────────────────────────────
# CORE SIMULATOR
# ─────────────────────────────────────────────

class CricketSimulator:
    """
    Core ball-by-ball cricket match simulator.
    """

    def __init__(
        self,
        team_a_players: list[PlayerStats],
        team_b_players: list[PlayerStats],
        total_overs: int = 20,
        pitch: PitchType = PitchType.NEUTRAL,
        time_of_play: TimeOfPlay = TimeOfPlay.AFTERNOON,
        stadium_name: str = "Unknown Stadium",
    ):
        self.teams = {"A": team_a_players, "B": team_b_players}
        self.total_overs = total_overs
        self.pitch = pitch
        self.time_of_play = time_of_play
        self.stadium_name = stadium_name
        self.pitch_mod = PITCH_MODIFIERS[pitch]
        self.time_mod = TIME_MODIFIERS[time_of_play]
        self.innings_results: list[dict] = []

    # ── PUBLIC: simulate one innings ────────────────────────────────

    def simulate_innings(
        self,
        batting_team: str,
        target: Optional[int] = None,
        over_by_over_callback=None,
    ) -> dict:
        """
        Simulate a full innings. Yields ball events if callback provided.
        Returns innings summary dict.
        """
        bowling_team = "B" if batting_team == "A" else "A"
        batters = [BatterState(p) for p in self.teams[batting_team]]
        bowlers = [
            BowlerState(p)
            for p in self.teams[bowling_team]
            if p.bowl_avg is not None or p.role in ["Bowler", "All-rounder"]
        ]
        
        # Ensure we have enough bowlers
        if len(bowlers) < 4:
            extras = [BowlerState(p) for p in self.teams[bowling_team] if p not in [b.player for b in bowlers]]
            bowlers.extend(extras[:4 - len(bowlers)])

        bat1_idx = 0
        bat2_idx = 1 if len(batters) > 1 else 0  # Fallback for 1-player testing
        next_bat_idx = 2
        total_runs = 0
        total_wickets = 0
        total_balls = 0
        legal_balls = 0  # deliveries actually bowled — the true ball count
        ball_events: list[BallEvent] = []
        fall_of_wickets = []
        over_runs = []
        cur_bowler_idx = 0
        prev_bowler_idx = -1
        partnership_runs = 0
        partnership_balls = 0
        max_overs_per_bowler = math.ceil(self.total_overs / 5)

        def next_bowler():
            nonlocal cur_bowler_idx, prev_bowler_idx
            
            # 1. Ideal candidates: didn't bowl the last over AND haven't exceeded max overs
            candidates = [
                (i, b) for i, b in enumerate(bowlers)
                if i != prev_bowler_idx
                and b.overs_bowled < max_overs_per_bowler
            ]
            
            # 2. First Fallback: Anyone who didn't bowl the last over (ignores max overs limit)
            if not candidates:
                candidates = [(i, b) for i, b in enumerate(bowlers) if i != prev_bowler_idx]
            
            # 3. Last Resort Fallback: If the team literally only has 1 bowler, let them bowl again
            if not candidates:
                candidates = [(i, b) for i, b in enumerate(bowlers)]
            
            # Safety check (should only hit this if the team has 0 players)
            if not candidates:
                return
                
            # Pick the bowler with the fewest overs bowled. 
            # If tied, pick the one with the best economy rate.
            candidates.sort(key=lambda x: (x[1].overs_bowled, x[1].runs_conceded / max(x[1].balls_bowled, 1)))
            
            # Update pointers
            prev_bowler_idx = cur_bowler_idx
            cur_bowler_idx = candidates[0][0]

        for over in range(self.total_overs):
            # Dynamic wicket check (allows teams with fewer than 11 players)
            if total_wickets >= max(1, len(batters) - 1):
                break
            
            over_run_total = 0
            next_bowler()
            bowler_state = bowlers[cur_bowler_idx]
            bowler_state.overs_bowled += 1

            for ball_in_over in range(1, 7):
                if total_wickets >= max(1, len(batters) - 1):
                    break
                if target and total_runs >= target:
                    break

                batter_state  = batters[bat1_idx]
                non_striker_state = batters[bat2_idx] if bat2_idx < len(batters) else batter_state
                bowler_state  = bowlers[cur_bowler_idx]
                total_balls   = over * 6 + (ball_in_over - 1)
                over_label    = f"{over}.{ball_in_over}"
                pressure      = self._pressure_index(total_runs, total_wickets, total_balls, target)
                event         = self._simulate_ball(
                    batter_state, non_striker_state, bowler_state, pressure, over, ball_in_over, over_label
                )
                ball_events.append(event)
                bowler_state.balls_bowled += 1
                legal_balls += 1
                over_run_total += event.runs

                if event.is_wicket:
                    total_wickets += 1
                    # The delivery was faced, so it counts as a ball for the
                    # dismissed batter's strike rate.
                    batter_state.balls += 1
                    # Credit the bowler — but a run-out is not their wicket.
                    if event.wicket_type != "Run out":
                        bowler_state.wickets += 1
                    fall_of_wickets.append({
                        "wicket": total_wickets,
                        "score": total_runs + event.runs,
                        "over": over_label,
                        "batter": batter_state.player.name,
                    })
                    batter_state.out = True
                    partnership_runs = 0
                    partnership_balls = 0
                    
                    if next_bat_idx < len(batters):
                        bat1_idx = next_bat_idx
                        next_bat_idx += 1
                    else:
                        break  # End the over immediately if no batters left
                else:
                    total_runs += event.runs
                    batter_state.runs += event.runs
                    batter_state.balls += 1
                    partnership_runs += event.runs
                    partnership_balls += 1
                    bowler_state.runs_conceded += event.runs

                    if event.runs in [4]:
                        batter_state.fours += 1
                    elif event.runs == 6:
                        batter_state.sixes += 1

                    # Rotate strike on odd runs
                    if event.runs % 2 == 1:
                        bat1_idx, bat2_idx = bat2_idx, bat1_idx

                # Decay stamina
                batter_state.stamina = max(0, batter_state.stamina - self._stamina_decay_bat(event))
                bowler_state.stamina = max(0, bowler_state.stamina - 0.5)

                if over_by_over_callback:
                    over_by_over_callback(event, total_runs, total_wickets, over_label)

            # End of over — rotate strike
            bat1_idx, bat2_idx = bat2_idx, bat1_idx
            over_runs.append(over_run_total)

            # Check maiden
            if over_run_total == 0:
                bowler_state.maidens += 1

        # Batting scorecard
        batting_scorecard = [
            {
                "player_id": b.player.id,
                "name": b.player.name,
                "runs": b.runs,
                "balls": b.balls,
                "fours": b.fours,
                "sixes": b.sixes,
                "out": b.out,
                "sr": round((b.runs / b.balls * 100) if b.balls > 0 else 0, 1),
            }
            for b in batters[:next_bat_idx]
        ]

        # Bowling figures
        bowling_figures = [
            {
                "player_id": bw.player.id,
                "name": bw.player.name,
                "overs": f"{bw.overs_bowled}.{bw.balls_bowled % 6}",
                "runs": bw.runs_conceded,
                "wickets": bw.wickets,
                "economy": round(bw.runs_conceded / bw.overs_bowled if bw.overs_bowled > 0 else 0, 2),
                "maidens": bw.maidens,
            }
            for bw in bowlers if bw.overs_bowled > 0
        ]

        result = {
            "batting_team": batting_team,
            "bowling_team": bowling_team,
            "total": total_runs,
            "wickets": total_wickets,
            "overs": f"{legal_balls // 6}.{legal_balls % 6}",
            "balls": legal_balls,
            "target": (total_runs + 1) if not target else None,
            "over_runs": over_runs,
            "fall_of_wickets": fall_of_wickets,
            "batting_scorecard": batting_scorecard,
            "bowling_figures": bowling_figures,
            "ball_events": ball_events,
            "top_scorer": max(batting_scorecard, key=lambda x: x["runs"]) if batting_scorecard else None,
            "best_bowler": max(bowling_figures, key=lambda x: x["wickets"]) if bowling_figures else None,
        }
        self.innings_results.append(result)
        return result

    # ── BALL SIMULATION ─────────────────────────────────────────────

    def _simulate_ball(
        self,
        batter: BatterState,
        non_striker: BatterState,
        bowler: BowlerState,
        pressure: float,
        over: int,
        ball_in_over: int,
        label: str,
    ) -> BallEvent:
        """Compute outcome of a single delivery."""

        # Base probabilities
        p_wkt  = 0.072
        p_six  = 0.095
        p_four = 0.155
        p_dot  = 0.215
        p_one  = 0.270
        p_two  = 0.110
        p_three = 0.025

        # ── BATTER adjustments ──────────────────────────────────────
        style = batter.player.bat_style
        if style == "aggressive":
            p_six  *= 1.25
            p_four *= 1.15
            p_wkt  *= 1.05
        elif style == "defensive":
            p_dot  *= 1.20
            p_wkt  *= 0.85
            p_six  *= 0.70

        # Batting average quality
        avg = batter.player.bat_avg
        avg_factor = avg / 40.0  # normalize around 40
        p_wkt  *= (1 / max(avg_factor, 0.5))
        p_six  *= avg_factor
        p_four *= avg_factor

        # Form influence
        form_f = max(batter.player.form, 1) / 75.0  # guard against form=0 → div-by-zero
        p_six  *= form_f
        p_four *= form_f
        p_wkt  /= form_f

        # Stamina decay — tired batter more prone to wicket
        stamina_f = batter.stamina / 100.0
        p_wkt  *= (1.2 - 0.2 * stamina_f)
        p_six  *= (0.8 + 0.2 * stamina_f)

        # Consecutive dots → rash shot
        if batter.dots_in_row >= 4:
            p_six  *= 1.18
            p_four *= 1.10
            p_wkt  *= 1.12

        # ── BOWLER adjustments ──────────────────────────────────────
        bowl_type = bowler.player.bowl_type or "Medium"
        if bowl_type == "Fast":
            p_wkt  *= 1.08
            # vs pace modifier
            if batter.player.bat_vs_pace < 1.0:
                p_wkt *= 1 / batter.player.bat_vs_pace
        elif bowl_type == "Spin":
            p_wkt  *= 1.05
            p_dot  *= 1.08
            if batter.player.bat_vs_spin < 1.0:
                p_wkt *= 1 / batter.player.bat_vs_spin

        # Bowl avg quality
        bowl_avg = bowler.player.bowl_avg or 35.0
        bowl_f = 30.0 / bowl_avg
        p_wkt *= bowl_f

        # Bowler stamina
        bow_stam_f = bowler.stamina / 100.0
        p_wkt *= (0.85 + 0.15 * bow_stam_f)

        # ── PITCH modifiers ─────────────────────────────────────────
        p_six  *= self.pitch_mod["six"]
        p_four *= self.pitch_mod["four"]
        p_wkt  *= self.pitch_mod["wicket"]
        p_dot  *= self.pitch_mod["dot"]

        # ── TIME modifiers ──────────────────────────────────────────
        p_six  *= self.time_mod["batting"]
        p_four *= self.time_mod["batting"]
        if bowl_type == "Fast":
            p_wkt *= self.time_mod["swing"]

        # ── PRESSURE ────────────────────────────────────────────────
        if pressure > 0.7:
            p_six *= 1.15
            p_wkt *= 1.12
        elif pressure < 0.3:
            p_dot *= 1.08  # Comfortable batting

        # ── OVER phase ──────────────────────────────────────────────
        if over < 6:
            p_wkt  *= 1.08
            p_four *= 1.10
        elif over < 15:
            p_dot  *= 1.05
        else:
            p_six  *= 1.20
            p_four *= 1.12
            p_wkt  *= 1.08

        # ── NORMALISE ───────────────────────────────────────────────
        total = p_wkt + p_six + p_four + p_three + p_two + p_one + p_dot
        p_wkt, p_six, p_four = p_wkt/total, p_six/total, p_four/total
        p_three, p_two, p_one, p_dot = p_three/total, p_two/total, p_one/total, p_dot/total

        # ── ROLL ────────────────────────────────────────────────────
        rng = random.random()
        if rng < p_wkt:
            outcome = Outcome.WICKET
            runs = 0
        elif rng < p_wkt + p_six:
            outcome = Outcome.SIX
            runs = 6
        elif rng < p_wkt + p_six + p_four:
            outcome = Outcome.FOUR
            runs = 4
        elif rng < p_wkt + p_six + p_four + p_three:
            outcome = Outcome.THREE
            runs = 3
        elif rng < p_wkt + p_six + p_four + p_three + p_two:
            outcome = Outcome.TWO
            runs = 2
        elif rng < p_wkt + p_six + p_four + p_three + p_two + p_one:
            outcome = Outcome.ONE
            runs = 1
        else:
            outcome = Outcome.DOT
            runs = 0

        # Update batter dot tracker
        if outcome == Outcome.DOT:
            batter.dots_in_row += 1
        else:
            batter.dots_in_row = 0

        # ── DELIVERY DETAILS ────────────────────────────────────────
        delivery_types = (
            DELIVERY_TYPES_FAST if bowl_type == "Fast"
            else DELIVERY_TYPES_SPIN if bowl_type == "Spin"
            else DELIVERY_TYPES_MEDIUM
        )
        delivery = random.choice(delivery_types)
        speed = self._get_speed(bowl_type, outcome)
        anim  = self._get_animation(outcome, batter)
        land  = self._get_landing(outcome)
        comm  = self._get_commentary(outcome, batter.player.name, bowler.player.name, delivery, batter.runs)
        w_type = random.choice(WICKET_TYPES) if outcome == Outcome.WICKET else None

        return BallEvent(
            over=over,
            ball=ball_in_over,
            label=label,
            batter_name=batter.player.name,
            non_striker_name=non_striker.player.name,
            bowler_name=bowler.player.name,
            outcome=outcome,
            runs=runs,
            is_wicket=(outcome == Outcome.WICKET),
            wicket_type=w_type,
            speed_kmh=speed,
            delivery_type=delivery,
            commentary=comm,
            animation_key=anim,
            landing_x=land[0],
            landing_z=land[1],
            pressure_index=round(pressure, 3),
            batter_stamina=batter.stamina,
            bowler_stamina=bowler.stamina,
        )

    # ── HELPERS ─────────────────────────────────────────────────────

    def _pressure_index(
        self,
        runs: int,
        wickets: int,
        balls: int,
        target: Optional[int],
    ) -> float:
        """
        0.0 = no pressure (batting first, comfortable)
        1.0 = extreme pressure (need 20 off 1 ball, 9 down)
        """
        if target is None:
            wkt_p = wickets / 10.0
            rr_p  = (runs / max(balls / 6, 1)) / 12.0
            return min(1.0, wkt_p * 0.4 + rr_p * 0.2)
        else:
            needed    = target - runs
            remaining = self.total_overs * 6 - balls
            if remaining <= 0:
                return 1.0
            rrr = needed / (remaining / 6)
            rrr_p = min(1.0, rrr / 18.0)
            wkt_p = wickets / 10.0
            return min(1.0, rrr_p * 0.6 + wkt_p * 0.4)

    def _stamina_decay_bat(self, event: BallEvent) -> float:
        base = 0.3
        if event.runs == 6:
            return base + 0.4
        elif event.runs == 4:
            return base + 0.2
        elif event.is_wicket:
            return 0.0
        return base

    def _get_speed(self, bowl_type: str, outcome: Outcome) -> int:
        if bowl_type == "Fast":
            return random.randint(135, 155)
        elif bowl_type == "Medium":
            return random.randint(118, 135)
        else:  # Spin
            return random.randint(78, 96)

    def _get_animation(self, outcome: Outcome, batter: BatterState) -> str:
        if outcome == Outcome.SIX:
            return random.choice(["pull_shot_six","lofted_drive_six","slog_sweep_six","scoop_six"])
        elif outcome == Outcome.FOUR:
            return random.choice(["cover_drive_four","cut_shot_four","flick_four","sweep_four"])
        elif outcome == Outcome.WICKET:
            return random.choice(["bowled_wicket","caught_wicket","lbw_appeal","stumped_wicket"])
        elif outcome in [Outcome.ONE, Outcome.TWO, Outcome.THREE]:
            return "push_single"
        else:
            return random.choice(["defensive_block","leave_outside_off"])

    def _get_landing(self, outcome: Outcome) -> tuple[float, float]:
        if outcome == Outcome.SIX:
            ang = random.uniform(-1.2, 1.2)
            dist = random.uniform(30, 38)
            return (math.sin(ang) * dist, math.cos(ang) * dist * 0.6 + 12)
        elif outcome == Outcome.FOUR:
            ang = random.uniform(-1.0, 1.0)
            dist = random.uniform(26, 33)
            return (math.sin(ang) * dist, dist * 0.55 + 6)
        else:
            return (random.uniform(-3, 3), random.uniform(6, 16))

    def _get_commentary(
        self, outcome: Outcome, batter: str, bowler: str, delivery: str, runs: int
    ) -> str:
        templates = COMMENTARY.get(outcome, COMMENTARY[Outcome.DOT])
        tmpl = random.choice(templates)
        return tmpl.format(batter=batter, bowler=bowler, delivery=delivery, runs=runs)

    # ── RESULT ──────────────────────────────────────────────────────

    def get_result(self) -> dict:
        if len(self.innings_results) < 2:
            return {"status": "incomplete"}

        inn1 = self.innings_results[0]
        inn2 = self.innings_results[1]
        s1, s2 = inn1["total"], inn2["total"]
        w1, w2 = inn1["wickets"], inn2["wickets"]
        target = s1 + 1

        if s2 >= target:
            # Dynamic calculation to handle teams with < 11 players
            max_wickets = max(1, len(self.teams[inn2["batting_team"]]) - 1)
            wkts_remaining = max_wickets - w2
            winner = inn2["batting_team"]
            margin = f"{wkts_remaining} wicket{'s' if wkts_remaining != 1 else ''}"
        elif s2 < target - 1:
            diff = target - 1 - s2
            winner = inn1["batting_team"]
            margin = f"{diff} run{'s' if diff != 1 else ''}"
        else:
            winner = "tie"
            margin = "tie"

        # Man of the match — highest score or most wickets
        all_batters = inn1["batting_scorecard"] + inn2["batting_scorecard"]
        all_bowlers = inn1["bowling_figures"] + inn2["bowling_figures"]
        top_bat = max(all_batters, key=lambda x: x["runs"]) if all_batters else None
        top_bowl = max(all_bowlers, key=lambda x: x["wickets"]) if all_bowlers else None

        motm = None
        if top_bat and top_bowl:
            motm = top_bat if top_bat["runs"] >= top_bowl["wickets"] * 20 else top_bowl

        return {
            "winner": winner,
            "margin": margin,
            "team_a_score": f"{s1}/{w1}",
            "team_b_score": f"{s2}/{w2}",
            "team_a_overs": inn1["overs"],
            "team_b_overs": inn2["overs"],
            "man_of_match": motm,
            "top_scorer": top_bat,
            "best_bowler": top_bowl,
        }


# ─────────────────────────────────────────────
# QUICK TEST (11v11 Match)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # --- TEAM A: INDIA ---
    ind_1 = PlayerStats(id="i1", name="Rohit Sharma", country="India", role="Batter",
        bat_avg=31.3, bat_sr=139.9, bat_style="aggressive", bat_vs_spin=1.05, bat_vs_pace=0.95)
    ind_2 = PlayerStats(id="i2", name="Yashasvi Jaiswal", country="India", role="Batter",
        bat_avg=33.4, bat_sr=161.9, bat_style="aggressive", bat_vs_spin=1.1, bat_vs_pace=1.1)
    ind_3 = PlayerStats(id="i3", name="Virat Kohli", country="India", role="Batter",
        bat_avg=48.7, bat_sr=137.0, bat_style="balanced", bat_vs_spin=1.0, bat_vs_pace=1.1)
    ind_4 = PlayerStats(id="i4", name="Suryakumar Yadav", country="India", role="Batter",
        bat_avg=42.6, bat_sr=167.7, bat_style="aggressive", bat_vs_spin=1.2, bat_vs_pace=1.15)
    ind_5 = PlayerStats(id="i5", name="Rishabh Pant", country="India", role="WK-Batter",
        bat_avg=23.2, bat_sr=127.5, bat_style="aggressive", bat_vs_spin=1.1, bat_vs_pace=1.0)
    ind_6 = PlayerStats(id="i6", name="Hardik Pandya", country="India", role="All-rounder",
        bat_avg=26.4, bat_sr=140.5, bat_style="aggressive", bowl_avg=25.8, bowl_economy=8.1, bowl_type="Medium")
    ind_7 = PlayerStats(id="i7", name="Ravindra Jadeja", country="India", role="All-rounder",
        bat_avg=21.4, bat_sr=127.1, bat_style="balanced", bowl_avg=29.8, bowl_economy=7.1, bowl_type="Spin")
    ind_8 = PlayerStats(id="i8", name="Axar Patel", country="India", role="All-rounder",
        bat_avg=19.5, bat_sr=140.2, bat_style="aggressive", bowl_avg=23.6, bowl_economy=7.3, bowl_type="Spin")
    ind_9 = PlayerStats(id="i9", name="Kuldeep Yadav", country="India", role="Bowler",
        bat_avg=10.0, bat_sr=80.0, bat_style="defensive", bowl_avg=14.0, bowl_economy=6.7, bowl_type="Spin")
    ind_10 = PlayerStats(id="i10", name="Jasprit Bumrah", country="India", role="Bowler",
        bat_avg=8.0, bat_sr=85.0, bat_style="defensive", bowl_avg=17.7, bowl_economy=6.2, bowl_type="Fast")
    ind_11 = PlayerStats(id="i11", name="Arshdeep Singh", country="India", role="Bowler",
        bat_avg=5.0, bat_sr=70.0, bat_style="defensive", bowl_avg=18.5, bowl_economy=8.3, bowl_type="Fast")

    team_a = [ind_1, ind_2, ind_3, ind_4, ind_5, ind_6, ind_7, ind_8, ind_9, ind_10, ind_11]

    # --- TEAM B: AUSTRALIA ---
    aus_1 = PlayerStats(id="a1", name="David Warner", country="Australia", role="Batter",
        bat_avg=33.9, bat_sr=142.6, bat_style="aggressive", bat_vs_spin=0.95, bat_vs_pace=1.1)
    aus_2 = PlayerStats(id="a2", name="Travis Head", country="Australia", role="Batter",
        bat_avg=32.1, bat_sr=158.4, bat_style="aggressive", bat_vs_spin=1.1, bat_vs_pace=1.15)
    aus_3 = PlayerStats(id="a3", name="Mitchell Marsh", country="Australia", role="All-rounder",
        bat_avg=33.4, bat_sr=135.3, bat_style="aggressive", bowl_avg=22.7, bowl_economy=7.7, bowl_type="Medium")
    aus_4 = PlayerStats(id="a4", name="Glenn Maxwell", country="Australia", role="All-rounder",
        bat_avg=30.0, bat_sr=155.5, bat_style="aggressive", bowl_avg=27.7, bowl_economy=7.7, bowl_type="Spin")
    aus_5 = PlayerStats(id="a5", name="Marcus Stoinis", country="Australia", role="All-rounder",
        bat_avg=30.4, bat_sr=147.1, bat_style="aggressive", bowl_avg=21.6, bowl_economy=8.4, bowl_type="Medium")
    aus_6 = PlayerStats(id="a6", name="Tim David", country="Australia", role="Batter",
        bat_avg=36.0, bat_sr=163.5, bat_style="aggressive", bat_vs_spin=1.1, bat_vs_pace=1.2)
    aus_7 = PlayerStats(id="a7", name="Matthew Wade", country="Australia", role="WK-Batter",
        bat_avg=25.5, bat_sr=134.1, bat_style="aggressive", bat_vs_spin=1.0, bat_vs_pace=1.1)
    aus_8 = PlayerStats(id="a8", name="Pat Cummins", country="Australia", role="Bowler",
        bat_avg=14.5, bat_sr=128.0, bat_style="aggressive", bowl_avg=24.5, bowl_economy=7.4, bowl_type="Fast")
    aus_9 = PlayerStats(id="a9", name="Mitchell Starc", country="Australia", role="Bowler",
        bat_avg=12.2, bat_sr=115.0, bat_style="defensive", bowl_avg=23.6, bowl_economy=7.7, bowl_type="Fast")
    aus_10 = PlayerStats(id="a10", name="Adam Zampa", country="Australia", role="Bowler",
        bat_avg=7.5, bat_sr=85.0, bat_style="defensive", bowl_avg=20.5, bowl_economy=7.1, bowl_type="Spin")
    aus_11 = PlayerStats(id="a11", name="Josh Hazlewood", country="Australia", role="Bowler",
        bat_avg=6.0, bat_sr=75.0, bat_style="defensive", bowl_avg=21.1, bowl_economy=7.6, bowl_type="Fast")

    team_b = [aus_1, aus_2, aus_3, aus_4, aus_5, aus_6, aus_7, aus_8, aus_9, aus_10, aus_11]

    # --- START SIMULATION ---
    sim = CricketSimulator(
        team_a_players=team_a,
        team_b_players=team_b,
        total_overs=20,
        pitch=PitchType.FLAT,
        time_of_play=TimeOfPlay.EVENING,
    )

    print("=== INNINGS 1: INDIA BATTING ===")
    inn1 = sim.simulate_innings("A")
    print(f"Score: {inn1['total']}/{inn1['wickets']} in {inn1['overs']} overs")
    if inn1["top_scorer"]:
        print(f"Top scorer: {inn1['top_scorer']['name']} — {inn1['top_scorer']['runs']}({inn1['top_scorer']['balls']})")
    if inn1["best_bowler"]:
         print(f"Best bowler: {inn1['best_bowler']['name']} — {inn1['best_bowler']['wickets']}/{inn1['best_bowler']['runs']}")

    print("\n=== INNINGS 2: AUSTRALIA CHASES ===")
    inn2 = sim.simulate_innings("B", target=inn1["total"]+1)
    print(f"Score: {inn2['total']}/{inn2['wickets']} in {inn2['overs']} overs")
    if inn2["top_scorer"]:
        print(f"Top scorer: {inn2['top_scorer']['name']} — {inn2['top_scorer']['runs']}({inn2['top_scorer']['balls']})")
    if inn2["best_bowler"]:
         print(f"Best bowler: {inn2['best_bowler']['name']} — {inn2['best_bowler']['wickets']}/{inn2['best_bowler']['runs']}")

    print("\n=== FINAL RESULT ===")
    result = sim.get_result()
    print(f"Winner: Team {result['winner']} by {result['margin']}")
    
    if result.get("man_of_match"):
        name = result["man_of_match"]["name"]
        reason = f"{result['man_of_match'].get('runs', '')} runs" if "runs" in result["man_of_match"] else f"{result['man_of_match'].get('wickets', '')} wickets"
        print(f"Man of the Match: {name} ({reason})")

    print(f"\n--- Sample Commentary (First 5 balls of the match) ---")
    for event in inn1["ball_events"][:5]:
        print(f"[{event.label}] {event.bowler_name} to {event.batter_name}: {event.outcome.value} — {event.commentary}")
