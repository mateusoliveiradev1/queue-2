-- QUEUE/2 Phase 2 catalog source foundation.
-- Owner module: catalog. Stores external RAWG facts plus QUEUE/2-owned
-- conservative coop eligibility fields. Duo/private state must stay outside
-- the catalog schema.

CREATE SCHEMA IF NOT EXISTS catalog;

COMMENT ON SCHEMA catalog IS
  'Owner: catalog module. External game catalog and sourced metadata only.';

CREATE TABLE IF NOT EXISTS catalog.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rawg_id integer NOT NULL,
  slug varchar(160) NOT NULL,
  name varchar(240) NOT NULL,
  description text,
  released_at date,
  background_image_url text,
  rawg_url text NOT NULL,
  rawg_updated_at timestamptz,
  source varchar(40) NOT NULL DEFAULT 'RAWG',
  source_url text NOT NULL,
  source_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  coop_campaign_confirmed boolean NOT NULL DEFAULT false,
  coop_player_count_min smallint,
  coop_player_count_max smallint,
  coop_confirmation_source text,
  coop_confirmation_checked_at timestamptz,
  main_flow_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_games_coop_player_count_chk CHECK (
    (coop_player_count_min IS NULL AND coop_player_count_max IS NULL)
    OR (
      coop_player_count_min IS NOT NULL
      AND coop_player_count_max IS NOT NULL
      AND coop_player_count_min >= 1
      AND coop_player_count_max >= coop_player_count_min
    )
  ),
  CONSTRAINT catalog_games_main_flow_requires_confirmed_coop_chk CHECK (
    main_flow_eligible = false
    OR (
      coop_campaign_confirmed = true
      AND coop_player_count_min <= 2
      AND coop_player_count_max >= 2
      AND coop_confirmation_source IS NOT NULL
      AND coop_confirmation_checked_at IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_games_rawg_id_uidx ON catalog.games (rawg_id);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_games_slug_uidx ON catalog.games (slug);
CREATE INDEX IF NOT EXISTS catalog_games_main_flow_idx ON catalog.games (main_flow_eligible, synced_at DESC);
CREATE INDEX IF NOT EXISTS catalog_games_freshness_idx ON catalog.games (source_updated_at DESC NULLS LAST, synced_at DESC);

COMMENT ON TABLE catalog.games IS
  'Owner module: catalog. Sourced RAWG game facts and explicit QUEUE/2 coop eligibility; no duo state.';
COMMENT ON COLUMN catalog.games.source IS
  'Primary data source label shown wherever sourced catalog data is displayed.';
COMMENT ON COLUMN catalog.games.source_url IS
  'Active source URL required for RAWG attribution.';
COMMENT ON COLUMN catalog.games.main_flow_eligible IS
  'QUEUE/2-owned eligibility for the main automatic flow; never inferred blindly from RAWG tags.';

CREATE TABLE IF NOT EXISTS catalog.game_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE CASCADE,
  rawg_platform_id integer,
  platform_key varchar(40) NOT NULL,
  platform_name varchar(80) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_game_platforms_game_platform_uidx
  ON catalog.game_platforms (game_id, platform_key);
CREATE INDEX IF NOT EXISTS catalog_game_platforms_platform_idx
  ON catalog.game_platforms (platform_key, game_id);

COMMENT ON TABLE catalog.game_platforms IS
  'Owner module: catalog. Normalized platform facts from RAWG mapped to QUEUE/2 platform keys.';

CREATE TABLE IF NOT EXISTS catalog.game_genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE CASCADE,
  rawg_genre_id integer,
  slug varchar(80) NOT NULL,
  name varchar(80) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_game_genres_game_slug_uidx
  ON catalog.game_genres (game_id, slug);
CREATE INDEX IF NOT EXISTS catalog_game_genres_slug_idx
  ON catalog.game_genres (slug, game_id);

COMMENT ON TABLE catalog.game_genres IS
  'Owner module: catalog. Sourced genre labels for cards, detail pages and filtering.';

CREATE TABLE IF NOT EXISTS catalog.game_time_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE CASCADE,
  estimate_kind varchar(40) NOT NULL DEFAULT 'completion',
  minutes integer,
  source varchar(80) NOT NULL,
  source_url text,
  checked_at timestamptz NOT NULL,
  confidence varchar(32) NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_game_time_estimates_minutes_positive_chk CHECK (minutes IS NULL OR minutes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_game_time_estimates_game_kind_uidx
  ON catalog.game_time_estimates (game_id, estimate_kind);

COMMENT ON TABLE catalog.game_time_estimates IS
  'Owner module: catalog. Optional neutral completion estimates with source and freshness; absent rows mean no reliable source.';

CREATE TABLE IF NOT EXISTS catalog.game_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE CASCADE,
  availability_type varchar(40) NOT NULL,
  platform_key varchar(40),
  source varchar(80) NOT NULL,
  source_url text,
  checked_at timestamptz NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_game_availability_type_chk CHECK (availability_type IN ('free', 'game-pass')),
  CONSTRAINT catalog_game_availability_status_chk CHECK (status IN ('available', 'unavailable', 'unverified'))
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_game_availability_game_type_platform_uidx
  ON catalog.game_availability (game_id, availability_type, platform_key);
CREATE INDEX IF NOT EXISTS catalog_game_availability_lookup_idx
  ON catalog.game_availability (availability_type, platform_key, checked_at DESC);

COMMENT ON TABLE catalog.game_availability IS
  'Owner module: catalog. Optional free/Game Pass availability with source and last verification date.';

GRANT USAGE ON SCHEMA catalog TO queue2_app_runtime, queue2_worker, queue2_readonly;

GRANT SELECT ON
  catalog.games,
  catalog.game_platforms,
  catalog.game_genres,
  catalog.game_time_estimates,
  catalog.game_availability
TO queue2_app_runtime, queue2_worker, queue2_readonly;

GRANT INSERT, UPDATE ON
  catalog.games,
  catalog.game_platforms,
  catalog.game_genres,
  catalog.game_time_estimates,
  catalog.game_availability
TO queue2_worker;
