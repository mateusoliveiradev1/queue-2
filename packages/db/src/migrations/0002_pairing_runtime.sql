-- QUEUE/2 Phase 1 pairing runtime hardening.
-- Keeps code revocation behind a reviewed function and gives a race-lost state
-- without exposing duo identity or distinguishing revoked from expired codes.

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
    IF EXISTS (
      SELECT 1
      FROM app.pairing_codes AS code
      WHERE code.code = upper(pairing_code)
        AND code.claimed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'pairing_code_formed' USING ERRCODE = 'P0001';
    END IF;

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

CREATE OR REPLACE FUNCTION app.revoke_pairing_code(pairing_code_id uuid, actor_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  revoked boolean;
BEGIN
  IF app.current_user_id() IS DISTINCT FROM actor_user_id THEN
    RAISE EXCEPTION 'database identity does not match actor_user_id' USING ERRCODE = '28000';
  END IF;

  UPDATE app.pairing_codes AS code
  SET revoked_at = now()
  WHERE code.id = pairing_code_id
    AND code.created_by_user_id = actor_user_id
    AND code.revoked_at IS NULL
    AND code.claimed_at IS NULL
    AND code.expires_at > now()
    AND app.has_duo_membership(actor_user_id, code.duo_id)
  RETURNING true INTO revoked;

  RETURN coalesce(revoked, false);
END;
$$;

REVOKE ALL ON FUNCTION app.claim_pairing_code(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_pairing_code(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.claim_pairing_code(text, text) TO queue2_app_runtime, queue2_worker;
GRANT EXECUTE ON FUNCTION app.revoke_pairing_code(uuid, text) TO queue2_app_runtime, queue2_worker;
