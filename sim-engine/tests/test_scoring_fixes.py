"""Regression tests for scorecard correctness.

Each test pins a bug found by auditing the engine's output:
- bowlers were never credited with the wickets they took (bowling figures
  always showed 0 wickets, breaking best-bowler and man-of-the-match);
- the innings ball/over count was off by one;
- a player with form=0 crashed ball simulation with a divide-by-zero.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from simulator import CricketSimulator, PlayerStats


def _team():
    batters = [
        PlayerStats(id=f"b{i}", name=f"Bat{i}", country="X", role="Batter",
                    bat_avg=40 - i)
        for i in range(7)
    ]
    bowlers = [
        PlayerStats(id=f"w{i}", name=f"Bowl{i}", country="X", role="Bowler",
                    bat_avg=10, bowl_avg=22, bowl_type="Fast")
        for i in range(4)
    ]
    return batters + bowlers


def test_bowlers_are_credited_with_their_wickets():
    """Sum of wickets in the bowling figures must equal the number of
    non-run-out dismissals — before the fix it was always zero."""
    for _ in range(20):
        sim = CricketSimulator(_team(), _team(), total_overs=20)
        inn = sim.simulate_innings("A")
        bowler_wickets = sum(b["wickets"] for b in inn["bowling_figures"])
        non_runout = sum(
            1 for e in inn["ball_events"]
            if e.is_wicket and e.wicket_type != "Run out"
        )
        assert bowler_wickets == non_runout
        # Sanity: with 10 wickets down, at least one should be a bowler's.
        if inn["wickets"] >= 5:
            assert bowler_wickets >= 1


def test_best_bowler_reflects_real_wickets():
    sim = CricketSimulator(_team(), _team(), total_overs=20)
    inn = sim.simulate_innings("A")
    if inn["best_bowler"] and inn["wickets"] > 0:
        best = inn["best_bowler"]["wickets"]
        assert best == max(b["wickets"] for b in inn["bowling_figures"])


def test_ball_count_matches_events():
    """Reported balls must equal the number of deliveries actually bowled."""
    for overs in (5, 10, 20):
        sim = CricketSimulator(_team(), _team(), total_overs=overs)
        inn = sim.simulate_innings("A")
        assert inn["balls"] == len(inn["ball_events"])
        # overs string must decode back to the same ball count
        whole, part = inn["overs"].split(".")
        assert int(whole) * 6 + int(part) == inn["balls"]


def test_ball_count_never_exceeds_format():
    sim = CricketSimulator(_team(), _team(), total_overs=20)
    inn = sim.simulate_innings("A")
    assert inn["balls"] <= 120


def test_zero_form_player_does_not_crash():
    zero_form = [
        PlayerStats(id=f"z{i}", name=f"Z{i}", country="X", role="Batter",
                    bat_avg=30, form=0)
        for i in range(7)
    ]
    bowlers = [
        PlayerStats(id=f"w{i}", name=f"W{i}", country="X", role="Bowler",
                    bat_avg=10, bowl_avg=22, bowl_type="Fast")
        for i in range(4)
    ]
    sim = CricketSimulator(zero_form + bowlers, _team(), total_overs=10)
    inn = sim.simulate_innings("A")  # used to raise ZeroDivisionError
    assert inn["total"] >= 0
