-- QUEUE/2 Phase 5 gap closure: allow the least-privileged worker to enqueue
-- only gamification maintenance jobs. Other scheduled job domains remain
-- protected by their own producer contracts.

ALTER TABLE ops.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.scheduled_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_scheduled_jobs_insert_gamification_worker
  ON ops.scheduled_jobs;
CREATE POLICY ops_scheduled_jobs_insert_gamification_worker
  ON ops.scheduled_jobs
  FOR INSERT TO queue2_worker
  WITH CHECK (
    job_type IN (
      'gamification-quest-rotation',
      'gamification-streak-check'
    )
    AND jsonb_typeof(payload) = 'object'
    AND nullif(btrim(payload ->> 'createdByUserId'), '') IS NOT NULL
  );

COMMENT ON POLICY ops_scheduled_jobs_insert_gamification_worker
  ON ops.scheduled_jobs IS
  'Phase 5 job producer gap closure: queue2_worker may enqueue only validated gamification quest/streak jobs.';
