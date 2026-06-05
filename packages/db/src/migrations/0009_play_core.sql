-- QUEUE/2 Phase 4 play foundation.
-- Owner module: play. Duo-scoped active play queue, sessions, confirmations,
-- progress, timeline notes, scheduling, notifications, push subscriptions,
-- reminder jobs and minimal idempotent XP awards.

CREATE TABLE IF NOT EXISTS app.play_active_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE CASCADE,
  role varchar(16) NOT NULL,
  position smallint NOT NULL,
  added_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_active_games_role_chk CHECK (role IN ('principal', 'secondary')),
  CONSTRAINT app_play_active_games_position_chk CHECK (position BETWEEN 1 AND 3),
  CONSTRAINT app_play_active_games_role_position_chk CHECK (
    (role = 'principal' AND position = 1)
    OR (role = 'secondary' AND position IN (2, 3))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_active_games_library_uidx
  ON app.play_active_games (library_game_id);
CREATE UNIQUE INDEX IF NOT EXISTS app_play_active_games_one_principal_uidx
  ON app.play_active_games (duo_id)
  WHERE role = 'principal';
CREATE UNIQUE INDEX IF NOT EXISTS app_play_active_games_duo_position_uidx
  ON app.play_active_games (duo_id, position);
CREATE INDEX IF NOT EXISTS app_play_active_games_duo_order_idx
  ON app.play_active_games (duo_id, position, updated_at DESC);

COMMENT ON TABLE app.play_active_games IS
  'Owner module: play. Principal/secondary ordering for the duo Jogando queue; database indexes enforce one Principal and two secondaries.';
COMMENT ON COLUMN app.play_active_games.role IS
  'Principal owns position 1; secondary games own positions 2 and 3.';

CREATE OR REPLACE FUNCTION app.enforce_play_active_game_library_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, catalog, auth, ops, pg_catalog
AS $$
DECLARE
  library_duo_id uuid;
  library_status text;
BEGIN
  SELECT library_game.duo_id, library_game.status
  INTO library_duo_id, library_status
  FROM app.duo_library_games AS library_game
  WHERE library_game.id = NEW.library_game_id
  FOR UPDATE;

  IF library_duo_id IS NULL THEN
    RAISE EXCEPTION 'library_game_not_found' USING ERRCODE = '23503';
  END IF;

  IF library_duo_id IS DISTINCT FROM NEW.duo_id THEN
    RAISE EXCEPTION 'play_active_game_duo_mismatch' USING ERRCODE = '23514';
  END IF;

  IF library_status <> 'jogando' THEN
    RAISE EXCEPTION 'play_active_game_requires_jogando' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_play_active_games_library_status_trg ON app.play_active_games;
CREATE TRIGGER app_play_active_games_library_status_trg
  BEFORE INSERT OR UPDATE OF duo_id, library_game_id ON app.play_active_games
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_play_active_game_library_status();

REVOKE ALL ON FUNCTION app.enforce_play_active_game_library_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.enforce_play_active_game_library_status() TO queue2_app_runtime, queue2_worker;

CREATE TABLE IF NOT EXISTS app.play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE RESTRICT,
  kind varchar(16) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_sessions_kind_chk CHECK (kind IN ('live', 'offline')),
  CONSTRAINT app_play_sessions_status_chk CHECK (
    status IN ('active', 'pending_confirmation', 'confirmed', 'cancelled')
  ),
  CONSTRAINT app_play_sessions_duration_non_negative_chk CHECK (
    duration_seconds IS NULL OR duration_seconds >= 0
  ),
  CONSTRAINT app_play_sessions_ended_after_started_chk CHECK (
    ended_at IS NULL OR ended_at >= started_at
  ),
  CONSTRAINT app_play_sessions_active_live_shape_chk CHECK (
    kind <> 'live'
    OR status <> 'active'
    OR (ended_at IS NULL AND duration_seconds IS NULL)
  ),
  CONSTRAINT app_play_sessions_offline_duration_chk CHECK (
    kind <> 'offline'
    OR duration_seconds IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_sessions_one_active_live_uidx
  ON app.play_sessions (duo_id)
  WHERE kind = 'live' AND status = 'active';
CREATE INDEX IF NOT EXISTS app_play_sessions_duo_game_started_idx
  ON app.play_sessions (duo_id, library_game_id, started_at DESC);
CREATE INDEX IF NOT EXISTS app_play_sessions_pending_idx
  ON app.play_sessions (duo_id, status, updated_at DESC)
  WHERE status = 'pending_confirmation';

COMMENT ON TABLE app.play_sessions IS
  'Owner module: play. Live and offline coop sessions; active live uniqueness is enforced per duo.';
COMMENT ON COLUMN app.play_sessions.started_at IS
  'Server timestamp used as the authoritative live timer start.';

CREATE TABLE IF NOT EXISTS app.play_session_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES app.play_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_session_confirmations_session_user_uidx
  ON app.play_session_confirmations (session_id, user_id);
CREATE INDEX IF NOT EXISTS app_play_session_confirmations_duo_session_idx
  ON app.play_session_confirmations (duo_id, session_id);

COMMENT ON TABLE app.play_session_confirmations IS
  'Owner module: play. One completion confirmation per duo member per play session.';

CREATE TABLE IF NOT EXISTS app.play_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE CASCADE,
  confirmed_coop_seconds integer NOT NULL DEFAULT 0,
  subjective_percent smallint,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_progress_seconds_non_negative_chk CHECK (confirmed_coop_seconds >= 0),
  CONSTRAINT app_play_progress_subjective_percent_chk CHECK (
    subjective_percent IS NULL OR subjective_percent BETWEEN 0 AND 100
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_progress_library_uidx
  ON app.play_progress (library_game_id);
CREATE INDEX IF NOT EXISTS app_play_progress_duo_idx
  ON app.play_progress (duo_id, updated_at DESC);

COMMENT ON TABLE app.play_progress IS
  'Owner module: play. Authoritative confirmed coop time and subjective percentage for one duo library game.';

CREATE TABLE IF NOT EXISTS app.play_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE CASCADE,
  title varchar(120) NOT NULL,
  position smallint NOT NULL,
  completed_at timestamptz,
  completed_by_user_id text REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_chapters_title_length_chk CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT app_play_chapters_position_positive_chk CHECK (position > 0),
  CONSTRAINT app_play_chapters_completion_state_chk CHECK (
    (completed_at IS NULL AND completed_by_user_id IS NULL)
    OR (completed_at IS NOT NULL AND completed_by_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_chapters_library_position_uidx
  ON app.play_chapters (library_game_id, position);
CREATE INDEX IF NOT EXISTS app_play_chapters_duo_game_idx
  ON app.play_chapters (duo_id, library_game_id, position);

COMMENT ON TABLE app.play_chapters IS
  'Owner module: play. Manual progress chapters; XP is awarded through app.duo_xp_awards once per completed chapter effect.';

CREATE TABLE IF NOT EXISTS app.play_momentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE CASCADE,
  session_id uuid REFERENCES app.play_sessions(id) ON DELETE SET NULL,
  author_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  body text NOT NULL,
  is_spoiler boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_momentos_body_length_chk CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS app_play_momentos_duo_game_created_idx
  ON app.play_momentos (duo_id, library_game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_play_momentos_session_idx
  ON app.play_momentos (session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON TABLE app.play_momentos IS
  'Owner module: play. Duo timeline notes; spoiler text is rendered hidden until each viewer creates a local reveal row.';
COMMENT ON COLUMN app.play_momentos.is_spoiler IS
  'Sensitive user-generated spoiler marker; reveal state is local to app.play_spoiler_reveals.';

CREATE TABLE IF NOT EXISTS app.play_spoiler_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  momento_id uuid NOT NULL REFERENCES app.play_momentos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  revealed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_spoiler_reveals_momento_user_uidx
  ON app.play_spoiler_reveals (momento_id, user_id);
CREATE INDEX IF NOT EXISTS app_play_spoiler_reveals_duo_user_idx
  ON app.play_spoiler_reveals (duo_id, user_id, revealed_at DESC);

COMMENT ON TABLE app.play_spoiler_reveals IS
  'Owner module: play. Local per-viewer spoiler reveal state; one row per viewer and Momento.';

CREATE TABLE IF NOT EXISTS app.play_terminal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE RESTRICT,
  target_status varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  requested_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  confirmed_by_user_id text REFERENCES auth."user"(id) ON DELETE RESTRICT,
  cancelled_by_user_id text REFERENCES auth."user"(id) ON DELETE RESTRICT,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_terminal_requests_target_status_chk CHECK (target_status IN ('zerado', 'dropado')),
  CONSTRAINT app_play_terminal_requests_status_chk CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  CONSTRAINT app_play_terminal_requests_partner_confirm_chk CHECK (
    confirmed_by_user_id IS NULL OR confirmed_by_user_id <> requested_by_user_id
  ),
  CONSTRAINT app_play_terminal_requests_state_chk CHECK (
    (status = 'pending' AND confirmed_by_user_id IS NULL AND confirmed_at IS NULL AND cancelled_by_user_id IS NULL AND cancelled_at IS NULL)
    OR (status = 'confirmed' AND confirmed_by_user_id IS NOT NULL AND confirmed_at IS NOT NULL AND cancelled_by_user_id IS NULL AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND confirmed_by_user_id IS NULL AND confirmed_at IS NULL AND cancelled_by_user_id IS NOT NULL AND cancelled_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_terminal_requests_one_pending_uidx
  ON app.play_terminal_requests (library_game_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS app_play_terminal_requests_duo_status_idx
  ON app.play_terminal_requests (duo_id, status, updated_at DESC);

COMMENT ON TABLE app.play_terminal_requests IS
  'Owner module: play. Zerado/Dropado double-confirmation requests; no terminal status is authoritative until partner confirmation.';

CREATE TABLE IF NOT EXISTS app.play_scheduled_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  library_game_id uuid NOT NULL REFERENCES app.duo_library_games(id) ON DELETE RESTRICT,
  scheduled_start_at timestamptz NOT NULL,
  timezone text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'scheduled',
  reminder_due_at timestamptz NOT NULL,
  created_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  updated_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_scheduled_sessions_status_chk CHECK (
    status IN ('scheduled', 'completed', 'cancelled')
  ),
  CONSTRAINT app_play_scheduled_sessions_future_shape_chk CHECK (
    scheduled_start_at > created_at - interval '1 minute'
  ),
  CONSTRAINT app_play_scheduled_sessions_reminder_due_chk CHECK (
    reminder_due_at = scheduled_start_at - interval '30 minutes'
  )
);

CREATE INDEX IF NOT EXISTS app_play_scheduled_sessions_duo_start_idx
  ON app.play_scheduled_sessions (duo_id, scheduled_start_at);
CREATE INDEX IF NOT EXISTS app_play_scheduled_sessions_reminder_due_idx
  ON app.play_scheduled_sessions (reminder_due_at)
  WHERE status = 'scheduled';

COMMENT ON TABLE app.play_scheduled_sessions IS
  'Owner module: play. Future coop sessions with persisted timezone and exact reminder due timestamp; runner precision remains an operational gate.';
COMMENT ON COLUMN app.play_scheduled_sessions.reminder_due_at IS
  'Persisted 30-minute reminder due time. UI must not promise exact delivery without a precise runner environment.';

CREATE TABLE IF NOT EXISTS app.play_scheduled_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  scheduled_session_id uuid NOT NULL REFERENCES app.play_scheduled_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_play_scheduled_attendance_session_user_uidx
  ON app.play_scheduled_attendance (scheduled_session_id, user_id);
CREATE INDEX IF NOT EXISTS app_play_scheduled_attendance_duo_session_idx
  ON app.play_scheduled_attendance (duo_id, scheduled_session_id);

COMMENT ON TABLE app.play_scheduled_attendance IS
  'Owner module: play. One attendance confirmation per member for a scheduled coop session.';

CREATE OR REPLACE FUNCTION app.reset_play_scheduled_attendance_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
BEGIN
  IF OLD.library_game_id IS DISTINCT FROM NEW.library_game_id
     OR OLD.scheduled_start_at IS DISTINCT FROM NEW.scheduled_start_at THEN
    DELETE FROM app.play_scheduled_attendance
    WHERE scheduled_session_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_play_scheduled_sessions_reset_attendance_trg ON app.play_scheduled_sessions;
CREATE TRIGGER app_play_scheduled_sessions_reset_attendance_trg
  AFTER UPDATE OF library_game_id, scheduled_start_at ON app.play_scheduled_sessions
  FOR EACH ROW
  EXECUTE FUNCTION app.reset_play_scheduled_attendance_on_change();

REVOKE ALL ON FUNCTION app.reset_play_scheduled_attendance_on_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.reset_play_scheduled_attendance_on_change() TO queue2_app_runtime, queue2_worker;

CREATE TABLE IF NOT EXISTS app.play_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  recipient_user_id text REFERENCES auth."user"(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  notification_type varchar(40) NOT NULL,
  state varchar(20) NOT NULL DEFAULT 'unread',
  action_ref_type varchar(40),
  action_ref_id uuid,
  title varchar(120) NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_play_notifications_type_chk CHECK (
    notification_type IN (
      'session-confirmation',
      'scheduled-session',
      'reminder-sent',
      'live-session',
      'terminal-request',
      'push-failure',
      'push-disabled'
    )
  ),
  CONSTRAINT app_play_notifications_state_chk CHECK (state IN ('unread', 'read', 'actioned', 'archived')),
  CONSTRAINT app_play_notifications_title_length_chk CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT app_play_notifications_read_state_chk CHECK (
    (state = 'unread' AND read_at IS NULL)
    OR (state <> 'unread')
  )
);

CREATE INDEX IF NOT EXISTS app_play_notifications_duo_state_idx
  ON app.play_notifications (duo_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS app_play_notifications_recipient_state_idx
  ON app.play_notifications (duo_id, recipient_user_id, state, created_at DESC);
CREATE INDEX IF NOT EXISTS app_play_notifications_action_idx
  ON app.play_notifications (duo_id, action_ref_type, action_ref_id)
  WHERE action_ref_id IS NOT NULL;

COMMENT ON TABLE app.play_notifications IS
  'Owner module: play. Central da Dupla operational notifications and pending actions; not chat or social feed.';

CREATE TABLE IF NOT EXISTS app.push_subscriptions (
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
  CONSTRAINT app_push_subscriptions_enabled_state_chk CHECK (
    (enabled = true AND disabled_at IS NULL)
    OR (enabled = false AND disabled_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_push_subscriptions_endpoint_uidx
  ON app.push_subscriptions (duo_id, user_id, endpoint);
CREATE INDEX IF NOT EXISTS app_push_subscriptions_user_enabled_idx
  ON app.push_subscriptions (duo_id, user_id, enabled);

COMMENT ON TABLE app.push_subscriptions IS
  'Owner module: play. Product-wide opted-in browser push subscriptions for session reminders and operational alerts.';
COMMENT ON COLUMN app.push_subscriptions.auth_secret IS
  'Web Push auth secret material; server-only and redacted from logs or browser-readable payloads.';

CREATE TABLE IF NOT EXISTS app.duo_xp_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  award_key text NOT NULL,
  source_type varchar(40) NOT NULL,
  source_id uuid NOT NULL,
  amount integer NOT NULL,
  awarded_by_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_duo_xp_awards_source_type_chk CHECK (
    source_type IN ('chapter', 'live-session', 'offline-session', 'scheduled-session', 'terminal-status')
  ),
  CONSTRAINT app_duo_xp_awards_amount_positive_chk CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_duo_xp_awards_key_uidx
  ON app.duo_xp_awards (duo_id, award_key);
CREATE UNIQUE INDEX IF NOT EXISTS app_duo_xp_awards_source_uidx
  ON app.duo_xp_awards (duo_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS app_duo_xp_awards_duo_awarded_idx
  ON app.duo_xp_awards (duo_id, awarded_at DESC);

COMMENT ON TABLE app.duo_xp_awards IS
  'Owner module: play. Minimal append-only shared XP award ledger for Phase 4 effects; unique keys prevent replayed awards.';

CREATE TABLE IF NOT EXISTS ops.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  job_key text NOT NULL,
  job_type varchar(60) NOT NULL,
  run_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_scheduled_jobs_status_chk CHECK (
    status IN ('pending', 'claimed', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT ops_scheduled_jobs_attempts_non_negative_chk CHECK (attempts >= 0),
  CONSTRAINT ops_scheduled_jobs_claim_state_chk CHECK (
    (status = 'claimed' AND locked_at IS NOT NULL)
    OR (status <> 'claimed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_scheduled_jobs_key_uidx
  ON ops.scheduled_jobs (job_key);
CREATE INDEX IF NOT EXISTS ops_scheduled_jobs_due_idx
  ON ops.scheduled_jobs (status, run_at, id)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS ops_scheduled_jobs_duo_type_idx
  ON ops.scheduled_jobs (duo_id, job_type, run_at DESC);

COMMENT ON TABLE ops.scheduled_jobs IS
  'Owner module: ops/play. Idempotent due reminder jobs; worker claims bounded batches and effects remain guarded by unique keys.';

ALTER TABLE app.play_active_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_active_games FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_active_games_select_members ON app.play_active_games;
DROP POLICY IF EXISTS app_play_active_games_insert_members ON app.play_active_games;
DROP POLICY IF EXISTS app_play_active_games_update_members ON app.play_active_games;
CREATE POLICY app_play_active_games_select_members ON app.play_active_games
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_active_games_insert_members ON app.play_active_games
  FOR INSERT TO PUBLIC
  WITH CHECK (
    added_by_user_id = app.current_user_id()
    AND updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_active_games_update_members ON app.play_active_games
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_sessions_select_members ON app.play_sessions;
DROP POLICY IF EXISTS app_play_sessions_insert_members ON app.play_sessions;
DROP POLICY IF EXISTS app_play_sessions_update_members ON app.play_sessions;
CREATE POLICY app_play_sessions_select_members ON app.play_sessions
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_sessions_insert_members ON app.play_sessions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    created_by_user_id = app.current_user_id()
    AND updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_sessions_update_members ON app.play_sessions
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_session_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_session_confirmations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_session_confirmations_select_members ON app.play_session_confirmations;
DROP POLICY IF EXISTS app_play_session_confirmations_insert_own ON app.play_session_confirmations;
CREATE POLICY app_play_session_confirmations_select_members ON app.play_session_confirmations
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_session_confirmations_insert_own ON app.play_session_confirmations
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_progress_select_members ON app.play_progress;
DROP POLICY IF EXISTS app_play_progress_insert_members ON app.play_progress;
DROP POLICY IF EXISTS app_play_progress_update_members ON app.play_progress;
CREATE POLICY app_play_progress_select_members ON app.play_progress
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_progress_insert_members ON app.play_progress
  FOR INSERT TO PUBLIC
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_progress_update_members ON app.play_progress
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_chapters FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_chapters_select_members ON app.play_chapters;
DROP POLICY IF EXISTS app_play_chapters_insert_members ON app.play_chapters;
DROP POLICY IF EXISTS app_play_chapters_update_members ON app.play_chapters;
CREATE POLICY app_play_chapters_select_members ON app.play_chapters
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_chapters_insert_members ON app.play_chapters
  FOR INSERT TO PUBLIC
  WITH CHECK (
    created_by_user_id = app.current_user_id()
    AND updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_chapters_update_members ON app.play_chapters
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND (
      completed_by_user_id IS NULL
      OR app.has_duo_membership(completed_by_user_id, duo_id)
    )
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_momentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_momentos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_momentos_select_members ON app.play_momentos;
DROP POLICY IF EXISTS app_play_momentos_insert_members ON app.play_momentos;
DROP POLICY IF EXISTS app_play_momentos_update_author ON app.play_momentos;
CREATE POLICY app_play_momentos_select_members ON app.play_momentos
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_momentos_insert_members ON app.play_momentos
  FOR INSERT TO PUBLIC
  WITH CHECK (
    author_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_momentos_update_author ON app.play_momentos
  FOR UPDATE TO PUBLIC
  USING (
    author_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    author_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_spoiler_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_spoiler_reveals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_spoiler_reveals_select_own ON app.play_spoiler_reveals;
DROP POLICY IF EXISTS app_play_spoiler_reveals_insert_own ON app.play_spoiler_reveals;
CREATE POLICY app_play_spoiler_reveals_select_own ON app.play_spoiler_reveals
  FOR SELECT TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_spoiler_reveals_insert_own ON app.play_spoiler_reveals
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_terminal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_terminal_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_terminal_requests_select_members ON app.play_terminal_requests;
DROP POLICY IF EXISTS app_play_terminal_requests_insert_members ON app.play_terminal_requests;
DROP POLICY IF EXISTS app_play_terminal_requests_update_members ON app.play_terminal_requests;
CREATE POLICY app_play_terminal_requests_select_members ON app.play_terminal_requests
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_terminal_requests_insert_members ON app.play_terminal_requests
  FOR INSERT TO PUBLIC
  WITH CHECK (
    requested_by_user_id = app.current_user_id()
    AND updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_terminal_requests_update_members ON app.play_terminal_requests
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND (confirmed_by_user_id IS NULL OR confirmed_by_user_id = app.current_user_id())
    AND (cancelled_by_user_id IS NULL OR cancelled_by_user_id = app.current_user_id())
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_scheduled_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_scheduled_sessions_select_members ON app.play_scheduled_sessions;
DROP POLICY IF EXISTS app_play_scheduled_sessions_insert_members ON app.play_scheduled_sessions;
DROP POLICY IF EXISTS app_play_scheduled_sessions_update_members ON app.play_scheduled_sessions;
CREATE POLICY app_play_scheduled_sessions_select_members ON app.play_scheduled_sessions
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_scheduled_sessions_insert_members ON app.play_scheduled_sessions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    created_by_user_id = app.current_user_id()
    AND updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_play_scheduled_sessions_update_members ON app.play_scheduled_sessions
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (
    updated_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_scheduled_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_scheduled_attendance FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_scheduled_attendance_select_members ON app.play_scheduled_attendance;
DROP POLICY IF EXISTS app_play_scheduled_attendance_insert_own ON app.play_scheduled_attendance;
CREATE POLICY app_play_scheduled_attendance_select_members ON app.play_scheduled_attendance
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_scheduled_attendance_insert_own ON app.play_scheduled_attendance
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.play_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_notifications_select_members ON app.play_notifications;
DROP POLICY IF EXISTS app_play_notifications_insert_members ON app.play_notifications;
DROP POLICY IF EXISTS app_play_notifications_update_members ON app.play_notifications;
CREATE POLICY app_play_notifications_select_members ON app.play_notifications
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_play_notifications_insert_members ON app.play_notifications
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      actor_user_id IS NULL
      OR actor_user_id = app.current_user_id()
    )
    AND (
      recipient_user_id IS NULL
      OR app.has_duo_membership(recipient_user_id, duo_id)
    )
  );
CREATE POLICY app_play_notifications_update_members ON app.play_notifications
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.push_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_push_subscriptions_select_own ON app.push_subscriptions;
DROP POLICY IF EXISTS app_push_subscriptions_insert_own ON app.push_subscriptions;
DROP POLICY IF EXISTS app_push_subscriptions_update_own ON app.push_subscriptions;
CREATE POLICY app_push_subscriptions_select_own ON app.push_subscriptions
  FOR SELECT TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_push_subscriptions_insert_own ON app.push_subscriptions
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_push_subscriptions_update_own ON app.push_subscriptions
  FOR UPDATE TO PUBLIC
  USING (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  )
  WITH CHECK (
    user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );

ALTER TABLE app.duo_xp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_xp_awards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_xp_awards_select_members ON app.duo_xp_awards;
DROP POLICY IF EXISTS app_duo_xp_awards_insert_members ON app.duo_xp_awards;
CREATE POLICY app_duo_xp_awards_select_members ON app.duo_xp_awards
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_duo_xp_awards_insert_members ON app.duo_xp_awards
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      awarded_by_user_id IS NULL
      OR awarded_by_user_id = app.current_user_id()
    )
  );

ALTER TABLE ops.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.scheduled_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_scheduled_jobs_select_members ON ops.scheduled_jobs;
DROP POLICY IF EXISTS ops_scheduled_jobs_insert_members ON ops.scheduled_jobs;
DROP POLICY IF EXISTS ops_scheduled_jobs_select_worker ON ops.scheduled_jobs;
DROP POLICY IF EXISTS ops_scheduled_jobs_update_worker ON ops.scheduled_jobs;
CREATE POLICY ops_scheduled_jobs_select_members ON ops.scheduled_jobs
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_scheduled_jobs_insert_members ON ops.scheduled_jobs
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_scheduled_jobs_select_worker ON ops.scheduled_jobs
  FOR SELECT TO queue2_worker
  USING (true);
CREATE POLICY ops_scheduled_jobs_update_worker ON ops.scheduled_jobs
  FOR UPDATE TO queue2_worker
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON app.play_active_games TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (role, position, updated_by_user_id, updated_at)
  ON app.play_active_games TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_active_games TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_sessions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, ended_at, duration_seconds, updated_by_user_id, updated_at)
  ON app.play_sessions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_sessions TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_session_confirmations TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_session_confirmations TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_progress TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (confirmed_coop_seconds, subjective_percent, updated_by_user_id, updated_at)
  ON app.play_progress TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_progress TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_chapters TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (title, position, completed_at, completed_by_user_id, updated_by_user_id, updated_at)
  ON app.play_chapters TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_chapters TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_momentos TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (body, is_spoiler, updated_at) ON app.play_momentos TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_momentos TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_spoiler_reveals TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_spoiler_reveals TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_terminal_requests TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, confirmed_by_user_id, cancelled_by_user_id, updated_by_user_id, confirmed_at, cancelled_at, updated_at)
  ON app.play_terminal_requests TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_terminal_requests TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_scheduled_sessions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (library_game_id, scheduled_start_at, timezone, status, reminder_due_at, updated_by_user_id, updated_at)
  ON app.play_scheduled_sessions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_scheduled_sessions TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_scheduled_attendance TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_scheduled_attendance TO queue2_readonly;

GRANT SELECT, INSERT ON app.play_notifications TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (state, read_at, updated_at) ON app.play_notifications TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.play_notifications TO queue2_readonly;

GRANT SELECT, INSERT ON app.push_subscriptions TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (endpoint, p256dh, auth_secret, user_agent, enabled, disabled_at, last_seen_at, updated_at)
  ON app.push_subscriptions TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.push_subscriptions TO queue2_readonly;

GRANT SELECT, INSERT ON app.duo_xp_awards TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.duo_xp_awards TO queue2_readonly;

GRANT SELECT, INSERT ON ops.scheduled_jobs TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, attempts, locked_at, locked_by, processed_at, last_error, payload, updated_at)
  ON ops.scheduled_jobs TO queue2_worker;
GRANT SELECT ON ops.scheduled_jobs TO queue2_readonly;
