-- QUEUE/2 Phase 02.1 catalog localization contract.
-- Owner module: catalog. Reviewed PT-BR localization rows are public catalog
-- metadata, not duo-scoped data. RLS is not required because rows contain no
-- private duo facts; least-privilege grants keep publication worker-only.

CREATE TABLE IF NOT EXISTS catalog.game_localizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES catalog.games(id) ON DELETE CASCADE,
  locale varchar(16) NOT NULL,
  version integer NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft',
  title text,
  description text,
  source varchar(80) NOT NULL,
  source_url text,
  raw_source_hash text,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  author_kind varchar(32) NOT NULL,
  author_id text,
  reviewer_kind varchar(32),
  reviewer_id text,
  review_notes text,
  quality_check jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  CONSTRAINT catalog_game_localizations_game_locale_version_uidx UNIQUE (game_id, locale, version),
  CONSTRAINT catalog_game_localizations_version_positive_chk CHECK (version >= 1),
  CONSTRAINT catalog_game_localizations_status_chk CHECK (status IN ('draft', 'review', 'published', 'rejected')),
  CONSTRAINT catalog_game_localizations_locale_chk CHECK (char_length(btrim(locale)) > 0),
  CONSTRAINT catalog_game_localizations_published_ready_chk CHECK (
    status <> 'published'
    OR (
      description IS NOT NULL
      AND char_length(btrim(description)) > 0
      AND reviewer_kind IS NOT NULL
      AND reviewer_id IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND published_at IS NOT NULL
      AND quality_check ?& array[
        'coop_facts_checked',
        'spoilers_avoided',
        'facts_not_invented',
        'natural_pt_br',
        'queue2_tone_controlled'
      ]
    )
  )
);

CREATE INDEX IF NOT EXISTS catalog_game_localizations_published_lookup_idx
  ON catalog.game_localizations (game_id, locale, status, published_at DESC NULLS LAST, version DESC);

COMMENT ON TABLE catalog.game_localizations IS
  'Owner module: catalog. Versioned reviewed localization metadata for public catalog reads; non-duo-scoped and intentionally not RLS protected.';
COMMENT ON COLUMN catalog.game_localizations.status IS
  'Localization workflow state: draft, review, published or rejected.';
COMMENT ON COLUMN catalog.game_localizations.source IS
  'Internal localization source such as queue2-curation or provider-assisted draft; provider output is never published without review.';
COMMENT ON COLUMN catalog.game_localizations.raw_source_hash IS
  'Hash of the raw source text used by a draft/review flow, avoiding unnecessary external text duplication.';
COMMENT ON COLUMN catalog.game_localizations.provenance IS
  'Internal audit metadata for seed/provider/import origin. Do not expose author or reviewer identifiers to end users.';
COMMENT ON COLUMN catalog.game_localizations.quality_check IS
  'Publication checklist metadata: coop facts checked, spoilers avoided, facts not invented, natural PT-BR and restrained QUEUE/2 tone.';

GRANT SELECT ON catalog.game_localizations TO queue2_app_runtime, queue2_worker, queue2_readonly;
GRANT INSERT, UPDATE ON catalog.game_localizations TO queue2_worker;
