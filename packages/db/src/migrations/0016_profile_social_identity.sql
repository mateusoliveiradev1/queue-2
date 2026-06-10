-- Owner module: duo. Extends user-facing profile identity with bio and social links.

ALTER TABLE app.profiles
  ADD COLUMN IF NOT EXISTS bio varchar(180);

ALTER TABLE app.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_profiles_bio_length_chk'
      AND conrelid = 'app.profiles'::regclass
  ) THEN
    ALTER TABLE app.profiles
      ADD CONSTRAINT app_profiles_bio_length_chk
      CHECK (bio IS NULL OR char_length(bio) <= 180);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_profiles_social_links_shape_chk'
      AND conrelid = 'app.profiles'::regclass
  ) THEN
    ALTER TABLE app.profiles
      ADD CONSTRAINT app_profiles_social_links_shape_chk
      CHECK (
        jsonb_typeof(social_links) = 'object'
        AND octet_length(social_links::text) <= 1200
      );
  END IF;
END
$$;

COMMENT ON COLUMN app.profiles.bio IS
  'Short optional profile bio shown inside the fixed duo context.';

COMMENT ON COLUMN app.profiles.social_links IS
  'Validated optional social links/handles shown inside the fixed duo context.';
