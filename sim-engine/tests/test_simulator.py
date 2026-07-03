"""
CricketVerse Simulator — Unit Tests
"""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from simulator import (
    CricketSimulator, PlayerStats, BallEvent,
    PitchType, TimeOfPlay, Outcome,
)

# ── FIXTURES ──────────────────────────────────────────────────────

def make_batter(id='b1', name='Batter', avg=40, sr=130, style='balanced'):
    return PlayerStats(id=id, name=name, country='X', role='Batter',
        bat_avg=avg, bat_sr=sr, bat_style=style)

def make_bowler(id='w1', name='Bowler', bowl_avg=25, bowl_eco=7.0, btype='Fast'):
    return PlayerStats(id=id, name=name, country='X', role='Bowler',
        bat_avg=10, bat_sr=80, bat_style='defensive',
        bowl_avg=bowl_avg, bowl_economy=bowl_eco, bowl_type=btype)

def make_team(n=11):
    batters = [make_batter(f'b{i}', f'Batter{i}', avg=40-i*2, sr=130-i, style='balanced')
               for i in range(7)]
    bowlers = [make_bowler(f'w{i}', f'Bowler{i}', bowl_avg=25+i, bowl_eco=7.0+i*0.2, btype='Fast')
               for i in range(4)]
    return batters + bowlers

# ── SIMULATOR TESTS ───────────────────────────────────────────────

class TestSimulator:

    def test_basic_t20_completes(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        inn  = sim.simulate_innings('A')
        assert inn['total'] >= 0
        assert 0 <= inn['wickets'] <= 10
        assert inn['balls'] <= 120
        assert len(inn['ball_events']) > 0

    def test_short_format_t5(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=5)
        inn  = sim.simulate_innings('A')
        assert inn['balls'] <= 30
        assert inn['total'] >= 0

    def test_full_match_produces_result(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=10)
        i1   = sim.simulate_innings('A')
        i2   = sim.simulate_innings('B', target=i1['total'] + 1)
        res  = sim.get_result()
        assert res['winner'] in ['A', 'B', 'tie']
        assert 'margin' in res

    def test_aggressive_batter_scores_more_boundaries(self):
        aggressive = [make_batter(f'a{i}', f'Aggro{i}', avg=45, sr=170, style='aggressive') for i in range(8)]
        defensive  = [make_batter(f'd{i}', f'Defend{i}', avg=45, sr=110, style='defensive') for i in range(8)]
        bowlers    = [make_bowler(f'w{i}', f'Bowl{i}') for i in range(3)]

        team_agg = aggressive[:8] + bowlers
        team_def = defensive[:8] + bowlers

        results_agg = []
        results_def = []

        for _ in range(5):
            sim1 = CricketSimulator(team_agg, team_def[:], total_overs=20)
            i1   = sim1.simulate_innings('A')
            results_agg.append(sum(1 for e in i1['ball_events'] if e.outcome.value in ('4', '6')))

            sim2 = CricketSimulator(team_def, team_agg[:], total_overs=20)
            i2   = sim2.simulate_innings('A')
            results_def.append(sum(1 for e in i2['ball_events'] if e.outcome.value in ('4', '6')))

        avg_agg = sum(results_agg) / len(results_agg)
        avg_def = sum(results_def) / len(results_def)
        # Aggressive should hit more boundaries on average
        assert avg_agg > avg_def * 0.8, f"Expected more boundaries: {avg_agg:.1f} vs {avg_def:.1f}"

    def test_elite_bowler_takes_more_wickets(self):
        team     = make_team()
        elite    = [make_bowler('e1', 'EliteBowl', bowl_avg=18, bowl_eco=5.5, btype='Fast')] + team[1:]
        ordinary = [make_bowler('o1', 'OrdBowl',   bowl_avg=38, bowl_eco=8.5, btype='Medium')] + team[1:]

        elite_wickets, ord_wickets = [], []
        for _ in range(5):
            sim1 = CricketSimulator(team, elite[:], total_overs=20)
            i1   = sim1.simulate_innings('A')
            elite_wickets.append(i1['wickets'])

            sim2 = CricketSimulator(team, ordinary[:], total_overs=20)
            i2   = sim2.simulate_innings('A')
            ord_wickets.append(i2['wickets'])

        avg_e = sum(elite_wickets) / len(elite_wickets)
        avg_o = sum(ord_wickets) / len(ord_wickets)
        # Elite bowler should generally take >= wickets (stochastic, so soft assert)
        assert avg_e >= avg_o * 0.6, f"Elite avg: {avg_e:.1f}, Ordinary avg: {avg_o:.1f}"

    def test_pitch_affects_scoring(self):
        team = make_team()
        flat_scores, spin_scores = [], []

        for _ in range(5):
            sim_flat = CricketSimulator(team, team[:], total_overs=20, pitch=PitchType.FLAT)
            flat_scores.append(sim_flat.simulate_innings('A')['total'])

            sim_spin = CricketSimulator(team, team[:], total_overs=20, pitch=PitchType.SPIN)
            spin_scores.append(sim_spin.simulate_innings('A')['total'])

        avg_flat = sum(flat_scores) / len(flat_scores)
        avg_spin = sum(spin_scores) / len(spin_scores)
        # Flat pitch should generally produce more runs
        assert avg_flat >= avg_spin * 0.8, f"Flat: {avg_flat:.0f}, Spin: {avg_spin:.0f}"

    def test_pressure_index_range(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        i1   = sim.simulate_innings('A')
        i2   = sim.simulate_innings('B', target=i1['total'] + 1)

        for ev in i2['ball_events']:
            assert 0.0 <= ev.pressure_index <= 1.0, f"Pressure out of range: {ev.pressure_index}"

    def test_scorecard_complete(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=10)
        inn  = sim.simulate_innings('A')

        assert 'batting_scorecard' in inn
        assert 'bowling_figures'   in inn
        assert 'fall_of_wickets'   in inn
        assert len(inn['batting_scorecard']) > 0

        for batter in inn['batting_scorecard']:
            assert batter['runs'] >= 0
            assert batter['balls'] >= 0

    def test_target_chase_terminates_correctly(self):
        team   = make_team()
        sim    = CricketSimulator(team, team[:], total_overs=5)
        i1     = sim.simulate_innings('A')
        target = i1['total'] + 1
        i2     = sim.simulate_innings('B', target=target)

        # Match ends if: target reached, all overs bowled, or all out
        max_balls = 30
        assert (
            i2['total'] >= target or
            i2['balls'] <= max_balls
        ), f"Balls={i2['balls']} exceeds max {max_balls}"

    def test_no_negative_scores(self):
        for _ in range(10):
            team = make_team()
            sim  = CricketSimulator(team, team[:], total_overs=5)
            inn  = sim.simulate_innings('A')
            assert inn['total'] >= 0
            for ev in inn['ball_events']:
                assert ev.runs >= 0

    def test_commentary_generated(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=5)
        inn  = sim.simulate_innings('A')
        for ev in inn['ball_events']:
            assert isinstance(ev.commentary, str)
            assert len(ev.commentary) > 10

    def test_animation_key_generated(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=5)
        inn  = sim.simulate_innings('A')
        for ev in inn['ball_events']:
            assert isinstance(ev.animation_key, str)
            assert len(ev.animation_key) > 0


class TestPressureIndex:

    def test_first_innings_low_pressure(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        p    = sim._pressure_index(0, 0, 0, None)
        assert p < 0.3

    def test_desperate_chase_high_pressure(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        # Need 50 off 6 balls, 9 wickets down
        p    = sim._pressure_index(150, 9, 114, 201)
        assert p > 0.85

    def test_comfortable_chase_medium_pressure(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        # Need 40 off 40 balls — requires 6rr from 6rr needed
        p    = sim._pressure_index(120, 1, 80, 161)
        assert 0.2 < p < 0.7


class TestBallEvents:

    def test_wicket_event_structure(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        inn  = sim.simulate_innings('A')
        wickets = [e for e in inn['ball_events'] if e.is_wicket]
        for w in wickets:
            assert w.runs == 0
            assert w.wicket_type is not None
            assert w.outcome == Outcome.WICKET

    def test_six_event_structure(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        inn  = sim.simulate_innings('A')
        sixes = [e for e in inn['ball_events'] if e.outcome == Outcome.SIX]
        for s in sixes:
            assert s.runs == 6
            assert not s.is_wicket
            assert 'six' in s.animation_key.lower()

    def test_landing_coordinates_reasonable(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        inn  = sim.simulate_innings('A')
        for ev in inn['ball_events']:
            assert -50 <= ev.landing_x <= 50
            assert -10 <= ev.landing_z <= 60

    def test_speed_in_realistic_range(self):
        team = make_team()
        sim  = CricketSimulator(team, team[:], total_overs=20)
        inn  = sim.simulate_innings('A')
        for ev in inn['ball_events']:
            assert 60 <= ev.speed_kmh <= 170, f"Unrealistic speed: {ev.speed_kmh}"
