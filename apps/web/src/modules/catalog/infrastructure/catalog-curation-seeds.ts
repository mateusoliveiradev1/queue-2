import "server-only";

import type { QueueDbClient, QueueDbPool } from "@queue/db";

import {
  curatedCatalogAvailabilitySeeds,
  type CuratedCatalogAvailabilitySeed
} from "./availability-seeds.ts";
import {
  publishedCatalogLocalizationSeeds,
  type PublishedCatalogLocalizationSeed
} from "./localization-seeds.ts";

export type CatalogCurationSeedResult = {
  localizations: {
    inputCount: number;
    appliedCount: number;
    missingSlugs: string[];
  };
  availability: {
    inputCount: number;
    appliedCount: number;
    missingSlugs: string[];
  };
};

export async function applyCatalogCurationSeeds({
  pool,
  localizationSeeds = publishedCatalogLocalizationSeeds,
  availabilitySeeds = curatedCatalogAvailabilitySeeds
}: {
  pool: QueueDbPool;
  localizationSeeds?: PublishedCatalogLocalizationSeed[];
  availabilitySeeds?: CuratedCatalogAvailabilitySeed[];
}): Promise<CatalogCurationSeedResult> {
  const client = await pool.connect();
  const result: CatalogCurationSeedResult = {
    localizations: {
      inputCount: localizationSeeds.length,
      appliedCount: 0,
      missingSlugs: []
    },
    availability: {
      inputCount: availabilitySeeds.length,
      appliedCount: 0,
      missingSlugs: []
    }
  };

  try {
    await client.query("BEGIN");

    for (const seed of localizationSeeds) {
      const applied = await upsertPublishedLocalizationSeed(client, seed);

      if (applied) {
        result.localizations.appliedCount += 1;
      } else {
        result.localizations.missingSlugs.push(seed.slug);
      }
    }

    for (const seed of availabilitySeeds) {
      const applied = await upsertAvailabilitySeed(client, seed);

      if (applied) {
        result.availability.appliedCount += 1;
      } else {
        result.availability.missingSlugs.push(seed.slug);
      }
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertPublishedLocalizationSeed(
  client: QueueDbClient,
  seed: PublishedCatalogLocalizationSeed
): Promise<boolean> {
  const gameId = await findGameIdBySlug(client, seed.slug);

  if (!gameId) {
    return false;
  }

  await client.query(
    `
      INSERT INTO catalog.game_localizations (
        game_id,
        locale,
        version,
        status,
        title,
        description,
        source,
        source_url,
        raw_source_hash,
        provenance,
        author_kind,
        author_id,
        reviewer_kind,
        reviewer_id,
        review_notes,
        quality_check,
        reviewed_at,
        published_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, NULL, $5, $6, $7, $8, $9::jsonb,
        $10, $11, $12, $13, $14, $15::jsonb, $16, $17, now()
      )
      ON CONFLICT (game_id, locale, version) DO UPDATE
      SET status = excluded.status,
          title = excluded.title,
          description = excluded.description,
          source = excluded.source,
          source_url = excluded.source_url,
          raw_source_hash = excluded.raw_source_hash,
          provenance = excluded.provenance,
          author_kind = excluded.author_kind,
          author_id = excluded.author_id,
          reviewer_kind = excluded.reviewer_kind,
          reviewer_id = excluded.reviewer_id,
          review_notes = excluded.review_notes,
          quality_check = excluded.quality_check,
          reviewed_at = excluded.reviewed_at,
          published_at = excluded.published_at,
          updated_at = now()
    `,
    [
      gameId,
      seed.locale,
      seed.version,
      seed.status,
      seed.description,
      seed.source,
      seed.sourceUrl,
      seed.rawSourceHash,
      JSON.stringify(seed.provenance),
      seed.authorKind,
      seed.authorId,
      seed.reviewerKind,
      seed.reviewerId,
      seed.reviewNotes,
      JSON.stringify(seed.qualityCheck),
      seed.reviewedAt,
      seed.publishedAt
    ]
  );

  return true;
}

async function upsertAvailabilitySeed(
  client: QueueDbClient,
  seed: CuratedCatalogAvailabilitySeed
): Promise<boolean> {
  const gameId = await findGameIdBySlug(client, seed.slug);

  if (!gameId) {
    return false;
  }

  await client.query(
    `
      INSERT INTO catalog.game_availability (
        game_id,
        availability_type,
        platform_key,
        source,
        source_url,
        checked_at,
        status,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (game_id, availability_type, platform_key) DO UPDATE
      SET source = excluded.source,
          source_url = excluded.source_url,
          checked_at = excluded.checked_at,
          status = excluded.status,
          updated_at = now()
    `,
    [
      gameId,
      seed.type,
      seed.platformKey,
      seed.source,
      seed.sourceUrl,
      seed.checkedAt,
      seed.status
    ]
  );

  return true;
}

async function findGameIdBySlug(
  client: QueueDbClient,
  slug: string
): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    "SELECT id FROM catalog.games WHERE slug = $1 LIMIT 1",
    [slug]
  );

  return result.rows[0]?.id ?? null;
}
