import type pg from "pg";

import {
  createMigratedIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("profile identity migrations", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    const migratedPool = await createMigratedIntegrationPool();

    if (!migratedPool) {
      throw new Error(missingTestDatabaseMessage);
    }

    pool = migratedPool;
  });

  afterAll(async () => {
    await pool.end();
  });

  test("adds constrained bio and social links to app profiles", async () => {
    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'app'
        AND table_name = 'profiles'
        AND column_name IN ('bio', 'social_links')
      ORDER BY column_name
    `);
    const constraints = await pool.query<{ conname: string }>(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'app.profiles'::regclass
        AND conname IN (
          'app_profiles_bio_length_chk',
          'app_profiles_social_links_shape_chk'
        )
      ORDER BY conname
    `);

    expect(columns.rows.map((row) => row.column_name)).toEqual(["bio", "social_links"]);
    expect(constraints.rows.map((row) => row.conname)).toEqual([
      "app_profiles_bio_length_chk",
      "app_profiles_social_links_shape_chk"
    ]);
  });
});
