-- QUEUE/2 Phase 3 discovery foundation.
-- Owner module: discovery. Duo-scoped discovery decisions, matches, live sessions,
-- mood quiz answers and opted-in match-live push subscriptions.

CREATE TABLE IF NOT EXISTS app.discovery_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  started_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_discovery_live_sessions_status_chk CHECK (
    status IN ('active', 'ended', 'expired')
  ),
  CONSTRAINT app_discovery_live_sessions_expires_after_start_chk CHECK (
    expires_at > started_at
  ),
  CONSTRAINT app_discovery_live_sessions_ended_after_start_chk CHECK (
    ended_at IS NULL OR ended_at >= started_at
  )
);

CREATE INDEX IF NOT EXISTS app_discovery_live_sessions_duo_status_idx
  ON app.discovery_live_sessions (duo_id, status, expires_at);
CREATE INDEX IF NOT EXISTS app_discovery_live_sessions_expiry_idx
  ON app.discovery_live_sessions (expires_at)
  WHERE status = 'active';

COMMENT ON TABLE app.discovery_live_sessions IS
  'Owner module: discovery. Short-lived shared match discovery sessions for one authorized duo.';
COMMENT ON COLUMN app.discovery_live_sessions.expires_at IS
  'Live discovery sessions expire; they are not a persistent realtime channel.';

CREATE TABLE IF NOT EXISTS app.discovery_member_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE RESTRICT,
  decision varchar(20) NOT NULL,
  source_mode varchar(20) NOT NULL,
  live_session_id uuid REFERENCES app.discovery_live_sessions(id) ON DELETE SET NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  cooldown_until timestamptz,
  preference_weight smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_discovery_member_decisions_decision_chk CHECK (
    decision IN ('want', 'not_now', 'skip')
  ),
  CONSTRAINT app_discovery_member_decisions_source_mode_chk CHECK (
    source_mode IN ('deck', 'live', 'surprise', 'quiz', 'search')
  ),
  CONSTRAINT app_discovery_member_decisions_cooldown_chk CHECK (
    (decision = 'not_now' AND cooldown_until IS NOT NULL)
    OR (decision <> 'not_now' AND cooldown_until IS NULL)
  ),
  CONSTRAINT app_discovery_member_decisions_weight_chk CHECK (
    (decision = 'want' AND preference_weight > 0)
    OR (decision = 'not_now' AND preference_weight < 0)
    OR (decision = 'skip' AND preference_weight = 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_discovery_member_decisions_duo_user_game_uidx
  ON app.discovery_member_decisions (duo_id, user_id, catalog_game_id);
CREATE INDEX IF NOT EXISTS app_discovery_member_decisions_deck_exclusion_idx
  ON app.discovery_member_decisions (duo_id, user_id, catalog_game_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS app_discovery_member_decisions_cooldown_idx
  ON app.discovery_member_decisions (duo_id, cooldown_until)
  WHERE cooldown_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_discovery_member_decisions_partner_match_idx
  ON app.discovery_member_decisions (duo_id, catalog_game_id, decision);

COMMENT ON TABLE app.discovery_member_decisions IS
  'Owner module: discovery. Current per-member decision for a catalog game inside one duo.';
COMMENT ON COLUMN app.discovery_member_decisions.decision IS
  'want can form a match only with reciprocal want; not_now cools down; skip is judgment-free.';
COMMENT ON COLUMN app.discovery_member_decisions.preference_weight IS
  'Positive for want, negative for not_now, zero for skip; recommendation code owns exact scoring.';

CREATE TABLE IF NOT EXISTS app.discovery_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  catalog_game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE RESTRICT,
  matched_at timestamptz NOT NULL DEFAULT now(),
  created_from varchar(20) NOT NULL,
  first_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  second_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  reason_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  library_handoff_status varchar(20),
  library_handoff_at timestamptz,
  library_handoff_by_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_discovery_matches_created_from_chk CHECK (
    created_from IN ('deck', 'live', 'surprise', 'quiz', 'search')
  ),
  CONSTRAINT app_discovery_matches_distinct_members_chk CHECK (
    first_user_id <> second_user_id
  ),
  CONSTRAINT app_discovery_matches_library_handoff_status_chk CHECK (
    library_handoff_status IS NULL
    OR library_handoff_status IN ('wishlist', 'jogando', 'pausado')
  ),
  CONSTRAINT app_discovery_matches_library_handoff_state_chk CHECK (
    (library_handoff_status IS NULL AND library_handoff_at IS NULL)
    OR (library_handoff_status IS NOT NULL AND library_handoff_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_discovery_matches_duo_game_uidx
  ON app.discovery_matches (duo_id, catalog_game_id);
CREATE INDEX IF NOT EXISTS app_discovery_matches_history_idx
  ON app.discovery_matches (duo_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS app_discovery_matches_catalog_idx
  ON app.discovery_matches (catalog_game_id);

COMMENT ON TABLE app.discovery_matches IS
  'Owner module: discovery. Persisted match celebration/history; never auto-adds a game to the library.';
COMMENT ON COLUMN app.discovery_matches.reason_snapshot IS
  'Compact recommendation reason labels captured at match time so history does not drift with future ranking weights.';
COMMENT ON COLUMN app.discovery_matches.library_handoff_status IS
  'Explicit later library action target. Only wishlist, jogando and pausado are valid in Phase 3.';

CREATE TABLE IF NOT EXISTS app.discovery_mood_quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  quiz_round uuid NOT NULL DEFAULT gen_random_uuid(),
  question_key varchar(24) NOT NULL,
  answer_key varchar(24) NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_discovery_mood_answers_question_answer_chk CHECK (
    (
      question_key = 'energy'
      AND answer_key IN ('low', 'medium', 'high')
    )
    OR (
      question_key = 'commitment'
      AND answer_key IN ('short', 'steady', 'epic')
    )
    OR (
      question_key = 'vibe'
      AND answer_key IN ('laugh', 'think', 'focus', 'flexible')
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_discovery_mood_answers_user_question_uidx
  ON app.discovery_mood_quiz_answers (duo_id, user_id, quiz_round, question_key);
CREATE INDEX IF NOT EXISTS app_discovery_mood_answers_round_idx
  ON app.discovery_mood_quiz_answers (duo_id, quiz_round);

COMMENT ON TABLE app.discovery_mood_quiz_answers IS
  'Owner module: discovery. Three-question mood quiz answers; full duo result requires both members.';

CREATE TABLE IF NOT EXISTS app.discovery_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  user_agent text,
  enabled boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_discovery_push_subscriptions_enabled_state_chk CHECK (
    (enabled = true AND disabled_at IS NULL)
    OR (enabled = false AND disabled_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_discovery_push_subscriptions_endpoint_uidx
  ON app.discovery_push_subscriptions (duo_id, user_id, endpoint);
CREATE INDEX IF NOT EXISTS app_discovery_push_subscriptions_user_enabled_idx
  ON app.discovery_push_subscriptions (duo_id, user_id, enabled);

COMMENT ON TABLE app.discovery_push_subscriptions IS
  'Owner module: discovery. Opted-in browser push subscription for Match Live alerts; runtime disables by update, not delete.';
COMMENT ON COLUMN app.discovery_push_subscriptions.auth_secret IS
  'Web Push auth secret material; do not expose beyond server-side notification flows.';

ALTER TABLE app.discovery_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.discovery_live_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_discovery_live_sessions_select_members ON app.discovery_live_sessions;
DROP POLICY IF EXISTS app_discovery_live_sessions_insert_members ON app.discovery_live_sessions;
DROP POLICY IF EXISTS app_discovery_live_sessions_update_members ON app.discovery_live_sessions;
CREATE POLICY app_discovery_live_sessions_select_members ON app.discovery_live_sessions
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_discovery_live_sessions_insert_members ON app.discovery_live_sessions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    started_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_discovery_live_sessions_update_members ON app.discovery_live_sessions
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.discovery_member_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.discovery_member_decisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_discovery_member_decisions_select_members ON app.discovery_member_decisions;
DROP POLICY IF EXISTS app_discovery_member_decisions_insert_own ON app.discovery_member_decisions;
DROP POLICY IF EXISTS app_discovery_member_decisions_update_own ON app.discovery_member_decisions;
CREATE POLICY app_discovery_member_decisions_select_members ON app.discovery_member_decisions
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_discovery_member_decisions_insert_own ON app.discovery_member_decisions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_discovery_member_decisions_update_own ON app.discovery_member_decisions
  FOR UPDATE TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.discovery_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.discovery_matches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_discovery_matches_select_members ON app.discovery_matches;
DROP POLICY IF EXISTS app_discovery_matches_insert_members ON app.discovery_matches;
DROP POLICY IF EXISTS app_discovery_matches_update_members ON app.discovery_matches;
CREATE POLICY app_discovery_matches_select_members ON app.discovery_matches
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_discovery_matches_insert_members ON app.discovery_matches
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND app.has_duo_membership(first_user_id, duo_id)
    AND app.has_duo_membership(second_user_id, duo_id)
  );
CREATE POLICY app_discovery_matches_update_members ON app.discovery_matches
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      library_handoff_by_user_id IS NULL
      OR library_handoff_by_user_id = app.current_user_id()
    )
  );

ALTER TABLE app.discovery_mood_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.discovery_mood_quiz_answers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_discovery_mood_quiz_answers_select_members ON app.discovery_mood_quiz_answers;
DROP POLICY IF EXISTS app_discovery_mood_quiz_answers_insert_own ON app.discovery_mood_quiz_answers;
DROP POLICY IF EXISTS app_discovery_mood_quiz_answers_update_own ON app.discovery_mood_quiz_answers;
CREATE POLICY app_discovery_mood_quiz_answers_select_members ON app.discovery_mood_quiz_answers
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_discovery_mood_quiz_answers_insert_own ON app.discovery_mood_quiz_answers
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_discovery_mood_quiz_answers_update_own ON app.discovery_mood_quiz_answers
  FOR UPDATE TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.discovery_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.discovery_push_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_discovery_push_subscriptions_select_own ON app.discovery_push_subscriptions;
DROP POLICY IF EXISTS app_discovery_push_subscriptions_insert_own ON app.discovery_push_subscriptions;
DROP POLICY IF EXISTS app_discovery_push_subscriptions_update_own ON app.discovery_push_subscriptions;
CREATE POLICY app_discovery_push_subscriptions_select_own ON app.discovery_push_subscriptions
  FOR SELECT TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_discovery_push_subscriptions_insert_own ON app.discovery_push_subscriptions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_discovery_push_subscriptions_update_own ON app.discovery_push_subscriptions
  FOR UPDATE TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

GRANT SELECT, INSERT ON app.discovery_live_sessions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, expires_at, ended_at, updated_at) ON app.discovery_live_sessions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.discovery_live_sessions TO queue2_readonly;

GRANT SELECT, INSERT ON app.discovery_member_decisions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (decision, source_mode, live_session_id, decided_at, cooldown_until, preference_weight, updated_at)
  ON app.discovery_member_decisions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.discovery_member_decisions TO queue2_readonly;

GRANT SELECT, INSERT ON app.discovery_matches TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (library_handoff_status, library_handoff_at, library_handoff_by_user_id)
  ON app.discovery_matches TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.discovery_matches TO queue2_readonly;

GRANT SELECT, INSERT ON app.discovery_mood_quiz_answers TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (answer_key, answered_at, updated_at)
  ON app.discovery_mood_quiz_answers TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.discovery_mood_quiz_answers TO queue2_readonly;

GRANT SELECT, INSERT ON app.discovery_push_subscriptions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (endpoint, p256dh, auth_secret, user_agent, enabled, disabled_at, last_seen_at, updated_at)
  ON app.discovery_push_subscriptions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.discovery_push_subscriptions TO queue2_readonly;
