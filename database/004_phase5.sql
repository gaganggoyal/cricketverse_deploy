-- ============================================================
-- MIGRATION 004 — Phase 5: Analytics, Voice, Admin, Flags
-- Run after 003_phase4.sql in Supabase SQL editor
-- ============================================================

-- ── FEATURE FLAGS TABLE ───────────────────────────────────────
create table if not exists feature_flags (
  key         text primary key,
  enabled     boolean default true,
  rollout_pct integer default 100 check (rollout_pct between 0 and 100),
  description text,
  updated_at  timestamptz default now(),
  updated_by  uuid references auth.users(id)
);

-- Seed default flags
insert into feature_flags (key, enabled, rollout_pct, description) values
  ('voice_commentary',  true,  100, 'Browser TTS + ElevenLabs commentary on match page'),
  ('multiplayer',       true,  100, '2-player real-time match rooms'),
  ('fantasy_cricket',   true,  100, 'Fantasy XI builder with live points'),
  ('ai_coach',          true,  100, 'Claude tactical assistant'),
  ('tournaments',       true,  100, 'Round robin / knockout mode'),
  ('share_replays',     true,  100, 'Public shareable match links'),
  ('odi_format',        false, 0,   'Enable 50-over matches (Pro only)'),
  ('analytics_v2',      false, 20,  'Advanced shot chart + radar (beta rollout)')
on conflict (key) do nothing;

-- ── ANALYTICS EVENTS ─────────────────────────────────────────
create table if not exists analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text,
  event       text not null,   -- 'match_start','match_complete','page_view','feature_used'
  properties  jsonb default '{}',
  page        text,
  created_at  timestamptz default now()
);

create index if not exists idx_analytics_event   on analytics_events(event);
create index if not exists idx_analytics_user    on analytics_events(user_id);
create index if not exists idx_analytics_created on analytics_events(created_at);

-- Retention: auto-delete events older than 90 days (set up as a cron job)
-- SELECT cron.schedule('delete-old-analytics', '0 3 * * *',
--   'DELETE FROM analytics_events WHERE created_at < now() - interval ''90 days''');

-- ── VOICE SETTINGS PER USER ───────────────────────────────────
alter table user_profiles
  add column if not exists voice_provider    text default 'browser',  -- 'browser','elevenlabs','off'
  add column if not exists voice_volume      numeric(3,2) default 0.85,
  add column if not exists voice_rate        numeric(3,2) default 1.05,
  add column if not exists elevenlabs_key    text,                     -- encrypted in app layer
  add column if not exists elevenlabs_voice  text default 'pNInz6obpgDQGcFmaJgB';

-- ── ADMIN ROLES ───────────────────────────────────────────────
create table if not exists admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text default 'admin',   -- 'admin','super_admin','support'
  created_at  timestamptz default now()
);

alter table admin_users enable row level security;
create policy "Super admins see all" on admin_users
  for all using (
    exists (select 1 from admin_users a where a.user_id = auth.uid() and a.role = 'super_admin')
  );

-- ── MATCH ANALYTICS AGGREGATES ────────────────────────────────
-- Materialised view: match stats by format + pitch (refreshed daily)
create materialized view if not exists match_agg_by_format as
  select
    format,
    pitch_type,
    time_of_play,
    count(*)                                        as total_matches,
    round(avg(innings1_score)::numeric, 1)          as avg_first_innings,
    round(avg(innings2_score)::numeric, 1)          as avg_second_innings,
    round(avg(innings1_wickets)::numeric, 1)        as avg_wickets,
    count(*) filter (where winner = 'A')            as team_a_wins,
    count(*) filter (where winner = 'B')            as team_b_wins,
    max(innings1_score)                             as highest_score,
    min(innings1_score) filter (where innings1_wickets = 10) as lowest_allout
  from matches
  where status = 'complete'
  group by format, pitch_type, time_of_play;

create unique index if not exists idx_match_agg_pk
  on match_agg_by_format(format, pitch_type, time_of_play);

grant select on match_agg_by_format to anon, authenticated;

-- Refresh function (call from app or cron)
create or replace function refresh_match_aggregates()
returns void language sql as $$
  refresh materialized view concurrently match_agg_by_format;
$$;

-- ── PLAYER CAREER BESTS IN SIMULATION ────────────────────────
create materialized view if not exists player_sim_career as
  select
    p.id,
    p.name,
    p.country,
    p.flag_emoji,
    p.role,
    -- Batting
    sum(b.runs_scored) filter (where not b.is_wicket)           as career_runs,
    count(*) filter (where not b.is_wicket)                     as balls_faced,
    count(*) filter (where b.runs_scored = 6)                   as sixes,
    count(*) filter (where b.runs_scored = 4)                   as fours,
    -- Bowling
    count(*) filter (where b.is_wicket)                         as career_wickets,
    count(*) filter (where b.bowler_id = p.id)                  as balls_bowled,
    sum(b.runs_scored) filter (where b.bowler_id = p.id)        as runs_conceded,
    -- Calculated
    round(
      count(*) filter (where not b.is_wicket)::numeric /
      nullif(count(*) filter (where not b.is_wicket), 0) * 100,
      1
    )                                                           as batting_sr,
    round(
      sum(b.runs_scored) filter (where b.bowler_id = p.id)::numeric /
      nullif(count(*) filter (where b.bowler_id = p.id), 0) * 6,
      2
    )                                                           as bowling_economy
  from players p
  left join balls b on b.batter_id = p.id or b.bowler_id = p.id
  group by p.id, p.name, p.country, p.flag_emoji, p.role;

create unique index if not exists idx_player_sim_career_pk on player_sim_career(id);
grant select on player_sim_career to anon, authenticated;

-- ── SESSION TRACKING ──────────────────────────────────────────
create table if not exists user_sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  session_start timestamptz default now(),
  session_end   timestamptz,
  duration_secs integer,
  pages_visited integer default 0,
  matches_played integer default 0,
  device_type   text,   -- 'mobile','tablet','desktop'
  country_code  text
);

create index if not exists idx_sessions_user on user_sessions(user_id);
create index if not exists idx_sessions_start on user_sessions(session_start);

-- Function: track analytics event
create or replace function track_event(
  p_user_id   uuid,
  p_session   text,
  p_event     text,
  p_props     jsonb default '{}',
  p_page      text default null
) returns void language sql as $$
  insert into analytics_events (user_id, session_id, event, properties, page)
  values (p_user_id, p_session, p_event, p_props, p_page);
$$;

-- ── REFERRAL SYSTEM ───────────────────────────────────────────
create table if not exists referrals (
  id            uuid primary key default uuid_generate_v4(),
  referrer_id   uuid references auth.users(id) on delete cascade,
  referred_id   uuid references auth.users(id) on delete cascade,
  referral_code text not null,
  converted     boolean default false,
  reward_given  boolean default false,
  created_at    timestamptz default now(),
  unique(referrer_id, referred_id)
);

alter table referrals enable row level security;
create policy "Users see own referrals" on referrals
  for all using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- Add referral code to user profiles
alter table user_profiles
  add column if not exists referral_code    text unique default substr(md5(random()::text), 0, 9),
  add column if not exists referred_by      uuid references auth.users(id),
  add column if not exists referral_credits integer default 0;

-- Function: award referral bonus (1 free Pro match per referral who upgrades)
create or replace function award_referral_bonus(p_referred_id uuid)
returns void language plpgsql as $$
declare
  ref referrals%rowtype;
begin
  select * into ref from referrals where referred_id = p_referred_id and not reward_given;
  if not found then return; end if;

  update user_profiles set referral_credits = referral_credits + 1
  where id = ref.referrer_id;

  update referrals set converted = true, reward_given = true
  where id = ref.id;

  insert into notifications (user_id, type, title, body)
  values (ref.referrer_id, 'system', 'Referral bonus!',
          'Your friend just upgraded. You earned 1 bonus match credit!');
end;
$$;

-- ── INDEXES FOR PERFORMANCE ───────────────────────────────────
create index if not exists idx_balls_outcome     on balls(outcome);
create index if not exists idx_balls_over        on balls(over_number);
create index if not exists idx_balls_created     on balls(created_at);
create index if not exists idx_matches_format    on matches(format);
create index if not exists idx_matches_created   on matches(created_at);
create index if not exists idx_matches_winner    on matches(winner);
