-- QUEUE/2 Phase 6 roulette core.
-- Owner module: roulette. Server-authoritative round results, spendable boost
-- balance, pity, cooldown, 60-slot reel snapshots and append-only history.

ALTER TABLE app.play_notifications
  DROP CONSTRAINT IF EXISTS app_play_notifications_type_chk;

ALTER TABLE app.play_notifications
  ADD CONSTRAINT app_play_notifications_type_chk CHECK (
    notification_type IN (
      'session-confirmation',
      'scheduled-session',
      'reminder-sent',
      'live-session',
      'terminal-request',
      'push-failure',
      'push-disabled',
      'roulette-result-locked',
      'roulette-result-discarded'
    )
  );

CREATE TABLE IF NOT EXISTS app.roulette_boost_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  cap integer NOT NULL DEFAULT 600,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_boost_balances_amount_chk CHECK (
    balance >= 0 AND cap = 600 AND balance <= cap
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_boost_balances_duo_uidx
  ON app.roulette_boost_balances (duo_id);

COMMENT ON TABLE app.roulette_boost_balances IS
  'Owner module: roulette. Duo spendable boost balance capped at 600; lifetime XP remains untouched.';
COMMENT ON COLUMN app.roulette_boost_balances.balance IS
  'Server-owned spendable boost balance derived from shared duo facts and explicit ledger entries.';

CREATE TABLE IF NOT EXISTS app.roulette_pity_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  draws_since_epic_or_higher integer NOT NULL DEFAULT 0,
  last_epic_or_higher_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_pity_state_non_negative_chk CHECK (
    draws_since_epic_or_higher >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_pity_state_duo_uidx
  ON app.roulette_pity_state (duo_id);

COMMENT ON TABLE app.roulette_pity_state IS
  'Owner module: roulette. Duo pity counter updated exactly once per persisted result.';
COMMENT ON COLUMN app.roulette_pity_state.draws_since_epic_or_higher IS
  'Non-negative count of persisted results since the last Epic or Legendary outcome.';

CREATE TABLE IF NOT EXISTS app.roulette_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'active',
  result_library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE RESTRICT,
  result_catalog_game_id uuid REFERENCES catalog.games(id) ON DELETE RESTRICT,
  result_rarity varchar(16) NOT NULL,
  boost_spent boolean NOT NULL DEFAULT false,
  boost_ledger_id uuid,
  pity_before integer NOT NULL DEFAULT 0,
  pity_after integer NOT NULL DEFAULT 0,
  weekend_multiplier_applied boolean NOT NULL DEFAULT false,
  selected_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  resolved_by_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_at timestamptz NOT NULL DEFAULT now(),
  revealed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_rounds_status_chk CHECK (
    status IN ('active', 'revealing', 'pending_invitation', 'locked', 'discarded', 'cancelled')
  ),
  CONSTRAINT app_roulette_rounds_rarity_chk CHECK (
    result_rarity IN ('common', 'rare', 'epic', 'legendary')
  ),
  CONSTRAINT app_roulette_rounds_pity_non_negative_chk CHECK (
    pity_before >= 0 AND pity_after >= 0
  ),
  CONSTRAINT app_roulette_rounds_resolution_shape_chk CHECK (
    (status IN ('locked', 'discarded', 'cancelled') AND resolved_at IS NOT NULL)
    OR (status IN ('active', 'revealing', 'pending_invitation'))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_rounds_active_duo_uidx
  ON app.roulette_rounds (duo_id)
  WHERE status IN ('active', 'revealing', 'pending_invitation');
CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_rounds_idempotency_uidx
  ON app.roulette_rounds (duo_id, idempotency_key);
CREATE INDEX IF NOT EXISTS app_roulette_rounds_duo_status_idx
  ON app.roulette_rounds (duo_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS app_roulette_rounds_result_idx
  ON app.roulette_rounds (duo_id, result_library_game_id);

COMMENT ON TABLE app.roulette_rounds IS
  'Owner module: roulette. server-persisted authoritative result before browser reveal; one active/revealing/pending invitation per duo.';
COMMENT ON COLUMN app.roulette_rounds.idempotency_key IS
  'Caller-provided key scoped to duo so replayed or concurrent spin requests converge.';
COMMENT ON COLUMN app.roulette_rounds.boost_ledger_id IS
  'Optional pointer to the boost spend/refund fact for this round; written by server transaction code.';

CREATE TABLE IF NOT EXISTS app.roulette_round_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES app.roulette_rounds(id) ON DELETE CASCADE,
  slot_index smallint NOT NULL,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE RESTRICT,
  catalog_game_id uuid REFERENCES catalog.games(id) ON DELETE RESTRICT,
  rarity varchar(16) NOT NULL,
  title_snapshot varchar(160) NOT NULL,
  cover_url_snapshot text,
  selected_slot boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_round_entries_slot_chk CHECK (slot_index BETWEEN 1 AND 60),
  CONSTRAINT app_roulette_round_entries_rarity_chk CHECK (
    rarity IN ('common', 'rare', 'epic', 'legendary')
  ),
  CONSTRAINT app_roulette_round_entries_title_chk CHECK (
    char_length(title_snapshot) BETWEEN 1 AND 160
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_round_entries_slot_uidx
  ON app.roulette_round_entries (duo_id, round_id, slot_index);
CREATE INDEX IF NOT EXISTS app_roulette_round_entries_round_idx
  ON app.roulette_round_entries (duo_id, round_id);

COMMENT ON TABLE app.roulette_round_entries IS
  'Owner module: roulette. Persisted 60-slot reel snapshot so replay and both-member resume do not depend on regenerated browser state.';
COMMENT ON COLUMN app.roulette_round_entries.selected_slot IS
  'Marks the visual slot aligned with the already persisted authoritative result.';

CREATE TABLE IF NOT EXISTS app.roulette_boost_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  ledger_key text NOT NULL,
  source_type varchar(40) NOT NULL,
  source_id uuid NOT NULL,
  round_id uuid REFERENCES app.roulette_rounds(id) ON DELETE SET NULL,
  amount_delta integer NOT NULL,
  reason_code varchar(80) NOT NULL,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_boost_ledger_delta_chk CHECK (amount_delta <> 0),
  CONSTRAINT app_roulette_boost_ledger_source_type_chk CHECK (
    source_type IN ('xp-award', 'roulette-round', 'roulette-refund', 'adjustment', 'rebuild')
  ),
  CONSTRAINT app_roulette_boost_ledger_reason_chk CHECK (
    char_length(reason_code) BETWEEN 1 AND 80
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_boost_ledger_key_uidx
  ON app.roulette_boost_ledger (duo_id, ledger_key);
CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_boost_ledger_source_uidx
  ON app.roulette_boost_ledger (duo_id, source_type, source_id, reason_code);
CREATE INDEX IF NOT EXISTS app_roulette_boost_ledger_duo_created_idx
  ON app.roulette_boost_ledger (duo_id, created_at DESC);

COMMENT ON TABLE app.roulette_boost_ledger IS
  'Owner module: roulette. Append-only boost balance facts with signed non-zero deltas and unique keys for exactly-once spend/refund.';
COMMENT ON COLUMN app.roulette_boost_ledger.amount_delta IS
  'Signed boost balance delta; positive for earned/refunded boost and negative for spend.';

CREATE TABLE IF NOT EXISTS app.roulette_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE CASCADE,
  round_id uuid REFERENCES app.roulette_rounds(id) ON DELETE SET NULL,
  remaining_rounds integer NOT NULL DEFAULT 3,
  weight_multiplier numeric(4, 3) NOT NULL DEFAULT 0.500,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_cooldowns_remaining_chk CHECK (remaining_rounds >= 0),
  CONSTRAINT app_roulette_cooldowns_multiplier_chk CHECK (
    weight_multiplier > 0 AND weight_multiplier <= 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_cooldowns_duo_game_uidx
  ON app.roulette_cooldowns (duo_id, library_game_id);
CREATE INDEX IF NOT EXISTS app_roulette_cooldowns_duo_remaining_idx
  ON app.roulette_cooldowns (duo_id, remaining_rounds, updated_at DESC);

COMMENT ON TABLE app.roulette_cooldowns IS
  'Owner module: roulette. Light discounted probability state for recently discarded/non-locked results; never makes games impossible.';
COMMENT ON COLUMN app.roulette_cooldowns.weight_multiplier IS
  'Probability multiplier such as 0.500 while cooldown is active.';

CREATE TABLE IF NOT EXISTS app.roulette_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  round_id uuid REFERENCES app.roulette_rounds(id) ON DELETE SET NULL,
  event_key text NOT NULL,
  event_type varchar(32) NOT NULL,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roulette_history_events_type_chk CHECK (
    event_type IN ('started', 'revealed', 'replayed', 'locked', 'discarded', 'boost-spent', 'boost-refunded', 'refunded')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_roulette_history_events_key_uidx
  ON app.roulette_history_events (duo_id, event_key);
CREATE INDEX IF NOT EXISTS app_roulette_history_events_duo_created_idx
  ON app.roulette_history_events (duo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_roulette_history_events_round_idx
  ON app.roulette_history_events (duo_id, round_id);

COMMENT ON TABLE app.roulette_history_events IS
  'Owner module: roulette. Append-only history facts for started, revealed, replayed, locked, discarded and refunded roulette events.';
COMMENT ON COLUMN app.roulette_history_events.event_key IS
  'Duo-scoped idempotency key for exactly-once history and audit facts.';

CREATE OR REPLACE FUNCTION app.enforce_roulette_round_library_duo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, catalog, auth, ops, pg_catalog
AS $$
DECLARE
  library_duo_id uuid;
  library_catalog_game_id uuid;
BEGIN
  IF NOT app.has_duo_membership(app.current_user_id(), NEW.duo_id) THEN
    RETURN NEW;
  END IF;

  SELECT library.duo_id, library.catalog_game_id
  INTO library_duo_id, library_catalog_game_id
  FROM app.duo_library_games AS library
  WHERE library.id = NEW.result_library_game_id;

  IF library_duo_id IS NULL THEN
    RAISE EXCEPTION 'roulette_result_library_game_not_found' USING ERRCODE = '23503';
  END IF;

  IF library_duo_id IS DISTINCT FROM NEW.duo_id THEN
    RAISE EXCEPTION 'roulette_round_library_duo_mismatch' USING ERRCODE = '23514';
  END IF;

  IF NEW.result_catalog_game_id IS NOT NULL
    AND NEW.result_catalog_game_id IS DISTINCT FROM library_catalog_game_id THEN
    RAISE EXCEPTION 'roulette_round_catalog_mismatch' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_roulette_rounds_library_duo_trg ON app.roulette_rounds;
CREATE TRIGGER app_roulette_rounds_library_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, result_library_game_id, result_catalog_game_id
  ON app.roulette_rounds
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_roulette_round_library_duo();

CREATE OR REPLACE FUNCTION app.enforce_roulette_entry_duo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, catalog, auth, ops, pg_catalog
AS $$
DECLARE
  round_duo_id uuid;
  library_duo_id uuid;
  library_catalog_game_id uuid;
BEGIN
  IF NOT app.has_duo_membership(app.current_user_id(), NEW.duo_id) THEN
    RETURN NEW;
  END IF;

  SELECT round_row.duo_id
  INTO round_duo_id
  FROM app.roulette_rounds AS round_row
  WHERE round_row.id = NEW.round_id;

  IF round_duo_id IS NULL THEN
    RAISE EXCEPTION 'roulette_entry_round_not_found' USING ERRCODE = '23503';
  END IF;

  SELECT library.duo_id, library.catalog_game_id
  INTO library_duo_id, library_catalog_game_id
  FROM app.duo_library_games AS library
  WHERE library.id = NEW.library_game_id;

  IF library_duo_id IS NULL THEN
    RAISE EXCEPTION 'roulette_entry_library_game_not_found' USING ERRCODE = '23503';
  END IF;

  IF round_duo_id IS DISTINCT FROM NEW.duo_id
    OR library_duo_id IS DISTINCT FROM NEW.duo_id THEN
    RAISE EXCEPTION 'roulette_entry_duo_mismatch' USING ERRCODE = '23514';
  END IF;

  IF NEW.catalog_game_id IS NOT NULL
    AND NEW.catalog_game_id IS DISTINCT FROM library_catalog_game_id THEN
    RAISE EXCEPTION 'roulette_entry_catalog_mismatch' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_roulette_round_entries_duo_trg ON app.roulette_round_entries;
CREATE TRIGGER app_roulette_round_entries_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, round_id, library_game_id, catalog_game_id
  ON app.roulette_round_entries
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_roulette_entry_duo();

CREATE OR REPLACE FUNCTION app.enforce_roulette_effect_duo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, catalog, auth, ops, pg_catalog
AS $$
DECLARE
  round_duo_id uuid;
  library_duo_id uuid;
BEGIN
  IF NOT app.has_duo_membership(app.current_user_id(), NEW.duo_id) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'roulette_boost_ledger' THEN
    IF NEW.round_id IS NOT NULL THEN
      SELECT round_row.duo_id INTO round_duo_id
      FROM app.roulette_rounds AS round_row
      WHERE round_row.id = NEW.round_id;

      IF round_duo_id IS NULL THEN
        RAISE EXCEPTION 'roulette_ledger_round_not_found' USING ERRCODE = '23503';
      END IF;

      IF round_duo_id IS DISTINCT FROM NEW.duo_id THEN
        RAISE EXCEPTION 'roulette_ledger_round_duo_mismatch' USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NEW.source_type IN ('roulette-round', 'roulette-refund') THEN
      SELECT round_row.duo_id INTO round_duo_id
      FROM app.roulette_rounds AS round_row
      WHERE round_row.id = NEW.source_id;

      IF round_duo_id IS NULL THEN
        RAISE EXCEPTION 'roulette_ledger_source_round_not_found' USING ERRCODE = '23503';
      END IF;

      IF round_duo_id IS DISTINCT FROM NEW.duo_id THEN
        RAISE EXCEPTION 'roulette_ledger_source_duo_mismatch' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'roulette_cooldowns' THEN
    SELECT library.duo_id INTO library_duo_id
    FROM app.duo_library_games AS library
    WHERE library.id = NEW.library_game_id;

    IF library_duo_id IS NULL THEN
      RAISE EXCEPTION 'roulette_cooldown_library_game_not_found' USING ERRCODE = '23503';
    END IF;

    IF library_duo_id IS DISTINCT FROM NEW.duo_id THEN
      RAISE EXCEPTION 'roulette_cooldown_library_duo_mismatch' USING ERRCODE = '23514';
    END IF;

    IF NEW.round_id IS NOT NULL THEN
      SELECT round_row.duo_id INTO round_duo_id
      FROM app.roulette_rounds AS round_row
      WHERE round_row.id = NEW.round_id;

      IF round_duo_id IS NULL THEN
        RAISE EXCEPTION 'roulette_cooldown_round_not_found' USING ERRCODE = '23503';
      END IF;

      IF round_duo_id IS DISTINCT FROM NEW.duo_id THEN
        RAISE EXCEPTION 'roulette_cooldown_round_duo_mismatch' USING ERRCODE = '23514';
      END IF;
    END IF;
  ELSE
    IF NEW.round_id IS NOT NULL THEN
      SELECT round_row.duo_id INTO round_duo_id
      FROM app.roulette_rounds AS round_row
      WHERE round_row.id = NEW.round_id;

      IF round_duo_id IS NULL THEN
        RAISE EXCEPTION 'roulette_history_round_not_found' USING ERRCODE = '23503';
      END IF;

      IF round_duo_id IS DISTINCT FROM NEW.duo_id THEN
        RAISE EXCEPTION 'roulette_history_round_duo_mismatch' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_roulette_boost_ledger_duo_trg ON app.roulette_boost_ledger;
CREATE TRIGGER app_roulette_boost_ledger_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, source_type, source_id, round_id
  ON app.roulette_boost_ledger
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_roulette_effect_duo();

DROP TRIGGER IF EXISTS app_roulette_cooldowns_duo_trg ON app.roulette_cooldowns;
CREATE TRIGGER app_roulette_cooldowns_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, library_game_id, round_id
  ON app.roulette_cooldowns
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_roulette_effect_duo();

DROP TRIGGER IF EXISTS app_roulette_history_events_duo_trg ON app.roulette_history_events;
CREATE TRIGGER app_roulette_history_events_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, round_id
  ON app.roulette_history_events
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_roulette_effect_duo();

REVOKE ALL ON FUNCTION app.enforce_roulette_round_library_duo() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.enforce_roulette_entry_duo() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.enforce_roulette_effect_duo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.enforce_roulette_round_library_duo() TO queue2_app_runtime, queue2_worker;
GRANT EXECUTE ON FUNCTION app.enforce_roulette_entry_duo() TO queue2_app_runtime, queue2_worker;
GRANT EXECUTE ON FUNCTION app.enforce_roulette_effect_duo() TO queue2_app_runtime, queue2_worker;

ALTER TABLE app.roulette_boost_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_boost_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_boost_balances_select_members ON app.roulette_boost_balances;
DROP POLICY IF EXISTS app_roulette_boost_balances_insert_members ON app.roulette_boost_balances;
DROP POLICY IF EXISTS app_roulette_boost_balances_update_members ON app.roulette_boost_balances;
CREATE POLICY app_roulette_boost_balances_select_members ON app.roulette_boost_balances
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_boost_balances_insert_members ON app.roulette_boost_balances
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_boost_balances_update_members ON app.roulette_boost_balances
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.roulette_pity_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_pity_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_pity_state_select_members ON app.roulette_pity_state;
DROP POLICY IF EXISTS app_roulette_pity_state_insert_members ON app.roulette_pity_state;
DROP POLICY IF EXISTS app_roulette_pity_state_update_members ON app.roulette_pity_state;
CREATE POLICY app_roulette_pity_state_select_members ON app.roulette_pity_state
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_pity_state_insert_members ON app.roulette_pity_state
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_pity_state_update_members ON app.roulette_pity_state
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.roulette_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_rounds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_rounds_select_members ON app.roulette_rounds;
DROP POLICY IF EXISTS app_roulette_rounds_insert_members ON app.roulette_rounds;
DROP POLICY IF EXISTS app_roulette_rounds_update_members ON app.roulette_rounds;
CREATE POLICY app_roulette_rounds_select_members ON app.roulette_rounds
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_rounds_insert_members ON app.roulette_rounds
  FOR INSERT TO PUBLIC
  WITH CHECK (
    selected_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_roulette_rounds_update_members ON app.roulette_rounds
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      resolved_by_user_id IS NULL
      OR resolved_by_user_id = app.current_user_id()
    )
  );

ALTER TABLE app.roulette_round_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_round_entries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_round_entries_select_members ON app.roulette_round_entries;
DROP POLICY IF EXISTS app_roulette_round_entries_insert_members ON app.roulette_round_entries;
CREATE POLICY app_roulette_round_entries_select_members ON app.roulette_round_entries
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_round_entries_insert_members ON app.roulette_round_entries
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.roulette_boost_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_boost_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_boost_ledger_select_members ON app.roulette_boost_ledger;
DROP POLICY IF EXISTS app_roulette_boost_ledger_insert_members ON app.roulette_boost_ledger;
CREATE POLICY app_roulette_boost_ledger_select_members ON app.roulette_boost_ledger
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_boost_ledger_insert_members ON app.roulette_boost_ledger
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      actor_user_id IS NULL
      OR actor_user_id = app.current_user_id()
    )
  );

ALTER TABLE app.roulette_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_cooldowns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_cooldowns_select_members ON app.roulette_cooldowns;
DROP POLICY IF EXISTS app_roulette_cooldowns_insert_members ON app.roulette_cooldowns;
DROP POLICY IF EXISTS app_roulette_cooldowns_update_members ON app.roulette_cooldowns;
CREATE POLICY app_roulette_cooldowns_select_members ON app.roulette_cooldowns
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_cooldowns_insert_members ON app.roulette_cooldowns
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_cooldowns_update_members ON app.roulette_cooldowns
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.roulette_history_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.roulette_history_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_roulette_history_events_select_members ON app.roulette_history_events;
DROP POLICY IF EXISTS app_roulette_history_events_insert_members ON app.roulette_history_events;
CREATE POLICY app_roulette_history_events_select_members ON app.roulette_history_events
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_roulette_history_events_insert_members ON app.roulette_history_events
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      actor_user_id IS NULL
      OR actor_user_id = app.current_user_id()
    )
  );

GRANT SELECT, INSERT ON app.roulette_boost_balances TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (balance, updated_at) ON app.roulette_boost_balances TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_boost_balances TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_pity_state TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (draws_since_epic_or_higher, last_epic_or_higher_at, updated_at)
  ON app.roulette_pity_state TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_pity_state TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_rounds TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (
  status,
  boost_ledger_id,
  revealed_at,
  resolved_at,
  resolved_by_user_id,
  metadata,
  updated_at
) ON app.roulette_rounds TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_rounds TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_round_entries TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_round_entries TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_boost_ledger TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_boost_ledger TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_cooldowns TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (round_id, remaining_rounds, weight_multiplier, updated_at)
  ON app.roulette_cooldowns TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_cooldowns TO queue2_readonly;

GRANT SELECT, INSERT ON app.roulette_history_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.roulette_history_events TO queue2_readonly;
