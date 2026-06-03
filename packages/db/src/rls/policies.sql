-- Default-deny RLS policies for QUEUE/2 Phase 1.
-- Table privileges grant only the operations below; DELETE remains denied for duo-scoped tables.

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
DROP POLICY IF EXISTS app_duos_insert_authenticated ON app.duos;
DROP POLICY IF EXISTS app_duos_update_members ON app.duos;
CREATE POLICY app_duos_select_members ON app.duos
  FOR SELECT TO PUBLIC
  USING (app.has_duo_membership(app.current_user_id(), id));
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
DROP POLICY IF EXISTS app_duo_members_insert_pairing_flow ON app.duo_members;
CREATE POLICY app_duo_members_select_own ON app.duo_members
  FOR SELECT TO PUBLIC
  USING (
    CASE
      WHEN user_id = app.current_user_id() THEN true
      ELSE app.has_duo_membership(app.current_user_id(), duo_id)
    END
  );
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
