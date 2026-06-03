-- Transaction-local identity and duo membership helpers.
-- These helpers are intentionally schema-qualified and executable only by reviewed roles.

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
