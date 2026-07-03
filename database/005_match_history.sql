-- ============================================================
-- 005 — MATCH HISTORY
-- Per-user completed-match snapshots powering the
-- "Your previous matches" dashboard. Full scorecards are kept
-- as JSONB because the sim runs client-side against the local
-- player dataset (not the players table), so there are no FK
-- rows to point at.
-- Run in the Supabase SQL editor after 004_phase5.sql.
-- ============================================================

create table if not exists match_history (
  id          uuid primary key,                 -- client-generated match id
  user_id     uuid not null references auth.users(id) on delete cascade,
  played_at   timestamptz not null default now(),
  format      text not null default '',
  stadium     text not null default '',
  team_a_name text not null default 'Team A',
  team_b_name text not null default 'Team B',
  winner_name text not null default '',
  margin      text not null default '',
  potm        jsonb,                            -- { name, line }
  innings     jsonb not null,                   -- [InningsCard, InningsCard]
  created_at  timestamptz default now()
);

create index if not exists idx_match_history_user
  on match_history (user_id, played_at desc);

alter table match_history enable row level security;

create policy "Users manage own match history" on match_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
