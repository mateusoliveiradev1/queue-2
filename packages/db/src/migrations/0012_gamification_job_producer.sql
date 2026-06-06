-- QUEUE/2 Phase 5 gap closure: gamification job producer.
-- The worker may enumerate only the readiness facts required to bootstrap
-- scheduled jobs. The web runtime keeps member-scoped RLS and the worker
-- receives no write access to duo ownership tables.

ALTER TABLE app.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duos FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duos_select_job_worker ON app.duos;
CREATE POLICY app_duos_select_job_worker ON app.duos
  FOR SELECT TO queue2_worker
  USING (true);

ALTER TABLE app.duo_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.duo_members FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_duo_members_select_job_worker ON app.duo_members;
CREATE POLICY app_duo_members_select_job_worker ON app.duo_members
  FOR SELECT TO queue2_worker
  USING (true);

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

COMMENT ON POLICY app_duos_select_job_worker ON app.duos IS
  'Phase 5 job producer gap closure: queue2_worker reads only granted duo readiness columns; app runtime remains member-scoped.';
COMMENT ON POLICY app_duo_members_select_job_worker ON app.duo_members IS
  'Phase 5 job producer gap closure: queue2_worker enumerates member count and deterministic creator slot without write access.';
