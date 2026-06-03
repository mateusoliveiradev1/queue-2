-- QUEUE/2 Phase 02.1 catalog sync operational audit.
-- Owner module: ops. Catalog sync run records are operational catalog data,
-- not duo-scoped audit events. They intentionally have no duo_id and no RLS;
-- app runtime receives no mutation grants, while worker records lifecycle.

CREATE TABLE IF NOT EXISTS ops.catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source varchar(40) NOT NULL DEFAULT 'RAWG',
  mode varchar(24) NOT NULL,
  dry_run boolean NOT NULL DEFAULT true,
  status varchar(24) NOT NULL DEFAULT 'running',
  requested_by text,
  input_count integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_catalog_sync_runs_mode_chk CHECK (mode IN ('dry-run', 'apply')),
  CONSTRAINT ops_catalog_sync_runs_status_chk CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT ops_catalog_sync_runs_counts_non_negative_chk CHECK (
    input_count >= 0
    AND created_count >= 0
    AND updated_count >= 0
    AND skipped_count >= 0
    AND failed_count >= 0
  )
);

CREATE INDEX IF NOT EXISTS ops_catalog_sync_runs_status_started_idx
  ON ops.catalog_sync_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS ops_catalog_sync_runs_source_started_idx
  ON ops.catalog_sync_runs (source, started_at DESC);

COMMENT ON TABLE ops.catalog_sync_runs IS
  'Owner module: ops. Non-duo operational audit for catalog sync attempts and aggregate counts.';
COMMENT ON COLUMN ops.catalog_sync_runs.requested_by IS
  'Operator, CLI, cron or deployment identity. Never store provider secrets.';
COMMENT ON COLUMN ops.catalog_sync_runs.metadata IS
  'Structured non-secret sync metadata such as allowlist version and redacted environment facts.';

CREATE TABLE IF NOT EXISTS ops.catalog_sync_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES ops.catalog_sync_runs(id) ON DELETE CASCADE,
  rawg_id integer,
  slug varchar(160) NOT NULL,
  status varchar(24) NOT NULL,
  game_id uuid REFERENCES catalog.games(id) ON DELETE SET NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code varchar(80),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT ops_catalog_sync_run_items_status_chk CHECK (
    status IN ('planned', 'created', 'updated', 'skipped', 'failed')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_catalog_sync_run_items_run_slug_uidx
  ON ops.catalog_sync_run_items (run_id, slug);
CREATE INDEX IF NOT EXISTS ops_catalog_sync_run_items_run_status_idx
  ON ops.catalog_sync_run_items (run_id, status);
CREATE INDEX IF NOT EXISTS ops_catalog_sync_run_items_game_idx
  ON ops.catalog_sync_run_items (game_id);

COMMENT ON TABLE ops.catalog_sync_run_items IS
  'Owner module: ops. Per-item catalog sync audit with redacted errors and structured change summaries.';
COMMENT ON COLUMN ops.catalog_sync_run_items.changes IS
  'Non-secret diff summary for planned or applied catalog changes.';
COMMENT ON COLUMN ops.catalog_sync_run_items.error_message IS
  'Redacted human-readable error. Do not store RAWG keys, provider keys or raw secret-bearing payloads.';

GRANT SELECT, INSERT, UPDATE ON ops.catalog_sync_runs TO queue2_worker;
GRANT SELECT, INSERT, UPDATE ON ops.catalog_sync_run_items TO queue2_worker;
GRANT SELECT ON ops.catalog_sync_runs, ops.catalog_sync_run_items TO queue2_readonly;
