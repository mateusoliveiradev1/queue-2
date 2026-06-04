import "server-only";

import type { QueueDbPool } from "@queue/db";

import {
  curatedCatalogAvailabilitySeeds,
  type CuratedCatalogAvailabilitySeed
} from "./availability-seeds.ts";
import {
  publishedCatalogLocalizationSeeds,
  type PublishedCatalogLocalizationSeed
} from "./localization-seeds.ts";

export type CatalogCurationHealth = {
  ok: boolean;
  localizations: {
    inputCount: number;
    publishedCount: number;
    missingSlugs: string[];
  };
  availability: {
    inputCount: number;
    availableCount: number;
    missingSlugs: string[];
  };
};

export async function checkCatalogCurationHealth({
  pool,
  localizationSeeds = publishedCatalogLocalizationSeeds,
  availabilitySeeds = curatedCatalogAvailabilitySeeds
}: {
  pool: QueueDbPool;
  localizationSeeds?: PublishedCatalogLocalizationSeed[];
  availabilitySeeds?: CuratedCatalogAvailabilitySeed[];
}): Promise<CatalogCurationHealth> {
  const localizationSlugs = unique(localizationSeeds.map((seed) => seed.slug));
  const availabilitySlugs = unique(availabilitySeeds.map((seed) => seed.slug));
  const publishedLocalizationSlugs = await loadPublishedLocalizationSlugs(
    pool,
    localizationSlugs
  );
  const availableSlugs = await loadAvailableSeedSlugs(pool, availabilitySeeds);

  const result: CatalogCurationHealth = {
    ok: false,
    localizations: {
      inputCount: localizationSlugs.length,
      publishedCount: publishedLocalizationSlugs.size,
      missingSlugs: localizationSlugs.filter((slug) => !publishedLocalizationSlugs.has(slug))
    },
    availability: {
      inputCount: availabilitySlugs.length,
      availableCount: availableSlugs.size,
      missingSlugs: availabilitySlugs.filter((slug) => !availableSlugs.has(slug))
    }
  };

  result.ok =
    result.localizations.missingSlugs.length === 0 &&
    result.availability.missingSlugs.length === 0;

  return result;
}

async function loadPublishedLocalizationSlugs(
  pool: QueueDbPool,
  slugs: string[]
): Promise<Set<string>> {
  if (slugs.length === 0) {
    return new Set();
  }

  const result = await pool.query<{ slug: string }>(
    `
      SELECT seed.slug
      FROM unnest($1::text[]) AS seed(slug)
      JOIN catalog.games AS game ON game.slug = seed.slug
      JOIN catalog.game_localizations AS localization
        ON localization.game_id = game.id
       AND localization.locale = 'pt-BR'
       AND localization.status = 'published'
       AND localization.description IS NOT NULL
       AND localization.published_at IS NOT NULL
    `,
    [slugs]
  );

  return new Set(result.rows.map((row) => row.slug));
}

async function loadAvailableSeedSlugs(
  pool: QueueDbPool,
  seeds: CuratedCatalogAvailabilitySeed[]
): Promise<Set<string>> {
  const availableSlugs = new Set<string>();

  for (const seed of seeds) {
    const result = await pool.query<{ found: number }>(
      `
        SELECT 1 AS found
        FROM catalog.games AS game
        JOIN catalog.game_availability AS availability
          ON availability.game_id = game.id
        WHERE game.slug = $1
          AND availability.availability_type = $2
          AND availability.platform_key IS NOT DISTINCT FROM $3
          AND availability.status = 'available'
          AND availability.source IS NOT NULL
          AND availability.source_url IS NOT NULL
        LIMIT 1
      `,
      [seed.slug, seed.type, seed.platformKey]
    );

    if (result.rows.length > 0) {
      availableSlugs.add(seed.slug);
    }
  }

  return availableSlugs;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
