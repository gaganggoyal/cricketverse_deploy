-- ============================================================
-- CRICKETVERSE — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PLAYERS TABLE
-- ============================================================
create table players (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  country         text not null,
  country_code    text not null,           -- e.g. 'IND', 'AUS', 'ENG'
  flag_emoji      text,
  formats         text[] default '{}',     -- ['T20', 'ODI', 'TEST']
  role            text not null,           -- 'Batter', 'Bowler', 'All-rounder', 'WK-Batter'
  batting_style   text,                    -- 'Right-hand', 'Left-hand'
  bowling_style   text,                    -- 'Right-arm Fast', 'Left-arm Spin', etc.

  -- Batting stats
  bat_avg         numeric(5,2) default 0,
  bat_sr          numeric(6,2) default 0,
  bat_hs          integer default 0,
  bat_style       text default 'balanced', -- 'aggressive', 'balanced', 'defensive'
  bat_preferred_shots  text[] default '{}',
  bat_weakness    text[] default '{}',     -- ['short_ball', 'off_stump', 'swing']
  bat_vs_spin     numeric(4,2) default 1.0,
  bat_vs_pace     numeric(4,2) default 1.0,

  -- Bowling stats
  bowl_avg        numeric(5,2),
  bowl_economy    numeric(4,2),
  bowl_sr         numeric(5,2),
  bowl_type       text,                    -- 'Fast', 'Medium', 'Spin'
  bowl_variations text[] default '{}',     -- ['yorker', 'bouncer', 'googly']
  bowl_death_econ numeric(4,2),
  bowl_powerplay_econ numeric(4,2),

  -- Physical/mental attributes (0–100)
  stamina         integer default 85 check (stamina between 0 and 100),
  form            integer default 75 check (form between 0 and 100),
  pressure_handling integer default 70 check (pressure_handling between 0 and 100),
  fitness         integer default 85 check (fitness between 0 and 100),

  -- Ground preferences
  home_flat       numeric(4,2) default 1.0,
  home_spin       numeric(4,2) default 1.0,
  home_seam       numeric(4,2) default 1.0,
  home_bouncy     numeric(4,2) default 1.0,

  -- Assets
  avatar_url      text,
  jersey_number   integer,
  skill_description text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- STADIUMS TABLE
-- ============================================================
create table stadiums (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  city            text not null,
  country         text not null,
  capacity        integer,
  pitch_bias      text default 'neutral',  -- 'flat','spin','seam','bouncy','neutral'
  avg_first_innings_score integer default 160,
  dew_factor      boolean default false,
  altitude        integer default 0,       -- metres above sea level
  glb_url         text,                    -- 3D stadium model
  thumbnail_url   text,
  created_at      timestamptz default now()
);

-- ============================================================
-- MATCHES TABLE
-- ============================================================
create table matches (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  format          text not null,           -- 'T5','T10','T20','ODI'
  total_overs     integer not null,
  stadium_id      uuid references stadiums(id),
  pitch_type      text not null,
  time_of_play    text not null,           -- 'morning','afternoon','evening','night','overcast'
  weather         text default 'clear',

  -- Teams (stored as arrays of player UUIDs)
  team_a_name     text default 'Team A',
  team_b_name     text default 'Team B',
  team_a_players  uuid[] not null,
  team_b_players  uuid[] not null,

  -- Toss
  toss_winner     text,                    -- 'A' or 'B'
  toss_decision   text,                    -- 'bat' or 'field'

  -- Scores
  innings1_score  integer default 0,
  innings1_wickets integer default 0,
  innings1_overs  numeric(4,1) default 0,
  innings2_score  integer default 0,
  innings2_wickets integer default 0,
  innings2_overs  numeric(4,1) default 0,
  target          integer,

  -- Result
  status          text default 'pending',  -- 'pending','live','complete','abandoned'
  winner          text,                    -- 'A', 'B', 'tie', 'no_result'
  win_margin      text,                    -- e.g. '24 runs', '6 wickets'
  man_of_match    uuid references players(id),

  -- AI analysis
  ai_analysis     text,
  ai_ratings      jsonb default '{}',

  created_at      timestamptz default now(),
  completed_at    timestamptz
);

-- ============================================================
-- INNINGS TABLE
-- ============================================================
create table innings (
  id              uuid primary key default uuid_generate_v4(),
  match_id        uuid references matches(id) on delete cascade,
  innings_number  integer not null,        -- 1 or 2
  batting_team    text not null,           -- 'A' or 'B'
  bowling_team    text not null,

  total_runs      integer default 0,
  total_wickets   integer default 0,
  total_balls     integer default 0,
  extras          integer default 0,

  -- Fall of wickets [{wicket: 1, score: 45, over: "6.3", batter: "name"}]
  fall_of_wickets jsonb default '[]',

  -- Batting scorecard [{player_id, runs, balls, fours, sixes, dismissed_by, how_out}]
  batting_scorecard jsonb default '[]',

  -- Bowling figures [{player_id, overs, runs, wickets, economy, maidens}]
  bowling_figures jsonb default '[]',

  created_at      timestamptz default now()
);

-- ============================================================
-- BALLS TABLE — every single delivery
-- ============================================================
create table balls (
  id              uuid primary key default uuid_generate_v4(),
  match_id        uuid references matches(id) on delete cascade,
  innings_id      uuid references innings(id) on delete cascade,
  innings_number  integer not null,

  over_number     integer not null,        -- 0-indexed
  ball_number     integer not null,        -- 1–6 within over
  over_label      text not null,           -- e.g. '4.3'

  batter_id       uuid references players(id),
  bowler_id       uuid references players(id),
  non_striker_id  uuid references players(id),

  outcome         text not null,           -- '0','1','2','3','4','6','W','WD','NB'
  runs_scored     integer default 0,
  is_wicket       boolean default false,
  wicket_type     text,                    -- 'bowled','caught','lbw','runout','stumped'
  fielder_id      uuid references players(id),

  -- Delivery info
  speed_kmh       integer,
  delivery_type   text,                    -- 'yorker','bouncer','googly', etc.
  line            text,                    -- 'off_stump','middle','leg','outside_off'
  length          text,                    -- 'full','good_length','short','yorker'

  -- Simulation internals
  pressure_index  numeric(4,3),            -- 0.0–1.0
  batter_stamina  integer,
  bowler_stamina  integer,

  -- Commentary
  commentary      text,

  -- 3D animation trigger
  animation_key   text,                    -- 'pull_shot','drive','yorker_bowled', etc.
  landing_x       numeric(6,2),
  landing_z       numeric(6,2),

  created_at      timestamptz default now()
);

-- ============================================================
-- USER PROFILES
-- ============================================================
create table user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique,
  display_name    text,
  avatar_url      text,
  plan            text default 'free',     -- 'free', 'pro', 'elite'
  matches_played  integer default 0,
  matches_this_month integer default 0,
  favorite_players uuid[] default '{}',
  favorite_teams  text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- SEED DATA — stadiums
-- ============================================================
insert into stadiums (name, city, country, capacity, pitch_bias, avg_first_innings_score, dew_factor) values
  ('Narendra Modi Stadium',  'Ahmedabad',    'India',       132000, 'flat',    175, true),
  ('Wankhede Stadium',       'Mumbai',       'India',        33108, 'flat',    168, true),
  ('Eden Gardens',           'Kolkata',      'India',        68000, 'spin',    152, true),
  ('M Chinnaswamy Stadium',  'Bengaluru',    'India',        40000, 'flat',    180, true),
  ('MCG',                    'Melbourne',    'Australia',   100024, 'bouncy',  158, false),
  ('Sydney Cricket Ground',  'Sydney',       'Australia',    48000, 'bouncy',  162, false),
  ('Lord''s Cricket Ground', 'London',       'England',      30000, 'seam',    145, false),
  ('Headingley',             'Leeds',        'England',      20000, 'seam',    148, false),
  ('Gaddafi Stadium',        'Lahore',       'Pakistan',     60000, 'flat',    172, true),
  ('National Stadium',       'Karachi',      'Pakistan',     34000, 'flat',    165, true),
  ('Newlands',               'Cape Town',    'South Africa', 25000, 'seam',    149, false),
  ('SuperSport Park',        'Centurion',    'South Africa', 22000, 'bouncy',  160, false),
  ('Sabina Park',            'Kingston',     'Jamaica',      20000, 'bouncy',  155, false),
  ('Hagley Oval',            'Christchurch', 'New Zealand',  18000, 'seam',    147, false),
  ('Sharjah Stadium',        'Sharjah',      'UAE',          27000, 'spin',    148, true);

-- ============================================================
-- SEED DATA — players (sample of 30, expand with CricAPI)
-- ============================================================
insert into players (name, country, country_code, flag_emoji, formats, role, batting_style, bowling_style,
  bat_avg, bat_sr, bat_hs, bat_style, bat_preferred_shots, bat_weakness,
  bat_vs_spin, bat_vs_pace, bowl_avg, bowl_economy, bowl_type, bowl_variations,
  stamina, form, pressure_handling, fitness, skill_description) values

-- INDIA
('Rohit Sharma',     'India','IND','🇮🇳', ARRAY['T20','ODI','TEST'], 'Batter',      'Right-hand', null,
  48.6, 139, 264, 'aggressive', ARRAY['pull','hook','cover_drive'], ARRAY['inswing_early'],
  1.05, 0.95, null, null, null, '{}', 88, 82, 85, 90, 'Power opener. Destructive against pace with pull & hook. Can be vulnerable to early inswing.'),

('Virat Kohli',      'India','IND','🇮🇳', ARRAY['T20','ODI','TEST'], 'Batter',      'Right-hand', null,
  57.2, 138, 183, 'balanced', ARRAY['cover_drive','flick','straight_drive'], ARRAY['outside_off_leaving'],
  1.10, 1.05, null, null, null, '{}', 95, 90, 98, 98, 'Greatest modern batter. Relentless driver. Elite chase master. Near-perfect technique in all conditions.'),

('Suryakumar Yadav', 'India','IND','🇮🇳', ARRAY['T20'],             'Batter',      'Right-hand', null,
  46.5, 167, 117, 'aggressive', ARRAY['scoop','ramp','360_shot'], ARRAY['consecutive_short_balls'],
  1.12, 1.08, null, null, null, '{}', 90, 88, 88, 92, '360° unorthodox batter. Scoops, ramps and plays behind square. Unreadable for bowlers.'),

('Jasprit Bumrah',   'India','IND','🇮🇳', ARRAY['T20','ODI','TEST'], 'Bowler',      'Right-hand', 'Right-arm Fast',
  7.2, 78, 35, 'defensive', '{}', ARRAY['short_ball'],
  null, null, 20.7, 6.2, 'Fast', ARRAY['yorker','reverse_swing','slower_ball'],
  78, 85, 95, 82, 'Best death bowler in the world. Unplayable yorker. Unique action confuses batters.'),

('R Ashwin',         'India','IND','🇮🇳', ARRAY['T20','ODI','TEST'], 'Bowler',      'Right-hand', 'Right-arm Off-spin',
  17.2, 95, 124, 'defensive', ARRAY['slog_sweep'], '{}',
  null, null, 24.4, 6.5, 'Spin', ARRAY['carrom_ball','off_break','arm_ball','top_spinner'],
  85, 80, 90, 85, 'Master of variations. Carrom ball unplayable on turning pitches. Takes key wickets.'),

('Hardik Pandya',    'India','IND','🇮🇳', ARRAY['T20','ODI'],        'All-rounder', 'Right-hand', 'Right-arm Medium',
  32.4, 148, 91, 'aggressive', ARRAY['lofted_drive','pull'], ARRAY['consecutive_dots'],
  31.2, 7.4, 'Medium', ARRAY['slower_ball','bouncer'],
  82, 75, 80, 80, 'Hard-hitting finisher. Useful medium pace with slower ball.'),

('Ravindra Jadeja',  'India','IND','🇮🇳', ARRAY['T20','ODI','TEST'], 'All-rounder', 'Left-hand',  'Left-arm Spin',
  26.2, 119, 100, 'defensive', ARRAY['sweep','slog_sweep'], '{}',
  26.1, 6.8, 'Spin', ARRAY['arm_ball','carrom_ball'],
  92, 85, 85, 95, 'Flat left-arm spin. Economy specialist. Brilliant fielder. Useful lower-order bat.'),

-- AUSTRALIA
('David Warner',     'Australia','AUS','🇦🇺', ARRAY['T20','ODI','TEST'], 'Batter', 'Left-hand', null,
  44.5, 142, 335, 'aggressive', ARRAY['pull','cut','drive'], ARRAY['outside_off_pace'],
  0.95, 1.05, null, null, null, '{}', 87, 78, 85, 88, 'Destructive left-hand opener. Ferocious cuts and pulls. Scores fast from ball one.'),

('Steve Smith',      'Australia','AUS','🇦🇺', ARRAY['ODI','TEST'],       'Batter', 'Right-hand', null,
  60.1, 134, 239, 'balanced', ARRAY['pull','cut','unusual_offside'], ARRAY['left_arm_angle'],
  1.08, 1.02, null, null, null, '{}', 91, 88, 95, 90, 'Unconventional but prolific. Backs away to leg, hits inside-out. Almost impossible to get out.'),

('Pat Cummins',      'Australia','AUS','🇦🇺', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Right-arm Fast',
  18.5, 112, 66, 'defensive', '{}', ARRAY['short_ball'],
  null, null, 22.6, 6.3, 'Fast', ARRAY['yorker','bouncer','seam'],
  85, 82, 92, 85, 'Accurate fast bowling captain. Rises in pressure moments. Seam movement both ways.'),

('Mitchell Starc',   'Australia','AUS','🇦🇺', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Left-arm Fast',
  12.3, 135, 99, 'aggressive', ARRAY['big_hit'], '{}',
  null, null, 21.4, 6.5, 'Fast', ARRAY['inswing_yorker','bouncer','slower_ball'],
  79, 80, 85, 80, 'Left-arm swing king. Swinging yorker is virtually unplayable. Match-winner in big games.'),

('Glenn Maxwell',    'Australia','AUS','🇦🇺', ARRAY['T20','ODI'],        'All-rounder', 'Right-hand', 'Right-arm Off-spin',
  33.7, 162, 201, 'aggressive', ARRAY['360_shot','reverse_sweep','slog'], ARRAY['accuracy_spin'],
  33.7, 7.5, 'Spin', ARRAY['off_break','arm_ball'],
  86, 82, 82, 88, '360° hitter. Reverse sweeps, scoops, goes over the top. Off-spin useful as a bonus.'),

('Adam Zampa',       'Australia','AUS','🇦🇺', ARRAY['T20','ODI'],        'Bowler', 'Right-hand', 'Right-arm Leg-spin',
  6.8, 72, 37, 'defensive', '{}', ARRAY['short_ball'],
  null, null, 25.2, 6.9, 'Spin', ARRAY['googly','flipper','leg_break','slider'],
  77, 78, 85, 80, 'Leg-spin variations. Googly dismissed countless batters. Hard to read from hand.'),

-- ENGLAND
('Joe Root',         'England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿', ARRAY['ODI','TEST'],       'Batter', 'Right-hand', null,
  51.3, 131, 228, 'balanced', ARRAY['cover_drive','sweep','pull'], '{}',
  1.12, 1.00, null, null, null, '{}', 93, 88, 92, 94, 'Technically perfect. Sweep shot destroys spinners. Master of all conditions. World-class in every format.'),

('Jos Buttler',      'England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿', ARRAY['T20','ODI'],        'WK-Batter', 'Right-hand', null,
  37.9, 149, 101, 'aggressive', ARRAY['scoop','ramp','lofted_drive'], ARRAY['consecutive_short_balls'],
  1.05, 1.08, null, null, null, '{}', 89, 85, 90, 91, 'Best T20 keeper-batter. 360° aggression. Scoops 145km/h like it is easy.'),

('Jofra Archer',     'England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Right-arm Fast',
  9.2, 88, 42, 'defensive', '{}', ARRAY['full_toss'],
  null, null, 23.4, 6.9, 'Fast', ARRAY['bouncer','yorker','slower_ball'],
  75, 78, 88, 78, 'Raw pace 150km/h+. Bouncer threat from any length. Once fully fit, genuinely unplayable.'),

('Adil Rashid',      'England','ENG','🏴󠁧󠁢󠁥󠁮󠁧󠁿', ARRAY['T20','ODI'],        'Bowler', 'Right-hand', 'Right-arm Leg-spin',
  10.1, 105, 69, 'defensive', ARRAY['slog_sweep'], '{}',
  null, null, 25.8, 6.8, 'Spin', ARRAY['googly','flipper','wrong_un'],
  78, 75, 82, 80, 'Leg-spin with well-disguised wrong-un. Most effective white-ball spinner in England.'),

-- PAKISTAN
('Babar Azam',       'Pakistan','PAK','🇵🇰', ARRAY['T20','ODI','TEST'], 'Batter', 'Right-hand', null,
  57.1, 131, 158, 'balanced', ARRAY['cover_drive','flick','pull'], ARRAY['outside_off_angled'],
  1.08, 1.05, null, null, null, '{}', 92, 85, 88, 92, 'Classical elegance. Cover drive among the best in cricket. Consistent across all formats.'),

('Mohammad Rizwan',  'Pakistan','PAK','🇵🇰', ARRAY['T20','ODI','TEST'], 'WK-Batter', 'Right-hand', null,
  46.3, 136, 104, 'balanced', ARRAY['pull','flick','sweep'], ARRAY['extreme_pace_bounce'],
  1.05, 1.02, null, null, null, '{}', 90, 88, 90, 90, 'Rock solid wicket-keeper batter. Builds innings and accelerates. Exceptional behind the stumps.'),

('Shaheen Afridi',   'Pakistan','PAK','🇵🇰', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Left-arm Fast',
  6.8, 82, 36, 'defensive', '{}', ARRAY['full_toss_line'],
  null, null, 22.1, 6.4, 'Fast', ARRAY['inswing','outswing','yorker','bouncer'],
  80, 82, 88, 82, 'Left-arm swing. New ball is lethal — often takes 2 wickets in first over. Tall bounce too.'),

('Shadab Khan',      'Pakistan','PAK','🇵🇰', ARRAY['T20','ODI'],        'All-rounder', 'Right-hand', 'Right-arm Leg-spin',
  22.5, 136, 86, 'balanced', ARRAY['slog_sweep','pull'], '{}',
  26.4, 6.7, 'Spin', ARRAY['googly','leg_break','slider'],
  84, 80, 82, 85, 'Leg-spin all-rounder. Googly hard to read. Useful aggressive bat in lower middle order.'),

-- SOUTH AFRICA
('Kagiso Rabada',    'South Africa','SA','🇿🇦', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Right-arm Fast',
  9.5, 106, 31, 'aggressive', ARRAY['big_hit'], '{}',
  null, null, 21.2, 6.6, 'Fast', ARRAY['yorker','reverse_swing','bouncer'],
  82, 85, 92, 85, 'Elite pace. Reverse swing in death. Rises when it matters most. South Africa best ever.'),

('Heinrich Klaasen', 'South Africa','SA','🇿🇦', ARRAY['T20','ODI'],        'Batter', 'Right-hand', null,
  42.1, 164, 174, 'aggressive', ARRAY['pull','lofted_drive','360_shot'], ARRAY['pace_outside_off'],
  1.05, 1.08, null, null, null, '{}', 88, 88, 85, 88, 'Middle-order explosion. Hits over long-on with ease. Destructive in last 5 overs.'),

('Tabraiz Shamsi',   'South Africa','SA','🇿🇦', ARRAY['T20','ODI'],        'Bowler', 'Left-hand', 'Left-arm Wrist-spin',
  5.1, 68, 19, 'defensive', '{}', '{}',
  null, null, 23.1, 6.7, 'Spin', ARRAY['wrong_un','slider','flipper','top_spinner'],
  76, 78, 82, 80, 'Left-arm wrist-spin. Highly deceptive. Hard to tell wrong-un from regular delivery.'),

-- WEST INDIES
('Nicholas Pooran',  'West Indies','WI','🏳️', ARRAY['T20','ODI'],        'WK-Batter', 'Left-hand', null,
  29.8, 161, 99, 'aggressive', ARRAY['helicopter_shot','pull','scoop'], ARRAY['consecutive_short_balls_leg'],
  1.02, 1.05, null, null, null, '{}', 85, 82, 80, 86, 'Helicopter shot master. 360° left-hand power. Wicketkeeper who bats like a No.4 should.'),

('Jason Holder',     'West Indies','WI','🏳️', ARRAY['T20','ODI','TEST'], 'All-rounder', 'Right-hand', 'Right-arm Medium',
  24.1, 132, 202, 'balanced', ARRAY['lofted_drive','pull'], '{}',
  26.8, 6.8, 'Medium', ARRAY['bouncer','seam','slower_ball'],
  82, 75, 85, 83, 'Tall seam bowler. Extracts bounce from any pitch. Useful lower-order bat too.'),

-- NEW ZEALAND
('Kane Williamson',  'New Zealand','NZ','🇳🇿', ARRAY['T20','ODI','TEST'], 'Batter', 'Right-hand', null,
  47.8, 128, 251, 'balanced', ARRAY['cover_drive','pull','cut'], '{}',
  1.08, 1.05, null, null, null, '{}', 90, 85, 95, 91, 'Technically perfect. Best captain in cricket. Stays calm in the most extreme pressure situations.'),

('Rashid Khan',      'Afghanistan','AFG','🇦🇫', ARRAY['T20','ODI','TEST'], 'Bowler', 'Right-hand', 'Right-arm Leg-spin',
  12.4, 121, 60, 'defensive', ARRAY['slog_sweep'], '{}',
  null, null, 13.8, 5.9, 'Spin', ARRAY['googly','top_spinner','flipper','leg_break'],
  90, 92, 92, 92, 'Best T20 bowler in the world. Googly undetectable. Economy under 6. Wicket every 13 balls.'),

('Shakib Al Hasan',  'Bangladesh','BAN','🇧🇩', ARRAY['T20','ODI','TEST'], 'All-rounder', 'Left-hand', 'Left-arm Spin',
  31.3, 121, 144, 'balanced', ARRAY['sweep','flick','pull'], '{}',
  27.5, 6.8, 'Spin', ARRAY['arm_ball','slider','left_arm_orthodox'],
  88, 80, 90, 88, 'Bangladesh greatest. Left-arm spin with consistent line. Reliable bat in all conditions.');

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_players_country on players(country_code);
create index idx_players_role on players(role);
create index idx_matches_user on matches(user_id);
create index idx_matches_status on matches(status);
create index idx_balls_match on balls(match_id);
create index idx_balls_innings on balls(innings_id);
create index idx_balls_batter on balls(batter_id);
create index idx_balls_bowler on balls(bowler_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table user_profiles enable row level security;
alter table matches enable row level security;
alter table innings enable row level security;
alter table balls enable row level security;

-- Users can only see their own matches
create policy "Users see own matches" on matches
  for all using (auth.uid() = user_id);

create policy "Users see own innings" on innings
  for all using (
    exists (select 1 from matches where matches.id = innings.match_id and matches.user_id = auth.uid())
  );

create policy "Users see own balls" on balls
  for all using (
    exists (select 1 from matches where matches.id = balls.match_id and matches.user_id = auth.uid())
  );

-- Players and stadiums are public
create policy "Players are public" on players for select using (true);
create policy "Stadiums are public" on stadiums for select using (true);

-- Users manage own profile
create policy "Users manage own profile" on user_profiles
  for all using (auth.uid() = id);

-- ============================================================
-- REALTIME — enable for live match streaming
-- ============================================================
alter publication supabase_realtime add table balls;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table innings;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger players_updated_at before update on players
  for each row execute function update_updated_at();

create trigger user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at();

-- Function: get player stats for match setup (used in player picker dropdown)
create or replace function get_players_for_picker(
  p_country_code text default null,
  p_role text default null,
  p_format text default null,
  p_search text default null
)
returns table(id uuid, name text, country text, flag_emoji text, role text,
              bat_avg numeric, bat_sr numeric, bowl_avg numeric, bowl_economy numeric,
              skill_description text, formats text[])
language sql as $$
  select p.id, p.name, p.country, p.flag_emoji, p.role,
         p.bat_avg, p.bat_sr, p.bowl_avg, p.bowl_economy,
         p.skill_description, p.formats
  from players p
  where (p_country_code is null or p.country_code = p_country_code)
    and (p_role is null or p.role = p_role)
    and (p_format is null or p_format = any(p.formats))
    and (p_search is null or p.name ilike '%' || p_search || '%')
  order by p.bat_avg desc nulls last, p.name;
$$;
