-- ============================================================
-- QUICKCRIC — MySQL seed data
-- Idempotent: safe to re-run (INSERT IGNORE / ON DUPLICATE KEY).
-- Postgres ARRAY[...] literals become JSON arrays here.
-- ============================================================

SET NAMES utf8mb4;

-- ── STADIUMS ──────────────────────────────────────────────────
INSERT IGNORE INTO stadiums (name, city, country, capacity, pitch_bias, avg_first_innings_score, dew_factor) VALUES
  ('Narendra Modi Stadium',  'Ahmedabad',    'India',       132000, 'flat',    175, 1),
  ('Wankhede Stadium',       'Mumbai',       'India',        33108, 'flat',    168, 1),
  ('Eden Gardens',           'Kolkata',      'India',        68000, 'spin',    152, 1),
  ('M Chinnaswamy Stadium',  'Bengaluru',    'India',        40000, 'flat',    180, 1),
  ('MCG',                    'Melbourne',    'Australia',   100024, 'bouncy',  158, 0),
  ('Sydney Cricket Ground',  'Sydney',       'Australia',    48000, 'bouncy',  162, 0),
  ('Lord''s Cricket Ground', 'London',       'England',      30000, 'seam',    145, 0),
  ('Headingley',             'Leeds',        'England',      20000, 'seam',    148, 0),
  ('Gaddafi Stadium',        'Lahore',       'Pakistan',     60000, 'flat',    172, 1),
  ('National Stadium',       'Karachi',      'Pakistan',     34000, 'flat',    165, 1),
  ('Newlands',               'Cape Town',    'South Africa', 25000, 'seam',    149, 0),
  ('SuperSport Park',        'Centurion',    'South Africa', 22000, 'bouncy',  160, 0),
  ('Sabina Park',            'Kingston',     'Jamaica',      20000, 'bouncy',  155, 0),
  ('Hagley Oval',            'Christchurch', 'New Zealand',  18000, 'seam',    147, 0),
  ('Sharjah Stadium',        'Sharjah',      'UAE',          27000, 'spin',    148, 1);

-- ── PLAYERS ───────────────────────────────────────────────────
-- Sample of 30; the app's primary pool is the curated static dataset in
-- frontend/src/data/players.ts. Expand via sim-engine/cricapi_sync.py.
INSERT INTO players (name, country, country_code, flag_emoji, formats, role, batting_style, bowling_style,
  bat_avg, bat_sr, bat_hs, bat_style, bat_preferred_shots, bat_weakness,
  bat_vs_spin, bat_vs_pace, bowl_avg, bowl_economy, bowl_type, bowl_variations,
  stamina, form, pressure_handling, fitness, skill_description) VALUES

-- INDIA
('Rohit Sharma','India','IND','🇮🇳','["T20","ODI","TEST"]','Batter','Right-hand',NULL,
  48.6,139,264,'aggressive','["pull","hook","cover_drive"]','["inswing_early"]',
  1.05,0.95,NULL,NULL,NULL,'[]',88,82,85,90,'Power opener. Destructive against pace with pull & hook. Can be vulnerable to early inswing.'),
('Virat Kohli','India','IND','🇮🇳','["T20","ODI","TEST"]','Batter','Right-hand',NULL,
  57.2,138,183,'balanced','["cover_drive","flick","straight_drive"]','["outside_off_leaving"]',
  1.10,1.05,NULL,NULL,NULL,'[]',95,90,98,98,'Greatest modern batter. Relentless driver. Elite chase master. Near-perfect technique in all conditions.'),
('Suryakumar Yadav','India','IND','🇮🇳','["T20"]','Batter','Right-hand',NULL,
  46.5,167,117,'aggressive','["scoop","ramp","360_shot"]','["consecutive_short_balls"]',
  1.12,1.08,NULL,NULL,NULL,'[]',90,88,88,92,'360° unorthodox batter. Scoops, ramps and plays behind square. Unreadable for bowlers.'),
('Jasprit Bumrah','India','IND','🇮🇳','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Fast',
  7.2,78,35,'defensive','[]','["short_ball"]',
  NULL,NULL,20.7,6.2,'Fast','["yorker","reverse_swing","slower_ball"]',
  78,85,95,82,'Best death bowler in the world. Unplayable yorker. Unique action confuses batters.'),
('R Ashwin','India','IND','🇮🇳','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Off-spin',
  17.2,95,124,'defensive','["slog_sweep"]','[]',
  NULL,NULL,24.4,6.5,'Spin','["carrom_ball","off_break","arm_ball","top_spinner"]',
  85,80,90,85,'Master of variations. Carrom ball unplayable on turning pitches. Takes key wickets.'),
('Hardik Pandya','India','IND','🇮🇳','["T20","ODI"]','All-rounder','Right-hand','Right-arm Medium',
  32.4,148,91,'aggressive','["lofted_drive","pull"]','["consecutive_dots"]',
  NULL,NULL,31.2,7.4,'Medium','["slower_ball","bouncer"]',
  82,75,80,80,'Hard-hitting finisher. Useful medium pace with slower ball.'),
('Ravindra Jadeja','India','IND','🇮🇳','["T20","ODI","TEST"]','All-rounder','Left-hand','Left-arm Spin',
  26.2,119,100,'defensive','["sweep","slog_sweep"]','[]',
  NULL,NULL,26.1,6.8,'Spin','["arm_ball","carrom_ball"]',
  92,85,85,95,'Flat left-arm spin. Economy specialist. Brilliant fielder. Useful lower-order bat.'),

-- AUSTRALIA
('David Warner','Australia','AUS','🇦🇺','["T20","ODI","TEST"]','Batter','Left-hand',NULL,
  44.5,142,335,'aggressive','["pull","cut","drive"]','["outside_off_pace"]',
  0.95,1.05,NULL,NULL,NULL,'[]',87,78,85,88,'Destructive left-hand opener. Ferocious cuts and pulls. Scores fast from ball one.'),
('Steve Smith','Australia','AUS','🇦🇺','["ODI","TEST"]','Batter','Right-hand',NULL,
  60.1,134,239,'balanced','["pull","cut","unusual_offside"]','["left_arm_angle"]',
  1.08,1.02,NULL,NULL,NULL,'[]',91,88,95,90,'Unconventional but prolific. Backs away to leg, hits inside-out. Almost impossible to get out.'),
('Pat Cummins','Australia','AUS','🇦🇺','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Fast',
  18.5,112,66,'defensive','[]','["short_ball"]',
  NULL,NULL,22.6,6.3,'Fast','["yorker","bouncer","seam"]',
  85,82,92,85,'Accurate fast bowling captain. Rises in pressure moments. Seam movement both ways.'),
('Mitchell Starc','Australia','AUS','🇦🇺','["T20","ODI","TEST"]','Bowler','Right-hand','Left-arm Fast',
  12.3,135,99,'aggressive','["big_hit"]','[]',
  NULL,NULL,21.4,6.5,'Fast','["inswing_yorker","bouncer","slower_ball"]',
  79,80,85,80,'Left-arm swing king. Swinging yorker is virtually unplayable. Match-winner in big games.'),
('Glenn Maxwell','Australia','AUS','🇦🇺','["T20","ODI"]','All-rounder','Right-hand','Right-arm Off-spin',
  33.7,162,201,'aggressive','["360_shot","reverse_sweep","slog"]','["accuracy_spin"]',
  NULL,NULL,33.7,7.5,'Spin','["off_break","arm_ball"]',
  86,82,82,88,'360° hitter. Reverse sweeps, scoops, goes over the top. Off-spin useful as a bonus.'),
('Adam Zampa','Australia','AUS','🇦🇺','["T20","ODI"]','Bowler','Right-hand','Right-arm Leg-spin',
  6.8,72,37,'defensive','[]','["short_ball"]',
  NULL,NULL,25.2,6.9,'Spin','["googly","flipper","leg_break","slider"]',
  77,78,85,80,'Leg-spin variations. Googly dismissed countless batters. Hard to read from hand.'),

-- ENGLAND
('Joe Root','England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','["ODI","TEST"]','Batter','Right-hand',NULL,
  51.3,131,228,'balanced','["cover_drive","sweep","pull"]','[]',
  1.12,1.00,NULL,NULL,NULL,'[]',93,88,92,94,'Technically perfect. Sweep shot destroys spinners. Master of all conditions. World-class in every format.'),
('Jos Buttler','England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','["T20","ODI"]','WK-Batter','Right-hand',NULL,
  37.9,149,101,'aggressive','["scoop","ramp","lofted_drive"]','["consecutive_short_balls"]',
  1.05,1.08,NULL,NULL,NULL,'[]',89,85,90,91,'Best T20 keeper-batter. 360° aggression. Scoops 145km/h like it is easy.'),
('Jofra Archer','England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Fast',
  9.2,88,42,'defensive','[]','["full_toss"]',
  NULL,NULL,23.4,6.9,'Fast','["bouncer","yorker","slower_ball"]',
  75,78,88,78,'Raw pace 150km/h+. Bouncer threat from any length. Once fully fit, genuinely unplayable.'),
('Adil Rashid','England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿','["T20","ODI"]','Bowler','Right-hand','Right-arm Leg-spin',
  10.1,105,69,'defensive','["slog_sweep"]','[]',
  NULL,NULL,25.8,6.8,'Spin','["googly","flipper","wrong_un"]',
  78,75,82,80,'Leg-spin with well-disguised wrong-un. Most effective white-ball spinner in England.'),

-- PAKISTAN
('Babar Azam','Pakistan','PAK','🇵🇰','["T20","ODI","TEST"]','Batter','Right-hand',NULL,
  57.1,131,158,'balanced','["cover_drive","flick","pull"]','["outside_off_angled"]',
  1.08,1.05,NULL,NULL,NULL,'[]',92,85,88,92,'Classical elegance. Cover drive among the best in cricket. Consistent across all formats.'),
('Mohammad Rizwan','Pakistan','PAK','🇵🇰','["T20","ODI","TEST"]','WK-Batter','Right-hand',NULL,
  46.3,136,104,'balanced','["pull","flick","sweep"]','["extreme_pace_bounce"]',
  1.05,1.02,NULL,NULL,NULL,'[]',90,88,90,90,'Rock solid wicket-keeper batter. Builds innings and accelerates. Exceptional behind the stumps.'),
('Shaheen Afridi','Pakistan','PAK','🇵🇰','["T20","ODI","TEST"]','Bowler','Right-hand','Left-arm Fast',
  6.8,82,36,'defensive','[]','["full_toss_line"]',
  NULL,NULL,22.1,6.4,'Fast','["inswing","outswing","yorker","bouncer"]',
  80,82,88,82,'Left-arm swing. New ball is lethal — often takes 2 wickets in first over. Tall bounce too.'),
('Shadab Khan','Pakistan','PAK','🇵🇰','["T20","ODI"]','All-rounder','Right-hand','Right-arm Leg-spin',
  22.5,136,86,'balanced','["slog_sweep","pull"]','[]',
  NULL,NULL,26.4,6.7,'Spin','["googly","leg_break","slider"]',
  84,80,82,85,'Leg-spin all-rounder. Googly hard to read. Useful aggressive bat in lower middle order.'),

-- SOUTH AFRICA
('Kagiso Rabada','South Africa','SA','🇿🇦','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Fast',
  9.5,106,31,'aggressive','["big_hit"]','[]',
  NULL,NULL,21.2,6.6,'Fast','["yorker","reverse_swing","bouncer"]',
  82,85,92,85,'Elite pace. Reverse swing in death. Rises when it matters most. South Africa best ever.'),
('Heinrich Klaasen','South Africa','SA','🇿🇦','["T20","ODI"]','Batter','Right-hand',NULL,
  42.1,164,174,'aggressive','["pull","lofted_drive","360_shot"]','["pace_outside_off"]',
  1.05,1.08,NULL,NULL,NULL,'[]',88,88,85,88,'Middle-order explosion. Hits over long-on with ease. Destructive in last 5 overs.'),
('Tabraiz Shamsi','South Africa','SA','🇿🇦','["T20","ODI"]','Bowler','Left-hand','Left-arm Wrist-spin',
  5.1,68,19,'defensive','[]','[]',
  NULL,NULL,23.1,6.7,'Spin','["wrong_un","slider","flipper","top_spinner"]',
  76,78,82,80,'Left-arm wrist-spin. Highly deceptive. Hard to tell wrong-un from regular delivery.'),

-- WEST INDIES
('Nicholas Pooran','West Indies','WI','🏳️','["T20","ODI"]','WK-Batter','Left-hand',NULL,
  29.8,161,99,'aggressive','["helicopter_shot","pull","scoop"]','["consecutive_short_balls_leg"]',
  1.02,1.05,NULL,NULL,NULL,'[]',85,82,80,86,'Helicopter shot master. 360° left-hand power. Wicketkeeper who bats like a No.4 should.'),
('Jason Holder','West Indies','WI','🏳️','["T20","ODI","TEST"]','All-rounder','Right-hand','Right-arm Medium',
  24.1,132,202,'balanced','["lofted_drive","pull"]','[]',
  NULL,NULL,26.8,6.8,'Medium','["bouncer","seam","slower_ball"]',
  82,75,85,83,'Tall seam bowler. Extracts bounce from any pitch. Useful lower-order bat too.'),

-- NEW ZEALAND / AFGHANISTAN / BANGLADESH
('Kane Williamson','New Zealand','NZ','🇳🇿','["T20","ODI","TEST"]','Batter','Right-hand',NULL,
  47.8,128,251,'balanced','["cover_drive","pull","cut"]','[]',
  1.08,1.05,NULL,NULL,NULL,'[]',90,85,95,91,'Technically perfect. Best captain in cricket. Stays calm in the most extreme pressure situations.'),
('Rashid Khan','Afghanistan','AFG','🇦🇫','["T20","ODI","TEST"]','Bowler','Right-hand','Right-arm Leg-spin',
  12.4,121,60,'defensive','["slog_sweep"]','[]',
  NULL,NULL,13.8,5.9,'Spin','["googly","top_spinner","flipper","leg_break"]',
  90,92,92,92,'Best T20 bowler in the world. Googly undetectable. Economy under 6. Wicket every 13 balls.'),
('Shakib Al Hasan','Bangladesh','BAN','🇧🇩','["T20","ODI","TEST"]','All-rounder','Left-hand','Left-arm Spin',
  31.3,121,144,'balanced','["sweep","flick","pull"]','[]',
  NULL,NULL,27.5,6.8,'Spin','["arm_ball","slider","left_arm_orthodox"]',
  88,80,90,88,'Bangladesh greatest. Left-arm spin with consistent line. Reliable bat in all conditions.')
AS new
ON DUPLICATE KEY UPDATE name = new.name;

-- ── ACHIEVEMENT DEFINITIONS ───────────────────────────────────
INSERT IGNORE INTO achievement_defs (code, title, description, icon, rarity) VALUES
  ('first_match',    'First Blood',       'Play your first simulated match',              '🏏', 'common'),
  ('century',        'Centurion',         'A player scores 100+ in your team',            '💯', 'rare'),
  ('hat_trick',      'Hat Trick Hero',    'A bowler takes 3 wickets in 3 balls',          '🎯', 'epic'),
  ('five_fer',       'Five Star',         'A bowler takes 5+ wickets in an innings',      '⭐', 'epic'),
  ('match_winner',   'Match Winner',      'Win 10 matches',                               '🏆', 'common'),
  ('run_machine',    'Run Machine',       'Score 1000 runs across all matches',           '📈', 'rare'),
  ('bowling_attack', 'Bowling Attack',    'Take 50 wickets across all matches',           '🎳', 'rare'),
  ('six_hitting',    'Six Machine',       'Hit 50 sixes across all matches',              '💥', 'rare'),
  ('tournament_win', 'Tournament Winner', 'Win your first tournament',                    '🥇', 'epic'),
  ('multiplayer_win','Gladiator',         'Win a multiplayer match against a friend',     '⚔️', 'rare'),
  ('fantasy_top',    'Fantasy Master',    'Finish #1 in a fantasy league',                '🧙', 'epic'),
  ('perfect_eleven', 'Perfect XI',        'All 11 of your players score 30+ fantasy pts', '💎', 'legendary');

-- ── FEATURE FLAGS ─────────────────────────────────────────────
INSERT IGNORE INTO feature_flags (`key`, enabled, rollout_pct, description) VALUES
  ('voice_commentary', 1, 100, 'Browser TTS + ElevenLabs commentary on match page'),
  ('multiplayer',      1, 100, '2-player real-time match rooms'),
  ('fantasy_cricket',  1, 100, 'Fantasy XI builder with live points'),
  ('ai_coach',         1, 100, 'Claude tactical assistant'),
  ('tournaments',      1, 100, 'Round robin / knockout mode'),
  ('share_replays',    1, 100, 'Public shareable match links'),
  ('odi_format',       0, 0,   'Enable 50-over matches (Pro only)'),
  ('analytics_v2',     0, 20,  'Advanced shot chart + radar (beta rollout)');
