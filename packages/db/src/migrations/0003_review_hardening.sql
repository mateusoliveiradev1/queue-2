-- QUEUE/2 Phase 1 code-review hardening.
-- Aligns Better Auth rate-limit storage, restricts runtime duo updates and
-- ties concurrent pairing failures to the exact code row observed by a claim.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'rate_limit'
      AND column_name = 'last_request'
      AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE auth.rate_limit
      ALTER COLUMN last_request DROP DEFAULT,
      ALTER COLUMN last_request TYPE bigint
        USING floor(extract(epoch FROM last_request) * 1000)::bigint;
  END IF;
END
$$;

ALTER TABLE auth.rate_limit
  ALTER COLUMN last_request DROP DEFAULT;

COMMENT ON COLUMN auth.rate_limit.last_request IS
  'Epoch milliseconds. Matches Better Auth database rate-limit lastRequest.';

REVOKE UPDATE ON app.duos FROM queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.duos TO queue2_app_runtime, queue2_worker;
GRANT UPDATE (name, timezone, updated_at) ON app.duos TO queue2_app_runtime, queue2_worker;

CREATE OR REPLACE FUNCTION app.claim_pairing_code(pairing_code text, claimant_user_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, auth, ops, pg_catalog
AS $$
DECLARE
  target_pairing_code_id uuid;
  claimed_duo_id uuid;
BEGIN
  IF app.current_user_id() IS DISTINCT FROM claimant_user_id THEN
    RAISE EXCEPTION 'database identity does not match claimant_user_id' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM app.duo_members AS member WHERE member.user_id = claimant_user_id) THEN
    RAISE EXCEPTION 'user_already_in_duo' USING ERRCODE = '23505';
  END IF;

  SELECT code.id
  INTO target_pairing_code_id
  FROM app.pairing_codes AS code
  WHERE code.code = upper(pairing_code)
    AND code.revoked_at IS NULL
    AND code.claimed_at IS NULL
    AND code.expires_at > now()
  LIMIT 1;

  IF target_pairing_code_id IS NULL THEN
    RAISE EXCEPTION 'pairing_code_inactive' USING ERRCODE = 'P0001';
  END IF;

  UPDATE app.pairing_codes AS code
  SET claimed_by_user_id = claimant_user_id,
      claimed_at = now()
  WHERE code.id = target_pairing_code_id
    AND code.revoked_at IS NULL
    AND code.claimed_at IS NULL
    AND code.expires_at > now()
  RETURNING code.duo_id INTO claimed_duo_id;

  IF claimed_duo_id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM app.pairing_codes AS code
      WHERE code.id = target_pairing_code_id
        AND code.claimed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'pairing_code_formed' USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'pairing_code_inactive' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO app.duo_members (duo_id, user_id, member_slot)
  VALUES (claimed_duo_id, claimant_user_id, 2);

  UPDATE app.duos
  SET paired_at = coalesce(paired_at, now()),
      updated_at = now()
  WHERE id = claimed_duo_id;

  RETURN claimed_duo_id;
END;
$$;

REVOKE ALL ON FUNCTION app.claim_pairing_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.claim_pairing_code(text, text) TO queue2_app_runtime, queue2_worker;
