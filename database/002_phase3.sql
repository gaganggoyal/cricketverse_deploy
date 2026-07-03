-- ============================================================
-- MIGRATION 002 — Phase 3 additions
-- Run in Supabase SQL editor after 001_initial_schema.sql
-- ============================================================

-- Add Stripe billing columns to user_profiles
alter table user_profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists matches_this_month     integer default 0,
  add column if not exists last_match_reset        date default current_date;

-- Add indexes
create index if not exists idx_user_profiles_stripe on user_profiles(stripe_customer_id);

-- Function: auto-reset monthly match counter
create or replace function reset_monthly_match_count()
returns void language plpgsql as $$
begin
  update user_profiles
  set matches_this_month = 0,
      last_match_reset   = current_date
  where last_match_reset < date_trunc('month', current_date);
end;
$$;

-- Function: increment match counter (called after each match is created)
create or replace function increment_user_match_count(p_user_id uuid)
returns void language plpgsql as $$
begin
  -- Reset if new month
  update user_profiles
  set matches_this_month = 0,
      last_match_reset   = current_date
  where id = p_user_id
    and last_match_reset < date_trunc('month', current_date);

  -- Increment
  update user_profiles
  set matches_this_month = matches_this_month + 1,
      matches_played     = matches_played + 1
  where id = p_user_id;
end;
$$;

-- Function: check if user can start a new match
create or replace function can_start_match(p_user_id uuid)
returns boolean language sql as $$
  select case
    when plan in ('pro', 'elite') then true
    when plan = 'free' and matches_this_month < 5 then true
    else false
  end
  from user_profiles where id = p_user_id;
$$;

-- Add form_history to players for dynamic form tracking
alter table players
  add column if not exists recent_sim_scores  integer[] default '{}',
  add column if not exists recent_sim_wickets integer[] default '{}';

-- Function: update player form after match
create or replace function update_player_form_after_match(
  p_player_id uuid,
  p_runs integer,
  p_wickets integer
) returns void language plpgsql as $$
declare
  new_scores  integer[];
  new_wickets integer[];
  new_form    integer;
begin
  select recent_sim_scores, recent_sim_wickets
  into new_scores, new_wickets
  from players where id = p_player_id;

  -- Keep last 5 performances
  new_scores  := array_append(new_scores,  p_runs)[array_length(array_append(new_scores, p_runs), 1) - 4 : array_length(array_append(new_scores, p_runs), 1)];
  new_wickets := array_append(new_wickets, p_wickets)[array_length(array_append(new_wickets, p_wickets), 1) - 4 : array_length(array_append(new_wickets, p_wickets), 1)];

  -- Recompute form
  new_form := greatest(40, least(98,
    case
      when array_length(new_scores, 1) > 0
        then cast((select avg(x) from unnest(new_scores) x) * 1.2 + 30 as integer)
      else 75
    end
  ));

  update players
  set recent_sim_scores  = new_scores,
      recent_sim_wickets = new_wickets,
      form               = new_form
  where id = p_player_id;
end;
$$;

-- Add share token to matches (for replay sharing)
alter table matches
  add column if not exists share_token text unique,
  add column if not exists is_public   boolean default false;

create unique index if not exists idx_matches_share_token on matches(share_token) where share_token is not null;

-- Generate share token function
create or replace function generate_share_token()
returns text language sql as $$
  select encode(gen_random_bytes(8), 'hex');
$$;

-- Leaderboard view (aggregates from balls table)
create or replace view leaderboard_batters as
  select
    p.id,
    p.name,
    p.country,
    p.flag_emoji,
    sum(b.runs_scored) as total_runs,
    count(*)           as balls_faced,
    round(sum(b.runs_scored)::numeric / nullif(count(*),0) * 100, 1) as strike_rate,
    max(case when match_innings.batter_max = b.batter_id then match_innings.max_runs else 0 end) as high_score
  from balls b
  join players p on p.id = b.batter_id
  left join (
    select innings_id, batter_id, max(runs_scored) as batter_max, sum(runs_scored) as max_runs
    from balls group by innings_id, batter_id
  ) match_innings on match_innings.innings_id = b.innings_id and match_innings.batter_id = b.batter_id
  where b.is_wicket = false
  group by p.id, p.name, p.country, p.flag_emoji
  order by total_runs desc;

create or replace view leaderboard_bowlers as
  select
    p.id,
    p.name,
    p.country,
    p.flag_emoji,
    count(*) filter (where b.is_wicket = true)  as total_wickets,
    count(*)                                     as balls_bowled,
    round(count(*)::numeric / 6, 1)             as overs,
    round(
      sum(b.runs_scored)::numeric / nullif(count(*), 0) * 6, 2
    ) as economy
  from balls b
  join players p on p.id = b.bowler_id
  group by p.id, p.name, p.country, p.flag_emoji
  order by total_wickets desc;

-- Grant read access to leaderboard views
grant select on leaderboard_batters to anon, authenticated;
grant select on leaderboard_bowlers to anon, authenticated;
