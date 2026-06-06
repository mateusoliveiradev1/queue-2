-- QUEUE/2 Phase 5 gamification core.
-- Owner module: gamification. Shared XP economy, achievement unlocks, quest
-- windows/progress, streak state, reward notifications, adjustments and
-- projection rebuild audit records. XP remains duo-scoped only.

ALTER TABLE app.duo_xp_awards
  ADD COLUMN IF NOT EXISTS reason_code varchar(80) NOT NULL DEFAULT 'play-award';

ALTER TABLE app.duo_xp_awards
  DROP CONSTRAINT IF EXISTS app_duo_xp_awards_source_type_chk;

ALTER TABLE app.duo_xp_awards
  ADD CONSTRAINT app_duo_xp_awards_source_type_chk CHECK (
    source_type IN (
      'chapter',
      'live-session',
      'offline-session',
      'scheduled-session',
      'terminal-status',
      'terminal-zerado',
      'terminal-dropado',
      'discovery-match',
      'quest',
      'achievement',
      'streak',
      'adjustment'
    )
  );

COMMENT ON TABLE app.duo_xp_awards IS
  'Owner module: play/gamification. Append-only shared XP ledger; unique award/source keys prevent replayed rewards and preserve audit history.';
COMMENT ON COLUMN app.duo_xp_awards.reason_code IS
  'Product-facing reason code for XP ledger explanations without exposing internal implementation details.';

CREATE TABLE IF NOT EXISTS app.gamification_achievement_catalog (
  slug varchar(80) PRIMARY KEY,
  group_key varchar(32) NOT NULL,
  rarity varchar(16) NOT NULL,
  visibility varchar(16) NOT NULL DEFAULT 'visible',
  title varchar(120) NOT NULL,
  description text NOT NULL,
  icon_key varchar(80) NOT NULL,
  predicate jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_achievement_catalog_group_chk CHECK (
    group_key IN ('story', 'coop-sincronia', 'compromisso', 'descoberta', 'streak', 'roleta', 'comedia')
  ),
  CONSTRAINT app_gamification_achievement_catalog_rarity_chk CHECK (
    rarity IN ('common', 'rare', 'epic', 'legendary')
  ),
  CONSTRAINT app_gamification_achievement_catalog_visibility_chk CHECK (
    visibility IN ('visible', 'hidden')
  ),
  CONSTRAINT app_gamification_achievement_catalog_copy_chk CHECK (
    char_length(title) BETWEEN 1 AND 120
    AND char_length(description) BETWEEN 1 AND 500
    AND char_length(icon_key) BETWEEN 1 AND 80
  )
);

CREATE INDEX IF NOT EXISTS app_gamification_achievement_catalog_grid_idx
  ON app.gamification_achievement_catalog (active, group_key, rarity, slug);

COMMENT ON TABLE app.gamification_achievement_catalog IS
  'Owner module: gamification. Seeded achievement catalog with rarity, hidden/visible state and custom engraved icon keys.';
COMMENT ON COLUMN app.gamification_achievement_catalog.predicate IS
  'Reviewed deterministic predicate metadata; browser input is never authoritative for unlocks.';

CREATE TABLE IF NOT EXISTS app.gamification_achievement_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  achievement_slug varchar(80) NOT NULL REFERENCES app.gamification_achievement_catalog(slug) ON DELETE RESTRICT,
  source_type varchar(40) NOT NULL,
  source_id uuid NOT NULL,
  unlocked_by_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_achievement_unlocks_source_type_chk CHECK (
    source_type IN (
      'chapter',
      'live-session',
      'offline-session',
      'scheduled-session',
      'terminal-status',
      'terminal-zerado',
      'terminal-dropado',
      'discovery-match',
      'quest',
      'streak',
      'adjustment'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_achievement_unlocks_duo_slug_uidx
  ON app.gamification_achievement_unlocks (duo_id, achievement_slug);
CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_achievement_unlocks_source_uidx
  ON app.gamification_achievement_unlocks (duo_id, achievement_slug, source_type, source_id);
CREATE INDEX IF NOT EXISTS app_gamification_achievement_unlocks_grid_idx
  ON app.gamification_achievement_unlocks (duo_id, unlocked_at DESC, achievement_slug);

COMMENT ON TABLE app.gamification_achievement_unlocks IS
  'Owner module: gamification. Duo-scoped append-only achievement unlock facts; unique keys prevent duplicate unlocks.';
COMMENT ON COLUMN app.gamification_achievement_unlocks.metadata IS
  'Audit metadata for the confirmed server-side fact that unlocked the achievement.';

CREATE TABLE IF NOT EXISTS app.gamification_quest_templates (
  slug varchar(80) PRIMARY KEY,
  quest_type varchar(16) NOT NULL,
  seasonal_key varchar(32),
  title varchar(120) NOT NULL,
  description text NOT NULL,
  goal_value integer NOT NULL,
  xp_reward integer NOT NULL,
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_quest_templates_type_chk CHECK (
    quest_type IN ('weekly', 'monthly', 'seasonal')
  ),
  CONSTRAINT app_gamification_quest_templates_seasonal_shape_chk CHECK (
    (quest_type = 'seasonal' AND seasonal_key IS NOT NULL)
    OR (quest_type <> 'seasonal' AND seasonal_key IS NULL)
  ),
  CONSTRAINT app_gamification_quest_templates_goal_reward_chk CHECK (
    goal_value > 0 AND xp_reward > 0
  ),
  CONSTRAINT app_gamification_quest_templates_copy_chk CHECK (
    char_length(title) BETWEEN 1 AND 120
    AND char_length(description) BETWEEN 1 AND 500
  )
);

CREATE INDEX IF NOT EXISTS app_gamification_quest_templates_active_idx
  ON app.gamification_quest_templates (active, quest_type, seasonal_key, slug);

COMMENT ON TABLE app.gamification_quest_templates IS
  'Owner module: gamification. Reviewed weekly, monthly and seasonal quest seeds with explainable eligibility metadata.';

CREATE TABLE IF NOT EXISTS app.gamification_quest_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  quest_slug varchar(80) NOT NULL REFERENCES app.gamification_quest_templates(slug) ON DELETE RESTRICT,
  quest_type varchar(16) NOT NULL,
  cycle_key varchar(80) NOT NULL,
  window_start_at timestamptz NOT NULL,
  window_end_at timestamptz NOT NULL,
  timezone text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  selected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_quest_cycles_type_chk CHECK (
    quest_type IN ('weekly', 'monthly', 'seasonal')
  ),
  CONSTRAINT app_gamification_quest_cycles_status_chk CHECK (
    status IN ('active', 'completed', 'expired', 'cancelled')
  ),
  CONSTRAINT app_gamification_quest_cycles_window_chk CHECK (window_end_at > window_start_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_quest_cycles_duo_slug_cycle_uidx
  ON app.gamification_quest_cycles (duo_id, quest_slug, cycle_key);
CREATE INDEX IF NOT EXISTS app_gamification_quest_cycles_window_idx
  ON app.gamification_quest_cycles (duo_id, status, quest_type, window_start_at, window_end_at);

COMMENT ON TABLE app.gamification_quest_cycles IS
  'Owner module: gamification. Duo quest windows selected by idempotent rotation jobs; unique cycle keys prevent duplicate rotations.';
COMMENT ON COLUMN app.gamification_quest_cycles.timezone IS
  'Duo timezone snapshot used for weekly Monday 00:00, monthly and seasonal reset windows.';

CREATE TABLE IF NOT EXISTS app.gamification_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  quest_cycle_id uuid NOT NULL REFERENCES app.gamification_quest_cycles(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  reward_award_id uuid REFERENCES app.duo_xp_awards(id) ON DELETE SET NULL,
  last_source_type varchar(40),
  last_source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_quest_progress_value_chk CHECK (current_value >= 0),
  CONSTRAINT app_gamification_quest_progress_source_shape_chk CHECK (
    (last_source_type IS NULL AND last_source_id IS NULL)
    OR (last_source_type IS NOT NULL AND last_source_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_quest_progress_cycle_uidx
  ON app.gamification_quest_progress (duo_id, quest_cycle_id);
CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_quest_progress_reward_uidx
  ON app.gamification_quest_progress (reward_award_id)
  WHERE reward_award_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_gamification_quest_progress_duo_updated_idx
  ON app.gamification_quest_progress (duo_id, updated_at DESC);

COMMENT ON TABLE app.gamification_quest_progress IS
  'Owner module: gamification. Duo quest progress and completion reward evidence; unique reward reference prevents duplicate payouts.';

CREATE OR REPLACE FUNCTION app.enforce_gamification_quest_cycle_template()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  template_type text;
BEGIN
  SELECT template.quest_type
  INTO template_type
  FROM app.gamification_quest_templates AS template
  WHERE template.slug = NEW.quest_slug;

  IF template_type IS NULL THEN
    RAISE EXCEPTION 'gamification_quest_template_not_found' USING ERRCODE = '23503';
  END IF;

  IF template_type IS DISTINCT FROM NEW.quest_type THEN
    RAISE EXCEPTION 'gamification_quest_type_mismatch' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_gamification_quest_cycles_template_trg ON app.gamification_quest_cycles;
CREATE TRIGGER app_gamification_quest_cycles_template_trg
  BEFORE INSERT OR UPDATE OF quest_slug, quest_type ON app.gamification_quest_cycles
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_gamification_quest_cycle_template();

REVOKE ALL ON FUNCTION app.enforce_gamification_quest_cycle_template() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.enforce_gamification_quest_cycle_template() TO queue2_app_runtime, queue2_worker;

CREATE OR REPLACE FUNCTION app.enforce_gamification_quest_progress_duo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  cycle_duo_id uuid;
  reward_duo_id uuid;
BEGIN
  SELECT cycle.duo_id
  INTO cycle_duo_id
  FROM app.gamification_quest_cycles AS cycle
  WHERE cycle.id = NEW.quest_cycle_id;

  IF cycle_duo_id IS NULL THEN
    RAISE EXCEPTION 'gamification_quest_cycle_not_found' USING ERRCODE = '23503';
  END IF;

  IF cycle_duo_id IS DISTINCT FROM NEW.duo_id THEN
    RAISE EXCEPTION 'gamification_quest_progress_duo_mismatch' USING ERRCODE = '23514';
  END IF;

  IF NEW.reward_award_id IS NOT NULL THEN
    SELECT award.duo_id
    INTO reward_duo_id
    FROM app.duo_xp_awards AS award
    WHERE award.id = NEW.reward_award_id;

    IF reward_duo_id IS NULL THEN
      RAISE EXCEPTION 'gamification_quest_reward_not_found' USING ERRCODE = '23503';
    END IF;

    IF reward_duo_id IS DISTINCT FROM NEW.duo_id THEN
      RAISE EXCEPTION 'gamification_quest_reward_duo_mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_gamification_quest_progress_duo_trg ON app.gamification_quest_progress;
CREATE TRIGGER app_gamification_quest_progress_duo_trg
  BEFORE INSERT OR UPDATE OF duo_id, quest_cycle_id, reward_award_id ON app.gamification_quest_progress
  FOR EACH ROW
  EXECUTE FUNCTION app.enforce_gamification_quest_progress_duo();

REVOKE ALL ON FUNCTION app.enforce_gamification_quest_progress_duo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.enforce_gamification_quest_progress_duo() TO queue2_app_runtime, queue2_worker;

CREATE TABLE IF NOT EXISTS app.gamification_streak_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_type varchar(24) NOT NULL,
  duo_day date NOT NULL,
  source_type varchar(40),
  source_id uuid,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  delta_days integer NOT NULL DEFAULT 0,
  freeze_delta integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_streak_events_type_chk CHECK (
    event_type IN ('activity', 'freeze-earned', 'freeze-consumed', 'streak-reset', 'rebuild')
  ),
  CONSTRAINT app_gamification_streak_events_source_shape_chk CHECK (
    (source_type IS NULL AND source_id IS NULL)
    OR (source_type IS NOT NULL AND source_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_streak_events_key_uidx
  ON app.gamification_streak_events (duo_id, event_key);
CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_streak_events_source_uidx
  ON app.gamification_streak_events (duo_id, event_type, source_type, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_gamification_streak_events_duo_day_idx
  ON app.gamification_streak_events (duo_id, duo_day DESC, created_at DESC);

COMMENT ON TABLE app.gamification_streak_events IS
  'Owner module: gamification. Append-only streak activity and Streak Freeze facts based on confirmed duo actions and the 04:00 duo-day cutoff.';

CREATE TABLE IF NOT EXISTS app.gamification_streak_state (
  duo_id uuid PRIMARY KEY REFERENCES app.duos(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  available_freezes integer NOT NULL DEFAULT 0,
  last_activity_duo_day date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_streak_state_non_negative_chk CHECK (
    current_streak >= 0 AND longest_streak >= 0 AND available_freezes >= 0
  )
);

COMMENT ON TABLE app.gamification_streak_state IS
  'Owner module: gamification. Transactional duo streak projection rebuilt from streak events; no individual streak state exists.';

CREATE TABLE IF NOT EXISTS app.gamification_reward_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  recipient_user_id text REFERENCES auth."user"(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  notification_type varchar(32) NOT NULL,
  intensity varchar(16) NOT NULL DEFAULT 'standard',
  title varchar(120) NOT NULL,
  body text,
  action_ref_type varchar(40),
  action_ref_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_reward_notifications_type_chk CHECK (
    notification_type IN ('xp-award', 'level-up', 'achievement', 'quest-complete', 'streak-freeze', 'adjustment')
  ),
  CONSTRAINT app_gamification_reward_notifications_intensity_chk CHECK (
    intensity IN ('quiet', 'standard', 'special', 'legendary')
  ),
  CONSTRAINT app_gamification_reward_notifications_title_length_chk CHECK (
    char_length(title) BETWEEN 1 AND 120
  )
);

CREATE INDEX IF NOT EXISTS app_gamification_reward_notifications_duo_created_idx
  ON app.gamification_reward_notifications (duo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_gamification_reward_notifications_recipient_idx
  ON app.gamification_reward_notifications (duo_id, recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS app_gamification_reward_notifications_action_idx
  ON app.gamification_reward_notifications (duo_id, action_ref_type, action_ref_id)
  WHERE action_ref_id IS NOT NULL;

COMMENT ON TABLE app.gamification_reward_notifications IS
  'Owner module: gamification. Reward feed for level-ups, achievements and quest completions; client display is not authoritative.';

CREATE TABLE IF NOT EXISTS app.gamification_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  adjustment_key text NOT NULL,
  amount_delta integer NOT NULL,
  reason_code varchar(80) NOT NULL,
  actor_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_gamification_adjustments_delta_chk CHECK (amount_delta <> 0),
  CONSTRAINT app_gamification_adjustments_reason_chk CHECK (char_length(reason_code) BETWEEN 1 AND 80)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_gamification_adjustments_key_uidx
  ON app.gamification_adjustments (duo_id, adjustment_key);
CREATE INDEX IF NOT EXISTS app_gamification_adjustments_duo_created_idx
  ON app.gamification_adjustments (duo_id, created_at DESC);

COMMENT ON TABLE app.gamification_adjustments IS
  'Owner module: gamification. Explicit XP/projection correction records; history is adjusted, never erased.';

CREATE TABLE IF NOT EXISTS ops.gamification_projection_rebuilds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  rebuild_key text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'running',
  reason_code varchar(80) NOT NULL,
  xp_before integer,
  xp_after integer,
  level_before integer,
  level_after integer,
  streak_before integer,
  streak_after integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_gamification_projection_rebuilds_status_chk CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  CONSTRAINT ops_gamification_projection_rebuilds_reason_chk CHECK (
    char_length(reason_code) BETWEEN 1 AND 80
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_gamification_projection_rebuilds_key_uidx
  ON ops.gamification_projection_rebuilds (duo_id, rebuild_key);
CREATE INDEX IF NOT EXISTS ops_gamification_projection_rebuilds_duo_started_idx
  ON ops.gamification_projection_rebuilds (duo_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ops_gamification_projection_rebuilds_status_idx
  ON ops.gamification_projection_rebuilds (status, started_at)
  WHERE status = 'running';

COMMENT ON TABLE ops.gamification_projection_rebuilds IS
  'Owner module: gamification/ops. Audit trail for projection rebuilds and reconciliation evidence.';

ALTER TABLE app.gamification_achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_achievement_unlocks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_achievement_unlocks_select_members ON app.gamification_achievement_unlocks;
DROP POLICY IF EXISTS app_gamification_achievement_unlocks_insert_members ON app.gamification_achievement_unlocks;
CREATE POLICY app_gamification_achievement_unlocks_select_members ON app.gamification_achievement_unlocks
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_achievement_unlocks_insert_members ON app.gamification_achievement_unlocks
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      unlocked_by_user_id IS NULL
      OR unlocked_by_user_id = app.current_user_id()
    )
  );

ALTER TABLE app.gamification_quest_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_quest_cycles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_quest_cycles_select_members ON app.gamification_quest_cycles;
DROP POLICY IF EXISTS app_gamification_quest_cycles_insert_members ON app.gamification_quest_cycles;
DROP POLICY IF EXISTS app_gamification_quest_cycles_update_members ON app.gamification_quest_cycles;
CREATE POLICY app_gamification_quest_cycles_select_members ON app.gamification_quest_cycles
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_quest_cycles_insert_members ON app.gamification_quest_cycles
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_quest_cycles_update_members ON app.gamification_quest_cycles
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.gamification_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_quest_progress FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_quest_progress_select_members ON app.gamification_quest_progress;
DROP POLICY IF EXISTS app_gamification_quest_progress_insert_members ON app.gamification_quest_progress;
DROP POLICY IF EXISTS app_gamification_quest_progress_update_members ON app.gamification_quest_progress;
CREATE POLICY app_gamification_quest_progress_select_members ON app.gamification_quest_progress
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_quest_progress_insert_members ON app.gamification_quest_progress
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_quest_progress_update_members ON app.gamification_quest_progress
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.gamification_streak_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_streak_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_streak_events_select_members ON app.gamification_streak_events;
DROP POLICY IF EXISTS app_gamification_streak_events_insert_members ON app.gamification_streak_events;
CREATE POLICY app_gamification_streak_events_select_members ON app.gamification_streak_events
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_streak_events_insert_members ON app.gamification_streak_events
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      actor_user_id IS NULL
      OR actor_user_id = app.current_user_id()
    )
  );

ALTER TABLE app.gamification_streak_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_streak_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_streak_state_select_members ON app.gamification_streak_state;
DROP POLICY IF EXISTS app_gamification_streak_state_insert_members ON app.gamification_streak_state;
DROP POLICY IF EXISTS app_gamification_streak_state_update_members ON app.gamification_streak_state;
CREATE POLICY app_gamification_streak_state_select_members ON app.gamification_streak_state
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_streak_state_insert_members ON app.gamification_streak_state
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_streak_state_update_members ON app.gamification_streak_state
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.gamification_reward_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_reward_notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_reward_notifications_select_members ON app.gamification_reward_notifications;
DROP POLICY IF EXISTS app_gamification_reward_notifications_insert_members ON app.gamification_reward_notifications;
DROP POLICY IF EXISTS app_gamification_reward_notifications_update_members ON app.gamification_reward_notifications;
CREATE POLICY app_gamification_reward_notifications_select_members ON app.gamification_reward_notifications
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_reward_notifications_insert_members ON app.gamification_reward_notifications
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
CREATE POLICY app_gamification_reward_notifications_update_members ON app.gamification_reward_notifications
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE app.gamification_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gamification_adjustments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_gamification_adjustments_select_members ON app.gamification_adjustments;
DROP POLICY IF EXISTS app_gamification_adjustments_insert_members ON app.gamification_adjustments;
CREATE POLICY app_gamification_adjustments_select_members ON app.gamification_adjustments
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_gamification_adjustments_insert_members ON app.gamification_adjustments
  FOR INSERT TO PUBLIC
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    AND (
      actor_user_id IS NULL
      OR actor_user_id = app.current_user_id()
    )
  );

ALTER TABLE ops.gamification_projection_rebuilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.gamification_projection_rebuilds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_gamification_projection_rebuilds_select_members ON ops.gamification_projection_rebuilds;
DROP POLICY IF EXISTS ops_gamification_projection_rebuilds_select_worker ON ops.gamification_projection_rebuilds;
DROP POLICY IF EXISTS ops_gamification_projection_rebuilds_insert_worker ON ops.gamification_projection_rebuilds;
DROP POLICY IF EXISTS ops_gamification_projection_rebuilds_update_worker ON ops.gamification_projection_rebuilds;
CREATE POLICY ops_gamification_projection_rebuilds_select_members ON ops.gamification_projection_rebuilds
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_gamification_projection_rebuilds_select_worker ON ops.gamification_projection_rebuilds
  FOR SELECT TO queue2_worker
  USING (true);
CREATE POLICY ops_gamification_projection_rebuilds_insert_worker ON ops.gamification_projection_rebuilds
  FOR INSERT TO queue2_worker
  WITH CHECK (true);
CREATE POLICY ops_gamification_projection_rebuilds_update_worker ON ops.gamification_projection_rebuilds
  FOR UPDATE TO queue2_worker
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON app.gamification_achievement_catalog TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT SELECT ON app.gamification_quest_templates TO queue2_app_runtime, queue2_worker, queue2_readonly;

GRANT UPDATE (xp, level, streak, updated_at) ON app.duos TO queue2_app_runtime, queue2_worker;

GRANT SELECT, INSERT ON app.gamification_achievement_unlocks TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_achievement_unlocks TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_quest_cycles TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (status, updated_at) ON app.gamification_quest_cycles TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_quest_cycles TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_quest_progress TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (current_value, completed_at, reward_award_id, last_source_type, last_source_id, metadata, updated_at)
  ON app.gamification_quest_progress TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_quest_progress TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_streak_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_streak_events TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_streak_state TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (current_streak, longest_streak, available_freezes, last_activity_duo_day, updated_at)
  ON app.gamification_streak_state TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_streak_state TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_reward_notifications TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (read_at, updated_at) ON app.gamification_reward_notifications TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_reward_notifications TO queue2_readonly;

GRANT SELECT, INSERT ON app.gamification_adjustments TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.gamification_adjustments TO queue2_readonly;

GRANT SELECT ON ops.gamification_projection_rebuilds TO queue2_app_runtime, queue2_readonly;
GRANT SELECT, INSERT ON ops.gamification_projection_rebuilds TO queue2_worker;
GRANT UPDATE (
  status,
  xp_before,
  xp_after,
  level_before,
  level_after,
  streak_before,
  streak_after,
  metadata,
  finished_at,
  updated_at
) ON ops.gamification_projection_rebuilds TO queue2_worker;
