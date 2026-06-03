-- QUEUE/2 Phase 2 duo library foundation.
-- Owner module: library. Duo-scoped platform choices and shared library state.

CREATE TABLE IF NOT EXISTS app.member_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  platform varchar(40) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_member_platforms_platform_chk CHECK (
    platform IN ('pc', 'playstation', 'xbox', 'switch', 'steam-deck')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_member_platforms_user_platform_uidx
  ON app.member_platforms (user_id, platform);
CREATE INDEX IF NOT EXISTS app_member_platforms_duo_platform_idx
  ON app.member_platforms (duo_id, platform, enabled);

COMMENT ON TABLE app.member_platforms IS
  'Owner module: library. Per-member playable platform choices inside an authorized duo.';
COMMENT ON COLUMN app.member_platforms.enabled IS
  'Disabled rows preserve audit-friendly history without granting DELETE to runtime roles.';

CREATE TABLE IF NOT EXISTS app.duo_library_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'wishlist',
  added_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  status_updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_duo_library_games_status_chk CHECK (
    status IN ('wishlist', 'jogando', 'pausado', 'zerado', 'dropado')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_duo_library_games_duo_catalog_uidx
  ON app.duo_library_games (duo_id, catalog_game_id);
CREATE INDEX IF NOT EXISTS app_duo_library_games_duo_status_idx
  ON app.duo_library_games (duo_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_duo_library_games_catalog_idx
  ON app.duo_library_games (catalog_game_id);

COMMENT ON TABLE app.duo_library_games IS
  'Owner module: library. Shared duo game queue status; exactly one row per duo/catalog game.';
COMMENT ON COLUMN app.duo_library_games.status IS
  'Phase 2 allows wishlist, jogando and pausado mutations; zerado/dropado are future states requiring Phase 4 confirmation.';

CREATE OR REPLACE FUNCTION app.enforce_duo_library_jogando_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, catalog, auth, ops, pg_catalog
AS $$
DECLARE
  current_count integer;
BEGIN
  IF NEW.status <> 'jogando' THEN
    RETURN NEW;
  END IF;

  PERFORM 1
  FROM app.duos AS duo
  WHERE duo.id = NEW.duo_id
  FOR UPDATE;

  SELECT count(*)::integer
  INTO current_count
  FROM app.duo_library_games AS library_game
  WHERE library_game.duo_id = NEW.duo_id
    AND library_game.status = 'jogando'
    AND library_game.id IS DISTINCT FROM NEW.id;

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'jogando_limit_reached' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_duo_library_games_jogando_limit_trg ON app.duo_library_games;
CREATE TRIGGER app_duo_library_games_jogando_limit_trg
  BEFORE INSERT OR UPDATE OF status ON app.duo_library_games
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_duo_library_jogando_limit();

REVOKE ALL ON FUNCTION app.enforce_duo_library_jogando_limit() FROM PUBLIC;

ALTER TABLE app.member_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.member_platforms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_member_platforms_select_members ON app.member_platforms;
DROP POLICY IF EXISTS app_member_platforms_insert_own ON app.member_platforms;
DROP POLICY IF EXISTS app_member_platforms_update_own ON app.member_platforms;
CREATE POLICY app_member_platforms_select_members ON app.member_platforms
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_member_platforms_insert_own ON app.member_platforms
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_member_platforms_update_own ON app.member_platforms
  FOR UPDATE TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.duo_library_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_library_games FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_library_games_select_members ON app.duo_library_games;
DROP POLICY IF EXISTS app_duo_library_games_insert_members ON app.duo_library_games;
DROP POLICY IF EXISTS app_duo_library_games_update_members ON app.duo_library_games;
CREATE POLICY app_duo_library_games_select_members ON app.duo_library_games
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_duo_library_games_insert_members ON app.duo_library_games
  FOR INSERT TO PUBLIC
  WITH CHECK (
    added_by_user_id = app.current_user_id()
    AND status_updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_duo_library_games_update_members ON app.duo_library_games
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    status_updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

GRANT SELECT, INSERT ON app.member_platforms TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (enabled, updated_at) ON app.member_platforms TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.member_platforms TO queue2_readonly;

GRANT SELECT, INSERT ON app.duo_library_games TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, status_updated_by_user_id, updated_at) ON app.duo_library_games TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.duo_library_games TO queue2_readonly;
