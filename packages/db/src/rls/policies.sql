-- Default-deny RLS policies for QUEUE/2.
-- Table privileges grant only the operations below; DELETE remains denied for
-- duo-scoped tables except narrow owner-module cases such as active play reorder.

ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_profiles_select_own ON app.profiles;
DROP POLICY IF EXISTS app_profiles_insert_own ON app.profiles;
DROP POLICY IF EXISTS app_profiles_update_own ON app.profiles;
CREATE POLICY app_profiles_select_own ON app.profiles
  FOR SELECT TO PUBLIC
  USING (user_id = app.current_user_id());
CREATE POLICY app_profiles_insert_own ON app.profiles
  FOR INSERT TO PUBLIC
  WITH CHECK (user_id = app.current_user_id());
CREATE POLICY app_profiles_update_own ON app.profiles
  FOR UPDATE TO PUBLIC
  USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

ALTER TABLE app.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duos_select_members ON app.duos;
DROP POLICY IF EXISTS app_duos_select_job_worker ON app.duos;
DROP POLICY IF EXISTS app_duos_insert_authenticated ON app.duos;
DROP POLICY IF EXISTS app_duos_update_members ON app.duos;
CREATE POLICY app_duos_select_members ON app.duos
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), id));
CREATE POLICY app_duos_select_job_worker ON app.duos
  FOR SELECT TO queue2_worker
  USING (true);
CREATE POLICY app_duos_insert_authenticated ON app.duos
  FOR INSERT TO PUBLIC
  WITH CHECK (app.current_user_id() IS NOT NULL);
CREATE POLICY app_duos_update_members ON app.duos
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), id));

ALTER TABLE app.duo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_members_select_own ON app.duo_members;
DROP POLICY IF EXISTS app_duo_members_select_job_worker ON app.duo_members;
DROP POLICY IF EXISTS app_duo_members_insert_pairing_flow ON app.duo_members;
CREATE POLICY app_duo_members_select_own ON app.duo_members
  FOR SELECT TO PUBLIC
  USING (
    CASE
      WHEN user_id = app.current_user_id() THEN true
      ELSE app.has_duo_membership(app.current_user_id(), duo_id)
    END
  );
CREATE POLICY app_duo_members_select_job_worker ON app.duo_members
  FOR SELECT TO queue2_worker
  USING (true);
CREATE POLICY app_duo_members_insert_pairing_flow ON app.duo_members
  FOR INSERT TO PUBLIC
  WITH CHECK (
    user_id = app.current_user_id()
    AND (
      member_slot = 1
      OR (
        member_slot = 2
        AND EXISTS (
          SELECT 1
          FROM app.pairing_codes AS code
          WHERE code.duo_id = app.duo_members.duo_id
            AND code.claimed_by_user_id = app.current_user_id()
            AND code.claimed_at IS NOT NULL
        )
      )
    )
  );

REVOKE SELECT ON app.duos FROM queue2_worker;
REVOKE UPDATE (name, timezone, xp, level, streak, updated_at)
  ON app.duos FROM queue2_worker;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON app.duos FROM queue2_worker;
GRANT SELECT (id, name, paired_at, timezone)
  ON app.duos TO queue2_worker;

REVOKE SELECT ON app.duo_members FROM queue2_worker;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON app.duo_members FROM queue2_worker;
GRANT SELECT (duo_id, user_id, member_slot)
  ON app.duo_members TO queue2_worker;

ALTER TABLE app.pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.pairing_codes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_pairing_codes_select_visible ON app.pairing_codes;
DROP POLICY IF EXISTS app_pairing_codes_insert_members ON app.pairing_codes;
DROP POLICY IF EXISTS app_pairing_codes_update_members_or_claimant ON app.pairing_codes;
CREATE POLICY app_pairing_codes_select_visible ON app.pairing_codes
  FOR SELECT TO PUBLIC
  USING (
    app.has_duo_membership(app.current_user_id(), duo_id)
    OR claimed_by_user_id = app.current_user_id()
  );
CREATE POLICY app_pairing_codes_insert_members ON app.pairing_codes
  FOR INSERT TO PUBLIC
  WITH CHECK (
    created_by_user_id = app.current_user_id()
    AND app.has_duo_membership(app.current_user_id(), duo_id)
  );
CREATE POLICY app_pairing_codes_update_members_or_claimant ON app.pairing_codes
  FOR UPDATE TO PUBLIC
  USING (
    app.has_duo_membership(app.current_user_id(), duo_id)
    OR (revoked_at IS NULL AND claimed_at IS NULL AND expires_at > now())
  )
  WITH CHECK (
    app.has_duo_membership(app.current_user_id(), duo_id)
    OR claimed_by_user_id = app.current_user_id()
  );

ALTER TABLE app.duo_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_preferences FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_preferences_select_members ON app.duo_preferences;
DROP POLICY IF EXISTS app_duo_preferences_insert_members ON app.duo_preferences;
DROP POLICY IF EXISTS app_duo_preferences_update_members ON app.duo_preferences;
CREATE POLICY app_duo_preferences_select_members ON app.duo_preferences
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_duo_preferences_insert_members ON app.duo_preferences
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY app_duo_preferences_update_members ON app.duo_preferences
  FOR UPDATE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id))
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

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

ALTER TABLE ops.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.domain_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_domain_events_select_members ON ops.domain_events;
DROP POLICY IF EXISTS ops_domain_events_insert_members ON ops.domain_events;
CREATE POLICY ops_domain_events_select_members ON ops.domain_events
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_domain_events_insert_members ON ops.domain_events
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE ops.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_audit_events_select_members ON ops.audit_events;
DROP POLICY IF EXISTS ops_audit_events_insert_members ON ops.audit_events;
CREATE POLICY ops_audit_events_select_members ON ops.audit_events
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_audit_events_insert_members ON ops.audit_events
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

ALTER TABLE ops.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_idempotency_keys_select_members ON ops.idempotency_keys;
DROP POLICY IF EXISTS ops_idempotency_keys_insert_members ON ops.idempotency_keys;
CREATE POLICY ops_idempotency_keys_select_members ON ops.idempotency_keys
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));
CREATE POLICY ops_idempotency_keys_insert_members ON ops.idempotency_keys
  FOR INSERT TO PUBLIC
  WITH CHECK (app.has_duo_membership(app.current_user_id(), duo_id));

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

ALTER TABLE app.play_active_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.play_active_games FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_play_active_games_select_members ON app.play_active_games;
DROP POLICY IF EXISTS app_play_active_games_insert_members ON app.play_active_games;
DROP POLICY IF EXISTS app_play_active_games_update_members ON app.play_active_games;
DROP POLICY IF EXISTS app_play_active_games_delete_members ON app.play_active_games;
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
CREATE POLICY app_play_active_games_delete_members ON app.play_active_games
  FOR DELETE TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), duo_id));

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
