-- ============================================================
-- MIGRATION 003 — Phase 4: Multiplayer, Fantasy, Tournaments
-- Run after 002_phase3.sql
-- ============================================================

-- ── TOURNAMENTS ───────────────────────────────────────────────
create table tournaments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  format        text not null,    -- 'round_robin','knockout','group_knockout'
  match_format  text not null,    -- 'T10','T20','ODI'
  status        text default 'setup', -- 'setup','running','complete'
  winner_team   text,
  teams         jsonb default '[]',
  created_at    timestamptz default now(),
  completed_at  timestamptz
);

create table tournament_matches (
  id              uuid primary key default uuid_generate_v4(),
  tournament_id   uuid references tournaments(id) on delete cascade,
  round           text not null,  -- 'group_a','qf','sf','final'
  team_a          text not null,
  team_b          text not null,
  status          text default 'pending',
  winner          text,
  score_a         text,
  score_b         text,
  margin          text,
  match_id        uuid references matches(id),
  played_at       timestamptz
);

alter table tournaments enable row level security;
alter table tournament_matches enable row level security;

create policy "Users see own tournaments" on tournaments for all using (auth.uid() = user_id);
create policy "Users see own tournament matches" on tournament_matches for all using (
  exists (select 1 from tournaments where tournaments.id = tournament_matches.tournament_id and tournaments.user_id = auth.uid())
);

-- ── FANTASY ───────────────────────────────────────────────────
create table fantasy_teams (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null default 'My Fantasy XI',
  match_id      uuid references matches(id) on delete cascade,
  players       uuid[] not null,           -- 11 player IDs
  captain_id    uuid references players(id),
  vice_captain_id uuid references players(id),
  total_points  numeric(8,2) default 0,
  rank          integer,
  created_at    timestamptz default now()
);

create table fantasy_points_log (
  id            uuid primary key default uuid_generate_v4(),
  fantasy_team_id uuid references fantasy_teams(id) on delete cascade,
  player_id     uuid references players(id),
  ball_id       uuid references balls(id),
  event_type    text,    -- 'run','four','six','wicket','catch','maiden'
  points_raw    numeric(6,2),
  points_final  numeric(6,2),   -- after captain multiplier
  created_at    timestamptz default now()
);

alter table fantasy_teams enable row level security;
alter table fantasy_points_log enable row level security;

create policy "Users see own fantasy teams" on fantasy_teams for all using (auth.uid() = user_id);
create policy "Users see own fantasy points" on fantasy_points_log for all using (
  exists (select 1 from fantasy_teams where fantasy_teams.id = fantasy_points_log.fantasy_team_id and fantasy_teams.user_id = auth.uid())
);

-- Fantasy global leaderboard (public read)
create or replace view fantasy_global_leaderboard as
  select
    ft.id,
    up.username,
    up.display_name,
    ft.name as team_name,
    ft.total_points,
    ft.rank,
    m.format,
    m.created_at as match_date
  from fantasy_teams ft
  join user_profiles up on up.id = ft.user_id
  join matches m on m.id = ft.match_id
  order by ft.total_points desc
  limit 100;

grant select on fantasy_global_leaderboard to anon, authenticated;

-- ── MULTIPLAYER ROOMS ─────────────────────────────────────────
create table multiplayer_rooms (
  id            uuid primary key default uuid_generate_v4(),
  room_code     text unique not null,
  host_id       uuid references auth.users(id),
  guest_id      uuid references auth.users(id),
  status        text default 'waiting',   -- 'waiting','playing','finished'
  settings      jsonb default '{}',
  match_id      uuid references matches(id),
  winner_id     uuid references auth.users(id),
  created_at    timestamptz default now(),
  finished_at   timestamptz
);

alter table multiplayer_rooms enable row level security;
create policy "Users see their rooms" on multiplayer_rooms for all using (
  auth.uid() = host_id or auth.uid() = guest_id
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  type        text not null,   -- 'match_ready','challenge','tournament_update'
  title       text not null,
  body        text,
  data        jsonb default '{}',
  read        boolean default false,
  created_at  timestamptz default now()
);

alter table notifications enable row level security;
create policy "Users see own notifications" on notifications for all using (auth.uid() = user_id);
alter publication supabase_realtime add table notifications;

-- ── PLAYER ACHIEVEMENTS ───────────────────────────────────────
create table achievements (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  code        text not null,   -- 'first_match','century','hat_trick'
  title       text not null,
  description text,
  earned_at   timestamptz default now(),
  unique(user_id, code)
);

alter table achievements enable row level security;
create policy "Achievements are public" on achievements for select using (true);
create policy "Users earn own achievements" on achievements for insert with check (auth.uid() = user_id);

-- Seed achievement definitions
create table achievement_defs (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null,
  rarity      text default 'common'  -- 'common','rare','epic','legendary'
);

insert into achievement_defs values
  ('first_match',    'First Blood',       'Play your first simulated match',               '🏏', 'common'),
  ('century',        'Centurion',         'A player scores 100+ in your team',             '💯', 'rare'),
  ('hat_trick',      'Hat Trick Hero',    'A bowler takes 3 wickets in 3 balls',           '🎯', 'epic'),
  ('five_fer',       'Five Star',         'A bowler takes 5+ wickets in an innings',       '⭐', 'epic'),
  ('match_winner',   'Match Winner',      'Win 10 matches',                                '🏆', 'common'),
  ('run_machine',    'Run Machine',       'Score 1000 runs across all matches',            '📈', 'rare'),
  ('bowling_attack', 'Bowling Attack',    'Take 50 wickets across all matches',            '🎳', 'rare'),
  ('six_hitting',    'Six Machine',       'Hit 50 sixes across all matches',               '💥', 'rare'),
  ('tournament_win', 'Tournament Winner', 'Win your first tournament',                     '🥇', 'epic'),
  ('multiplayer_win','Gladiator',         'Win a multiplayer match against a friend',      '⚔️', 'rare'),
  ('fantasy_top',    'Fantasy Master',    'Finish #1 in a fantasy league',                 '🧙', 'epic'),
  ('perfect_eleven', 'Perfect XI',        'All 11 of your players score 30+ fantasy pts',  '💎', 'legendary');

-- Function: award achievement
create or replace function award_achievement(p_user_id uuid, p_code text)
returns void language plpgsql as $$
declare
  def achievement_defs%rowtype;
begin
  select * into def from achievement_defs where code = p_code;
  if not found then return; end if;

  insert into achievements (user_id, code, title, description)
  values (p_user_id, p_code, def.title, def.description)
  on conflict (user_id, code) do nothing;

  -- Notify user
  if found then
    insert into notifications (user_id, type, title, body, data)
    values (p_user_id, 'achievement', 'Achievement unlocked!',
            def.title || ' — ' || def.description,
            jsonb_build_object('code', p_code, 'icon', def.icon, 'rarity', def.rarity));
  end if;
end;
$$;

-- ── UPDATE USER PROFILES with more fields ────────────────────
alter table user_profiles
  add column if not exists total_runs       integer default 0,
  add column if not exists total_wickets    integer default 0,
  add column if not exists total_sixes      integer default 0,
  add column if not exists win_rate         numeric(4,2) default 0,
  add column if not exists favorite_format  text default 'T20',
  add column if not exists last_active_at   timestamptz default now();

-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists idx_fantasy_teams_match    on fantasy_teams(match_id);
create index if not exists idx_fantasy_teams_user     on fantasy_teams(user_id);
create index if not exists idx_tournament_matches_tid on tournament_matches(tournament_id);
create index if not exists idx_notifications_user     on notifications(user_id, read);
create index if not exists idx_achievements_user      on achievements(user_id);
create index if not exists idx_rooms_code             on multiplayer_rooms(room_code);
