-- ============================================================
-- QUICKCRIC — MySQL 8 schema (self-hosted, replaces Supabase)
--
-- Port notes vs the original Postgres/Supabase schema:
--   uuid            -> CHAR(36), default (UUID())
--   text[]          -> JSON array
--   jsonb           -> JSON
--   timestamptz     -> DATETIME (all timestamps stored in UTC)
--   numeric(a,b)    -> DECIMAL(a,b)
--   auth.users      -> our own `users` table (see 000-auth block below)
--   RLS policies    -> enforced in the app layer; MySQL has no RLS, and the
--                      browser no longer talks to the database directly
--   materialized views -> plain views (MySQL has no matviews)
--
-- Apply with:  mysql -u quickcric -p quickcric < 001_schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- AUTH — replaces Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,          -- bcrypt
  email_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  -- Set when the user signs up via an OAuth provider instead of a password.
  provider        VARCHAR(32)  NOT NULL DEFAULT 'password',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Server-side sessions. The browser only ever holds the opaque token in an
-- httpOnly cookie, so a stolen cookie can be revoked by deleting the row.
CREATE TABLE IF NOT EXISTS sessions (
  token       CHAR(64)  PRIMARY KEY,              -- sha256 of the cookie value
  user_id     CHAR(36)  NOT NULL,
  expires_at  DATETIME  NOT NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent  VARCHAR(255),
  ip          VARCHAR(45),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single-use tokens for email verification and password reset.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token       CHAR(64)    PRIMARY KEY,
  user_id     CHAR(36)    NOT NULL,
  purpose     VARCHAR(32) NOT NULL,               -- 'verify_email' | 'reset_password'
  expires_at  DATETIME    NOT NULL,
  used_at     DATETIME,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_auth_tokens_user (user_id, purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PLAYERS
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(160) NOT NULL,
  country         VARCHAR(80)  NOT NULL,
  country_code    VARCHAR(8)   NOT NULL,          -- 'IND', 'AUS', 'ENG'
  flag_emoji      VARCHAR(32),
  formats         JSON,                           -- ["T20","ODI","TEST"]
  role            VARCHAR(32)  NOT NULL,          -- Batter | Bowler | All-rounder | WK-Batter
  batting_style   VARCHAR(32),
  bowling_style   VARCHAR(64),

  -- Batting
  bat_avg         DECIMAL(5,2) DEFAULT 0,
  bat_sr          DECIMAL(6,2) DEFAULT 0,
  bat_hs          INT          DEFAULT 0,
  bat_style       VARCHAR(16)  DEFAULT 'balanced',
  bat_preferred_shots JSON,
  bat_weakness    JSON,
  bat_vs_spin     DECIMAL(4,2) DEFAULT 1.0,
  bat_vs_pace     DECIMAL(4,2) DEFAULT 1.0,

  -- Bowling
  bowl_avg        DECIMAL(5,2),
  bowl_economy    DECIMAL(4,2),
  bowl_sr         DECIMAL(5,2),
  bowl_type       VARCHAR(16),                    -- Fast | Medium | Spin
  bowl_variations JSON,
  bowl_death_econ DECIMAL(4,2),
  bowl_powerplay_econ DECIMAL(4,2),

  -- Attributes (0-100)
  stamina         INT DEFAULT 85,
  form            INT DEFAULT 75,
  pressure_handling INT DEFAULT 70,
  fitness         INT DEFAULT 85,

  -- Ground preferences
  home_flat       DECIMAL(4,2) DEFAULT 1.0,
  home_spin       DECIMAL(4,2) DEFAULT 1.0,
  home_seam       DECIMAL(4,2) DEFAULT 1.0,
  home_bouncy     DECIMAL(4,2) DEFAULT 1.0,

  -- Assets
  avatar_url      VARCHAR(512),
  jersey_number   INT,
  skill_description TEXT,

  -- Rolling simulated form (was integer[])
  recent_sim_scores  JSON,
  recent_sim_wickets JSON,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT chk_players_stamina  CHECK (stamina BETWEEN 0 AND 100),
  CONSTRAINT chk_players_form     CHECK (form BETWEEN 0 AND 100),
  CONSTRAINT chk_players_pressure CHECK (pressure_handling BETWEEN 0 AND 100),
  CONSTRAINT chk_players_fitness  CHECK (fitness BETWEEN 0 AND 100),

  KEY idx_players_country (country_code),
  KEY idx_players_role (role),
  -- Natural key for the CricAPI sync's upsert: ids are generated UUIDs, so
  -- a repeat sync has nothing else to match an existing row on. Scoped by
  -- country so two countries may field a player of the same name.
  UNIQUE KEY uq_players_name_country (name, country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- STADIUMS
-- ============================================================
CREATE TABLE IF NOT EXISTS stadiums (
  id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(160) NOT NULL,
  city            VARCHAR(80)  NOT NULL,
  country         VARCHAR(80)  NOT NULL,
  capacity        INT,
  pitch_bias      VARCHAR(16)  DEFAULT 'neutral', -- flat|spin|seam|bouncy|neutral
  avg_first_innings_score INT  DEFAULT 160,
  dew_factor      TINYINT(1)   DEFAULT 0,
  altitude        INT          DEFAULT 0,
  glb_url         VARCHAR(512),
  thumbnail_url   VARCHAR(512),
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stadiums_name_city (name, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              CHAR(36)    PRIMARY KEY,        -- == users.id
  username        VARCHAR(64),
  display_name    VARCHAR(128),
  avatar_url      VARCHAR(512),
  plan            VARCHAR(16) DEFAULT 'free',     -- free | pro | elite
  matches_played  INT DEFAULT 0,
  matches_this_month INT DEFAULT 0,
  favorite_players JSON,
  favorite_teams  JSON,

  -- Billing (was 002_phase3)
  stripe_customer_id     VARCHAR(64),
  stripe_subscription_id VARCHAR(64),
  last_match_reset       DATE DEFAULT (CURRENT_DATE),

  -- Aggregate stats (was 003_phase4)
  total_runs      INT DEFAULT 0,
  total_wickets   INT DEFAULT 0,
  total_sixes     INT DEFAULT 0,
  win_rate        DECIMAL(4,2) DEFAULT 0,
  favorite_format VARCHAR(16) DEFAULT 'T20',
  last_active_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Voice settings (was 004_phase5)
  voice_provider  VARCHAR(16) DEFAULT 'browser',  -- browser | elevenlabs | off
  voice_volume    DECIMAL(3,2) DEFAULT 0.85,
  voice_rate      DECIMAL(3,2) DEFAULT 1.05,
  elevenlabs_key  VARCHAR(255),                   -- encrypted in the app layer
  elevenlabs_voice VARCHAR(64) DEFAULT 'pNInz6obpgDQGcFmaJgB',

  -- Referrals (was 004_phase5). Code is generated by the app on profile
  -- creation; MySQL cannot default a column to a random expression.
  referral_code    VARCHAR(16),
  referred_by      CHAR(36),
  referral_credits INT DEFAULT 0,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_profiles_username (username),
  UNIQUE KEY uq_profiles_referral_code (referral_code),
  KEY idx_user_profiles_stripe (stripe_customer_id),
  CONSTRAINT fk_profiles_user     FOREIGN KEY (id)          REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_profiles_referrer FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36),
  format          VARCHAR(16) NOT NULL,           -- T5|T10|T20|ODI
  total_overs     INT         NOT NULL,
  stadium_id      CHAR(36),
  pitch_type      VARCHAR(16) NOT NULL,
  time_of_play    VARCHAR(16) NOT NULL,
  weather         VARCHAR(16) DEFAULT 'clear',

  team_a_name     VARCHAR(80) DEFAULT 'Team A',
  team_b_name     VARCHAR(80) DEFAULT 'Team B',
  team_a_players  JSON NOT NULL,                  -- array of player ids
  team_b_players  JSON NOT NULL,

  toss_winner     VARCHAR(8),                     -- 'A' | 'B'
  toss_decision   VARCHAR(8),                     -- 'bat' | 'field'

  innings1_score   INT DEFAULT 0,
  innings1_wickets INT DEFAULT 0,
  innings1_overs   DECIMAL(4,1) DEFAULT 0,
  innings2_score   INT DEFAULT 0,
  innings2_wickets INT DEFAULT 0,
  innings2_overs   DECIMAL(4,1) DEFAULT 0,
  target           INT,

  status          VARCHAR(16) DEFAULT 'pending',  -- pending|live|complete|abandoned
  winner          VARCHAR(16),                    -- A|B|tie|no_result
  win_margin      VARCHAR(64),
  man_of_match    CHAR(36),

  ai_analysis     TEXT,
  ai_ratings      JSON,

  -- Replay sharing (was 002_phase3). MySQL UNIQUE permits many NULLs, which
  -- matches the original partial index `where share_token is not null`.
  share_token     VARCHAR(64),
  is_public       TINYINT(1) DEFAULT 0,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME,

  UNIQUE KEY uq_matches_share_token (share_token),
  KEY idx_matches_user (user_id),
  KEY idx_matches_status (status),
  KEY idx_matches_format (format),
  KEY idx_matches_created (created_at),
  KEY idx_matches_winner (winner),
  CONSTRAINT fk_matches_user    FOREIGN KEY (user_id)      REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_matches_stadium FOREIGN KEY (stadium_id)   REFERENCES stadiums(id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_potm    FOREIGN KEY (man_of_match) REFERENCES players(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INNINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS innings (
  id              CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  match_id        CHAR(36),
  innings_number  INT         NOT NULL,           -- 1 or 2
  batting_team    VARCHAR(8)  NOT NULL,
  bowling_team    VARCHAR(8)  NOT NULL,

  total_runs      INT DEFAULT 0,
  total_wickets   INT DEFAULT 0,
  total_balls     INT DEFAULT 0,
  extras          INT DEFAULT 0,

  fall_of_wickets   JSON,
  batting_scorecard JSON,
  bowling_figures   JSON,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_innings_match (match_id),
  CONSTRAINT fk_innings_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- BALLS — every delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS balls (
  id              CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  match_id        CHAR(36),
  innings_id      CHAR(36),
  innings_number  INT         NOT NULL,

  over_number     INT         NOT NULL,           -- 0-indexed
  ball_number     INT         NOT NULL,           -- 1-6 within over
  over_label      VARCHAR(16) NOT NULL,

  batter_id       CHAR(36),
  bowler_id       CHAR(36),
  non_striker_id  CHAR(36),

  outcome         VARCHAR(8)  NOT NULL,           -- 0,1,2,3,4,6,W,WD,NB
  runs_scored     INT DEFAULT 0,
  is_wicket       TINYINT(1) DEFAULT 0,
  wicket_type     VARCHAR(16),
  fielder_id      CHAR(36),

  speed_kmh       INT,
  delivery_type   VARCHAR(32),
  line            VARCHAR(32),
  length          VARCHAR(32),

  pressure_index  DECIMAL(4,3),
  batter_stamina  INT,
  bowler_stamina  INT,

  commentary      TEXT,

  animation_key   VARCHAR(64),
  landing_x       DECIMAL(6,2),
  landing_z       DECIMAL(6,2),

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_balls_match (match_id),
  KEY idx_balls_innings (innings_id),
  KEY idx_balls_batter (batter_id),
  KEY idx_balls_bowler (bowler_id),
  KEY idx_balls_outcome (outcome),
  KEY idx_balls_over (over_number),
  KEY idx_balls_created (created_at),
  CONSTRAINT fk_balls_match   FOREIGN KEY (match_id)       REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_balls_innings FOREIGN KEY (innings_id)     REFERENCES innings(id) ON DELETE CASCADE,
  CONSTRAINT fk_balls_batter  FOREIGN KEY (batter_id)      REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT fk_balls_bowler  FOREIGN KEY (bowler_id)      REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT fk_balls_nonstr  FOREIGN KEY (non_striker_id) REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT fk_balls_fielder FOREIGN KEY (fielder_id)     REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36),
  name          VARCHAR(160) NOT NULL,
  format        VARCHAR(32)  NOT NULL,            -- round_robin|knockout|group_knockout
  match_format  VARCHAR(16)  NOT NULL,
  status        VARCHAR(16)  DEFAULT 'setup',     -- setup|running|complete
  winner_team   VARCHAR(80),
  teams         JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME,
  KEY idx_tournaments_user (user_id),
  CONSTRAINT fk_tournaments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournament_matches (
  id              CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  tournament_id   CHAR(36),
  round           VARCHAR(32) NOT NULL,           -- group_a|qf|sf|final
  team_a          VARCHAR(80) NOT NULL,
  team_b          VARCHAR(80) NOT NULL,
  status          VARCHAR(16) DEFAULT 'pending',
  winner          VARCHAR(80),
  score_a         VARCHAR(32),
  score_b         VARCHAR(32),
  margin          VARCHAR(64),
  match_id        CHAR(36),
  played_at       DATETIME,
  KEY idx_tournament_matches_tid (tournament_id),
  CONSTRAINT fk_tmatches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  CONSTRAINT fk_tmatches_match      FOREIGN KEY (match_id)      REFERENCES matches(id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- FANTASY
-- ============================================================
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id         CHAR(36),
  name            VARCHAR(120) NOT NULL DEFAULT 'My Fantasy XI',
  match_id        CHAR(36),
  players         JSON NOT NULL,                  -- 11 player ids
  captain_id      CHAR(36),
  vice_captain_id CHAR(36),
  total_points    DECIMAL(8,2) DEFAULT 0,
  `rank`          INT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fantasy_teams_match (match_id),
  KEY idx_fantasy_teams_user (user_id),
  CONSTRAINT fk_fantasy_user    FOREIGN KEY (user_id)         REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_fantasy_match   FOREIGN KEY (match_id)        REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_fantasy_captain FOREIGN KEY (captain_id)      REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT fk_fantasy_vice    FOREIGN KEY (vice_captain_id) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fantasy_points_log (
  id              CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  fantasy_team_id CHAR(36),
  player_id       CHAR(36),
  ball_id         CHAR(36),
  event_type      VARCHAR(32),                    -- run|four|six|wicket|catch|maiden
  points_raw      DECIMAL(6,2),
  points_final    DECIMAL(6,2),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fpl_team (fantasy_team_id),
  CONSTRAINT fk_fpl_team   FOREIGN KEY (fantasy_team_id) REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_fpl_player FOREIGN KEY (player_id)       REFERENCES players(id)       ON DELETE SET NULL,
  CONSTRAINT fk_fpl_ball   FOREIGN KEY (ball_id)         REFERENCES balls(id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MULTIPLAYER ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS multiplayer_rooms (
  id            CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  room_code     VARCHAR(32) NOT NULL,
  host_id       CHAR(36),
  guest_id      CHAR(36),
  status        VARCHAR(16) DEFAULT 'waiting',    -- waiting|playing|finished
  settings      JSON,
  match_id      CHAR(36),
  winner_id     CHAR(36),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at   DATETIME,
  UNIQUE KEY uq_rooms_code (room_code),
  KEY idx_rooms_host (host_id),
  KEY idx_rooms_guest (guest_id),
  CONSTRAINT fk_rooms_host   FOREIGN KEY (host_id)   REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_rooms_guest  FOREIGN KEY (guest_id)  REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_rooms_winner FOREIGN KEY (winner_id) REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_rooms_match  FOREIGN KEY (match_id)  REFERENCES matches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NOTIFICATIONS
-- Supabase Realtime pushed these to the browser; without it the client
-- polls /api/notifications instead (see NotificationSystem.tsx).
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id     CHAR(36),
  type        VARCHAR(32)  NOT NULL,              -- match_ready|challenge|tournament_update
  title       VARCHAR(160) NOT NULL,
  body        TEXT,
  data        JSON,
  `read`      TINYINT(1) DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id, `read`),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS achievement_defs (
  code        VARCHAR(64)  PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon        VARCHAR(16)  NOT NULL,
  rarity      VARCHAR(16)  DEFAULT 'common'       -- common|rare|epic|legendary
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS achievements (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id     CHAR(36),
  code        VARCHAR(64)  NOT NULL,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  earned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_achievements_user_code (user_id, code),
  KEY idx_achievements_user (user_id),
  CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- FEATURE FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  `key`       VARCHAR(64) PRIMARY KEY,
  enabled     TINYINT(1) DEFAULT 1,
  rollout_pct INT DEFAULT 100,
  description VARCHAR(255),
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by  CHAR(36),
  CONSTRAINT chk_flags_rollout CHECK (rollout_pct BETWEEN 0 AND 100),
  CONSTRAINT fk_flags_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id          CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  user_id     CHAR(36),
  session_id  VARCHAR(64),
  event       VARCHAR(64)  NOT NULL,
  properties  JSON,
  page        VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_analytics_event (event),
  KEY idx_analytics_user (user_id),
  KEY idx_analytics_created (created_at),
  CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
  id            CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id       CHAR(36),
  session_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_end   DATETIME,
  duration_secs INT,
  pages_visited INT DEFAULT 0,
  matches_played INT DEFAULT 0,
  device_type   VARCHAR(16),                      -- mobile|tablet|desktop
  country_code  VARCHAR(8),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_start (session_start),
  CONSTRAINT fk_usessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  user_id     CHAR(36)    PRIMARY KEY,
  role        VARCHAR(16) DEFAULT 'admin',        -- admin|super_admin|support
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id            CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
  referrer_id   CHAR(36),
  referred_id   CHAR(36),
  referral_code VARCHAR(16) NOT NULL,
  converted     TINYINT(1) DEFAULT 0,
  reward_given  TINYINT(1) DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_referrals_pair (referrer_id, referred_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MATCH HISTORY — the one table that carried real data on Supabase
-- ============================================================
CREATE TABLE IF NOT EXISTS match_history (
  id          CHAR(36)    PRIMARY KEY,            -- client-generated match id
  user_id     CHAR(36)    NOT NULL,
  played_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  format      VARCHAR(16) NOT NULL DEFAULT '',
  stadium     VARCHAR(160) NOT NULL DEFAULT '',
  team_a_name VARCHAR(80) NOT NULL DEFAULT 'Team A',
  team_b_name VARCHAR(80) NOT NULL DEFAULT 'Team B',
  winner_name VARCHAR(80) NOT NULL DEFAULT '',
  margin      VARCHAR(64) NOT NULL DEFAULT '',
  potm        JSON,                               -- { name, line }
  innings     JSON NOT NULL,                      -- [InningsCard, InningsCard]
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_match_history_user (user_id, played_at DESC),
  CONSTRAINT fk_match_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VIEWS
-- Postgres had two of these as MATERIALIZED views. MySQL has no such
-- thing, so they are plain views — correct at read time, at the cost of
-- computing on each query. These are admin/leaderboard reads, not hot
-- paths; revisit with summary tables if `balls` ever gets large.
-- ============================================================

CREATE OR REPLACE VIEW leaderboard_batters AS
  SELECT
    p.id, p.name, p.country, p.flag_emoji,
    SUM(b.runs_scored)                                        AS total_runs,
    COUNT(*)                                                  AS balls_faced,
    ROUND(SUM(b.runs_scored) / NULLIF(COUNT(*), 0) * 100, 1)  AS strike_rate
  FROM balls b
  JOIN players p ON p.id = b.batter_id
  WHERE b.is_wicket = 0
  GROUP BY p.id, p.name, p.country, p.flag_emoji
  ORDER BY total_runs DESC;

CREATE OR REPLACE VIEW leaderboard_bowlers AS
  SELECT
    p.id, p.name, p.country, p.flag_emoji,
    SUM(b.is_wicket = 1)                                     AS total_wickets,
    COUNT(*)                                                 AS balls_bowled,
    ROUND(COUNT(*) / 6, 1)                                   AS overs,
    ROUND(SUM(b.runs_scored) / NULLIF(COUNT(*), 0) * 6, 2)   AS economy
  FROM balls b
  JOIN players p ON p.id = b.bowler_id
  GROUP BY p.id, p.name, p.country, p.flag_emoji
  ORDER BY total_wickets DESC;

CREATE OR REPLACE VIEW fantasy_global_leaderboard AS
  SELECT
    ft.id, up.username, up.display_name,
    ft.name AS team_name, ft.total_points, ft.`rank`,
    m.format, m.created_at AS match_date
  FROM fantasy_teams ft
  JOIN user_profiles up ON up.id = ft.user_id
  JOIN matches m        ON m.id  = ft.match_id
  ORDER BY ft.total_points DESC
  LIMIT 100;

CREATE OR REPLACE VIEW match_agg_by_format AS
  SELECT
    format, pitch_type, time_of_play,
    COUNT(*)                          AS total_matches,
    ROUND(AVG(innings1_score), 1)     AS avg_first_innings,
    ROUND(AVG(innings2_score), 1)     AS avg_second_innings,
    ROUND(AVG(innings1_wickets), 1)   AS avg_wickets,
    SUM(winner = 'A')                 AS team_a_wins,
    SUM(winner = 'B')                 AS team_b_wins,
    MAX(innings1_score)               AS highest_score,
    MIN(CASE WHEN innings1_wickets = 10 THEN innings1_score END) AS lowest_allout
  FROM matches
  WHERE status = 'complete'
  GROUP BY format, pitch_type, time_of_play;

CREATE OR REPLACE VIEW player_sim_career AS
  SELECT
    p.id, p.name, p.country, p.flag_emoji, p.role,
    SUM(CASE WHEN b.batter_id = p.id AND b.is_wicket = 0 THEN b.runs_scored ELSE 0 END) AS career_runs,
    SUM(b.batter_id = p.id AND b.is_wicket = 0)                                         AS balls_faced,
    SUM(b.batter_id = p.id AND b.runs_scored = 6)                                       AS sixes,
    SUM(b.batter_id = p.id AND b.runs_scored = 4)                                       AS fours,
    SUM(b.bowler_id = p.id AND b.is_wicket = 1)                                         AS career_wickets,
    SUM(b.bowler_id = p.id)                                                             AS balls_bowled,
    SUM(CASE WHEN b.bowler_id = p.id THEN b.runs_scored ELSE 0 END)                     AS runs_conceded
  FROM players p
  LEFT JOIN balls b ON b.batter_id = p.id OR b.bowler_id = p.id
  GROUP BY p.id, p.name, p.country, p.flag_emoji, p.role;
