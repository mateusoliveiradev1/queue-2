-- QUEUE/2 database role contract.
-- Run with a reviewed owner/migrator credential, never from the web runtime.

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
GRANT SELECT, UPDATE ON app.duos TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON app.duo_members TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON app.pairing_codes TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT, UPDATE ON app.duo_preferences TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO queue2_readonly;

GRANT SELECT, INSERT ON ops.domain_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON ops.audit_events TO queue2_app_runtime, queue2_worker;
GRANT SELECT, INSERT ON ops.idempotency_keys TO queue2_app_runtime, queue2_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA ops TO queue2_readonly;

GRANT queue2_app_runtime TO queue2_migrator;
GRANT queue2_worker TO queue2_migrator;
GRANT queue2_readonly TO queue2_migrator;
