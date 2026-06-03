import type pg from "pg";

import {
  applyFoundationMigration,
  createIntegrationPool,
  getTestDatabaseUrl,
  missingTestDatabaseMessage
} from "../src/testing/migrate-empty";

const testDatabaseUrl = getTestDatabaseUrl();

if (!testDatabaseUrl) {
  console.warn(missingTestDatabaseMessage);
}

describe.skipIf(!testDatabaseUrl)("catalog localization workflow schema", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = createIntegrationPool(testDatabaseUrl!);
    await applyFoundationMigration(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createCatalogGame(): Promise<string> {
    const result = await pool.query<{ id: string }>(`
      INSERT INTO catalog.games (
        rawg_id,
        slug,
        name,
        rawg_url,
        source_url,
        source_updated_at
      )
      VALUES (
        floor(random() * 1000000)::integer,
        'localization-test-' || gen_random_uuid(),
        'Localization Test',
        'https://rawg.io/games/localization-test',
        'https://rawg.io/games/localization-test',
        now()
      )
      RETURNING id
    `);

    return result.rows[0]!.id;
  }

  test("rejects invalid statuses and incomplete published descriptions", async () => {
    const gameId = await createCatalogGame();

    await expect(
      pool.query(
        `
          INSERT INTO catalog.game_localizations (
            game_id,
            locale,
            version,
            status,
            source,
            author_kind
          )
          VALUES ($1, 'pt-BR', 1, 'approved', 'queue2-curation', 'seed')
        `,
        [gameId]
      )
    ).rejects.toThrow();

    await expect(
      pool.query(
        `
          INSERT INTO catalog.game_localizations (
            game_id,
            locale,
            version,
            status,
            description,
            source,
            author_kind,
            reviewer_kind,
            reviewer_id,
            reviewed_at,
            published_at,
            quality_check
          )
          VALUES (
            $1,
            'pt-BR',
            1,
            'published',
            '',
            'queue2-curation',
            'seed',
            'operator',
            'reviewer-1',
            now(),
            now(),
            '{"coop_facts_checked":true}'::jsonb
          )
        `,
        [gameId]
      )
    ).rejects.toThrow();
  });

  test("supports newest published pt-BR lookup while preserving version history", async () => {
    const gameId = await createCatalogGame();

    await pool.query(
      `
        INSERT INTO catalog.game_localizations (
          game_id,
          locale,
          version,
          status,
          description,
          source,
          author_kind,
          reviewer_kind,
          reviewer_id,
          reviewed_at,
          published_at,
          quality_check
        )
        VALUES
          (
            $1,
            'pt-BR',
            1,
            'published',
            'Descricao antiga revisada.',
            'queue2-curation',
            'seed',
            'operator',
            'reviewer-1',
            now() - interval '2 days',
            now() - interval '2 days',
            '{
              "coop_facts_checked": true,
              "spoilers_avoided": true,
              "facts_not_invented": true,
              "natural_pt_br": true,
              "queue2_tone_controlled": true
            }'::jsonb
          ),
          (
            $1,
            'pt-BR',
            2,
            'published',
            'Descricao nova revisada.',
            'queue2-curation',
            'seed',
            'operator',
            'reviewer-1',
            now(),
            now(),
            '{
              "coop_facts_checked": true,
              "spoilers_avoided": true,
              "facts_not_invented": true,
              "natural_pt_br": true,
              "queue2_tone_controlled": true
            }'::jsonb
          ),
          (
            $1,
            'pt-BR',
            3,
            'draft',
            'Rascunho invisivel.',
            'provider-draft',
            'worker',
            null,
            null,
            null,
            null,
            '{}'::jsonb
          )
      `,
      [gameId]
    );

    const result = await pool.query<{ description: string; version: number }>(
      `
        SELECT description, version
        FROM catalog.game_localizations
        WHERE game_id = $1
          AND locale = 'pt-BR'
          AND status = 'published'
        ORDER BY published_at DESC NULLS LAST, version DESC
        LIMIT 1
      `,
      [gameId]
    );

    expect(result.rows[0]).toEqual({
      description: "Descricao nova revisada.",
      version: 2
    });
  });
});
