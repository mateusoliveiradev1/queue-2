-- QUEUE/2 Phase 1 foundation.
-- Owner modules:
-- - auth: Better Auth tables and persistent auth rate limits.
-- - catalog: reserved namespace for Phase 2 external catalog tables.
-- - app: duo identity, membership, pairing and shared preferences.
-- - ops: append-only domain/audit events and idempotency keys.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS ops;

COMMENT ON SCHEMA auth IS 'Owner: Better Auth platform tables and auth rate-limit state.';
COMMENT ON SCHEMA catalog IS 'Owner: external game catalog and sourced metadata, reserved for Phase 2.';
COMMENT ON SCHEMA app IS 'Owner: QUEUE/2 duo-scoped product state.';
COMMENT ON SCHEMA ops IS 'Owner: append-only operational facts, idempotency and audit records.';

CREATE TABLE IF NOT EXISTS auth."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_uidx ON auth."user" (email);

COMMENT ON TABLE auth."user" IS 'Owner module: platform/auth. Better Auth user accounts only.';

CREATE TABLE IF NOT EXISTS auth.session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_uidx ON auth.session (token);
CREATE INDEX IF NOT EXISTS auth_session_user_id_idx ON auth.session (user_id);

COMMENT ON TABLE auth.session IS 'Owner module: platform/auth. Better Auth session storage.';

CREATE TABLE IF NOT EXISTS auth.account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_account_provider_account_uidx ON auth.account (provider_id, account_id);
CREATE INDEX IF NOT EXISTS auth_account_user_id_idx ON auth.account (user_id);

COMMENT ON TABLE auth.account IS 'Owner module: platform/auth. Better Auth account credentials and provider state.';

CREATE TABLE IF NOT EXISTS auth.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_verification_identifier_idx ON auth.verification (identifier);

COMMENT ON TABLE auth.verification IS 'Owner module: platform/auth. Email verification and reset token state.';

CREATE TABLE IF NOT EXISTS auth.rate_limit (
  id text PRIMARY KEY,
  key text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  last_request timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_rate_limit_count_non_negative_chk CHECK (count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_rate_limit_key_uidx ON auth.rate_limit (key);

COMMENT ON TABLE auth.rate_limit IS 'Owner module: platform/auth. Persistent serverless-safe auth rate-limit counters.';

CREATE TABLE IF NOT EXISTS app.profiles (
  user_id text PRIMARY KEY REFERENCES auth."user"(id) ON DELETE CASCADE,
  display_name varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_profiles_display_name_length_chk CHECK (char_length(display_name) BETWEEN 1 AND 40)
);

COMMENT ON TABLE app.profiles IS 'Owner module: duo. User-facing profile text; not a solo progress surface.';

CREATE TABLE IF NOT EXISTS app.duos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(48),
  paired_at timestamptz,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak integer NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_duos_name_length_chk CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 48),
  CONSTRAINT app_duos_xp_non_negative_chk CHECK (xp >= 0),
  CONSTRAINT app_duos_level_positive_chk CHECK (level >= 1),
  CONSTRAINT app_duos_streak_non_negative_chk CHECK (streak >= 0)
);

COMMENT ON TABLE app.duos IS 'Owner module: duo. Shared duo identity and collective progression only.';

CREATE TABLE IF NOT EXISTS app.duo_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  member_slot smallint NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_duo_members_slot_chk CHECK (member_slot IN (1, 2))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_duo_members_duo_slot_uidx ON app.duo_members (duo_id, member_slot);
CREATE UNIQUE INDEX IF NOT EXISTS app_duo_members_duo_user_uidx ON app.duo_members (duo_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS app_duo_members_user_uidx ON app.duo_members (user_id);
CREATE INDEX IF NOT EXISTS app_duo_members_user_duo_idx ON app.duo_members (user_id, duo_id);

COMMENT ON TABLE app.duo_members IS 'Owner module: duo. Exactly two membership slots; no solo or group membership path.';

CREATE TABLE IF NOT EXISTS app.pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  code varchar(6) NOT NULL,
  created_by_user_id text NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  claimed_by_user_id text REFERENCES auth."user"(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_pairing_codes_format_chk CHECK (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  CONSTRAINT app_pairing_codes_claim_state_chk CHECK ((claimed_at IS NULL) = (claimed_by_user_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_pairing_codes_active_code_uidx
  ON app.pairing_codes (code)
  WHERE revoked_at IS NULL AND claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS app_pairing_codes_duo_idx ON app.pairing_codes (duo_id);
CREATE INDEX IF NOT EXISTS app_pairing_codes_created_by_idx ON app.pairing_codes (created_by_user_id);

COMMENT ON TABLE app.pairing_codes IS 'Owner module: duo. Six-character direct invite codes with expiry, revocation and claim state.';

CREATE TABLE IF NOT EXISTS app.duo_preferences (
  duo_id uuid PRIMARY KEY REFERENCES app.duos(id) ON DELETE CASCADE,
  notifications_enabled boolean NOT NULL DEFAULT true,
  audio_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app.duo_preferences IS 'Owner module: duo. Shared calm notification and audio defaults; push opt-in is deferred.';

CREATE TABLE IF NOT EXISTS ops.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  event_type varchar(120) NOT NULL,
  aggregate_type varchar(80) NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_domain_events_duo_occurred_idx ON ops.domain_events (duo_id, occurred_at);
CREATE INDEX IF NOT EXISTS ops_domain_events_aggregate_idx ON ops.domain_events (aggregate_type, aggregate_id);

COMMENT ON TABLE ops.domain_events IS 'Owner module: ops. Append-only public domain facts for replay and derived effects.';

CREATE TABLE IF NOT EXISTS ops.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  actor_user_id text NOT NULL,
  action varchar(120) NOT NULL,
  metadata jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_audit_events_duo_occurred_idx ON ops.audit_events (duo_id, occurred_at);
CREATE INDEX IF NOT EXISTS ops_audit_events_actor_idx ON ops.audit_events (actor_user_id);

COMMENT ON TABLE ops.audit_events IS 'Owner module: ops. Append-only security and product audit facts.';

CREATE TABLE IF NOT EXISTS ops.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_id uuid NOT NULL REFERENCES app.duos(id) ON DELETE CASCADE,
  key text NOT NULL,
  scope varchar(80) NOT NULL,
  response_digest text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_idempotency_keys_scope_key_uidx ON ops.idempotency_keys (scope, key);
CREATE INDEX IF NOT EXISTS ops_idempotency_keys_duo_scope_idx ON ops.idempotency_keys (duo_id, scope);
CREATE INDEX IF NOT EXISTS ops_idempotency_keys_expires_idx ON ops.idempotency_keys (expires_at);

COMMENT ON TABLE ops.idempotency_keys IS 'Owner module: ops. One effect key per duo-scoped operation scope.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'queue2_migrator') THEN
    CREATE ROLE queue2_migrator LOGIN NOINHERIT NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'queue2_app_runtime') THEN
    CREATE ROLE queue2_app_runtime LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'queue2_worker') THEN
    CREATE ROLE queue2_worker LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'queue2_readonly') THEN
    CREATE ROLE queue2_readonly LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE queue2_app_runtime NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE queue2_worker NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE queue2_readonly NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;

GRANT USAGE ON SCHEMA auth TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT USAGE ON SCHEMA app TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT USAGE ON SCHEMA ops TO queue2_app_runtime, queue2_worker, queue2_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO queue2_app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO queue2_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO queue2_readonly;

GRANT SELECT, INSERT, UPDATE ON app.profiles TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT, UPDATE ON app.duos TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.duo_members TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON app.pairing_codes TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT, UPDATE ON app.duo_preferences TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO queue2_readonly;

GRANT SELECT, INSERT ON ops.domain_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON ops.audit_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON ops.idempotency_keys TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA ops TO queue2_readonly;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = app, pg_catalog
AS $$
  SELECT nullif(current_setting('queue2.user_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app.has_duo_membership(uid text, target_duo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.duo_members AS member
    WHERE member.user_id = uid
      AND member.duo_id = target_duo_id
  )
$$;

CREATE OR REPLACE FUNCTION app.create_duo_with_pairing_code(
  owner_user_id text,
  duo_name text,
  pairing_code text,
  expires_at timestamptz,
  duo_timezone text DEFAULT 'America/Sao_Paulo'
)
RETURNS TABLE (duo_id uuid, pairing_code_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  new_duo_id uuid;
  new_pairing_code_id uuid;
BEGIN
  IF app.current_user_id() IS DISTINCT FROM owner_user_id THEN
    RAISE EXCEPTION 'database identity does not match owner_user_id' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM app.duo_members AS member WHERE member.user_id = owner_user_id) THEN
    RAISE EXCEPTION 'user_already_in_duo' USING ERRCODE = '23505';
  END IF;

  INSERT INTO app.duos (name, timezone)
  VALUES (nullif(duo_name, ''), duo_timezone)
  RETURNING id INTO new_duo_id;

  INSERT INTO app.duo_members (duo_id, user_id, member_slot)
  VALUES (new_duo_id, owner_user_id, 1);

  INSERT INTO app.duo_preferences (duo_id)
  VALUES (new_duo_id);

  INSERT INTO app.pairing_codes (duo_id, code, created_by_user_id, expires_at)
  VALUES (new_duo_id, upper(pairing_code), owner_user_id, expires_at)
  RETURNING id INTO new_pairing_code_id;

  duo_id := new_duo_id;
  pairing_code_id := new_pairing_code_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION app.claim_pairing_code(pairing_code text, claimant_user_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  target_duo_id uuid;
BEGIN
  IF app.current_user_id() IS DISTINCT FROM claimant_user_id THEN
    RAISE EXCEPTION 'database identity does not match claimant_user_id' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM app.duo_members AS member WHERE member.user_id = claimant_user_id) THEN
    RAISE EXCEPTION 'user_already_in_duo' USING ERRCODE = '23505';
  END IF;

  UPDATE app.pairing_codes AS code
  SET claimed_by_user_id = claimant_user_id,
      claimed_at = now()
  WHERE code.code = upper(pairing_code)
    AND code.revoked_at IS NULL
    AND code.claimed_at IS NULL
    AND code.expires_at > now()
  RETURNING code.duo_id INTO target_duo_id;

  IF target_duo_id IS NULL THEN
    RAISE EXCEPTION 'pairing_code_inactive' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO app.duo_members (duo_id, user_id, member_slot)
  VALUES (target_duo_id, claimant_user_id, 2);

  UPDATE app.duos
  SET paired_at = coalesce(paired_at, now()),
      updated_at = now()
  WHERE id = target_duo_id;

  RETURN target_duo_id;
END;
$$;

REVOKE ALL ON FUNCTION app.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.has_duo_membership(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_duo_with_pairing_code(text, text, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.claim_pairing_code(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.current_user_id() TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT EXECUTE ON FUNCTION app.has_duo_membership(text, uuid) TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT EXECUTE ON FUNCTION app.create_duo_with_pairing_code(text, text, text, timestamptz, text) TO queue2_app_runtime, queue2_worker;
GRANT EXECUTE ON FUNCTION app.claim_pairing_code(text, text) TO queue2_app_runtime, queue2_worker;

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
  USING (user_id = app.current_user_id());
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
