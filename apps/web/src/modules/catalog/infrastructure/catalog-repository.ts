import "server-only";

import {
  createRuntimePool,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  CatalogAvailabilityRecord,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogGameUpsertInput,
  CatalogGenreRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord,
  CatalogRepository,
  CatalogSearchInput,
  CatalogTimeEstimateRecord
} from "../application/ports";

type GameRow = {
  id: string;
  rawg_id: number;
  slug: string;
  name: string;
  description: string | null;
  released_at: Date | string | null;
  background_image_url: string | null;
  rawg_url: string;
  rawg_updated_at: Date | string | null;
  source: "RAWG";
  source_url: string;
  source_updated_at: Date | string | null;
  synced_at: Date | string;
  coop_campaign_confirmed: boolean;
  coop_player_count_min: number | null;
  coop_player_count_max: number | null;
  coop_confirmation_source: string | null;
  coop_confirmation_checked_at: Date | string | null;
  main_flow_eligible: boolean;
};

type PlatformRow = {
  rawg_platform_id: number | null;
  platform_key: CatalogPlatformKey;
  platform_name: string;
};

type GenreRow = {
  rawg_genre_id: number | null;
  slug: string;
  name: string;
};

type TimeEstimateRow = {
  minutes: number | null;
  source: string;
  source_url: string | null;
  checked_at: Date | string;
  confidence: "verified" | "estimated" | "unverified";
};

type AvailabilityRow = {
  availability_type: "free" | "game-pass";
  platform_key: CatalogPlatformKey | null;
  source: string;
  source_url: string | null;
  checked_at: Date | string;
  status: "available" | "unavailable" | "unverified";
};

let runtimePool: QueueDbPool | undefined;

export const catalogRepository: CatalogRepository = createCatalogRepository();

export function createCatalogRepository(pool: QueueDbPool = getRuntimePool()): CatalogRepository {
  return {
    searchGames: (input) => searchGames(pool, input),
    getGameBySlug: (slug) => getGameBySlug(pool, slug),
    upsertGame: (input) => upsertGame(pool, input),
    upsertGames: (inputs) => upsertGames(pool, inputs)
  };
}

async function searchGames(
  pool: QueueDbPool,
  input: CatalogSearchInput = {}
): Promise<CatalogGameDetailRecord[]> {
  const limit = clampLimit(input.limit);
  const query = input.query?.trim() ? input.query.trim() : null;
  const onlyMainFlow = input.onlyMainFlow ?? false;
  const platformKeys = input.platformKeys ?? [];

  const result = await pool.query<GameRow>(
    `
      SELECT
        game.id,
        game.rawg_id,
        game.slug,
        game.name,
        game.description,
        game.released_at,
        game.background_image_url,
        game.rawg_url,
        game.source,
        game.source_url,
        game.source_updated_at,
        game.synced_at,
        game.coop_campaign_confirmed,
        game.coop_player_count_min,
        game.coop_player_count_max,
        game.coop_confirmation_source,
        game.coop_confirmation_checked_at,
        game.main_flow_eligible
      FROM catalog.games AS game
      WHERE ($1::text IS NULL OR game.name ILIKE '%' || $1 || '%' OR game.slug ILIKE '%' || $1 || '%')
        AND ($2::boolean = false OR game.main_flow_eligible = true)
        AND (
          cardinality($3::text[]) = 0
          OR EXISTS (
            SELECT 1
            FROM catalog.game_platforms AS platform
            WHERE platform.game_id = game.id
              AND platform.platform_key = ANY($3::text[])
          )
        )
      ORDER BY game.main_flow_eligible DESC, game.synced_at DESC, game.name ASC
      LIMIT $4
    `,
    [query, onlyMainFlow, platformKeys, limit]
  );

  return Promise.all(result.rows.map((row) => hydrateGame(pool, row)));
}

async function getGameBySlug(
  pool: QueueDbPool,
  slug: string
): Promise<CatalogGameDetailRecord | null> {
  const result = await pool.query<GameRow>(
    `
      SELECT
        game.id,
        game.rawg_id,
        game.slug,
        game.name,
        game.description,
        game.released_at,
        game.background_image_url,
        game.rawg_url,
        game.source,
        game.source_url,
        game.source_updated_at,
        game.synced_at,
        game.coop_campaign_confirmed,
        game.coop_player_count_min,
        game.coop_player_count_max,
        game.coop_confirmation_source,
        game.coop_confirmation_checked_at,
        game.main_flow_eligible
      FROM catalog.games AS game
      WHERE game.slug = $1
      LIMIT 1
    `,
    [slug]
  );

  const row = result.rows[0];
  return row ? hydrateGame(pool, row) : null;
}

async function upsertGames(
  pool: QueueDbPool,
  inputs: CatalogGameUpsertInput[]
): Promise<string[]> {
  const ids: string[] = [];

  for (const input of inputs) {
    ids.push(await upsertGame(pool, input));
  }

  return ids;
}

async function upsertGame(pool: QueueDbPool, input: CatalogGameUpsertInput): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const gameId = await upsertCatalogGame(client, input);
    await replacePlatforms(client, gameId, input.platforms);
    await replaceGenres(client, gameId, input.genres);
    await replaceTimeEstimate(client, gameId, input.timeEstimate ?? null);
    await replaceAvailability(client, gameId, input.availability ?? []);
    await client.query("COMMIT");
    return gameId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function hydrateGame(
  pool: QueueDbPool,
  row: GameRow
): Promise<CatalogGameDetailRecord> {
  const [platforms, genres, timeEstimate, availability] = await Promise.all([
    loadPlatforms(pool, row.id),
    loadGenres(pool, row.id),
    loadTimeEstimate(pool, row.id),
    loadAvailability(pool, row.id)
  ]);

  return {
    ...mapGame(row),
    platforms,
    genres,
    timeEstimate,
    availability
  };
}

async function loadPlatforms(pool: QueueDbPool, gameId: string): Promise<CatalogPlatformRecord[]> {
  const result = await pool.query<PlatformRow>(
    `
      SELECT rawg_platform_id, platform_key, platform_name
      FROM catalog.game_platforms
      WHERE game_id = $1
      ORDER BY platform_name ASC
    `,
    [gameId]
  );

  return result.rows.map((row) => ({
    key: row.platform_key,
    name: row.platform_name,
    rawgPlatformId: row.rawg_platform_id
  }));
}

async function loadGenres(pool: QueueDbPool, gameId: string): Promise<CatalogGenreRecord[]> {
  const result = await pool.query<GenreRow>(
    `
      SELECT rawg_genre_id, slug, name
      FROM catalog.game_genres
      WHERE game_id = $1
      ORDER BY name ASC
    `,
    [gameId]
  );

  return result.rows.map((row) => ({
    rawgGenreId: row.rawg_genre_id,
    slug: row.slug,
    name: row.name
  }));
}

async function loadTimeEstimate(
  pool: QueueDbPool,
  gameId: string
): Promise<CatalogTimeEstimateRecord | null> {
  const result = await pool.query<TimeEstimateRow>(
    `
      SELECT minutes, source, source_url, checked_at, confidence
      FROM catalog.game_time_estimates
      WHERE game_id = $1
      ORDER BY checked_at DESC
      LIMIT 1
    `,
    [gameId]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    minutes: row.minutes,
    source: row.source,
    sourceUrl: row.source_url,
    checkedAt: coerceDate(row.checked_at),
    confidence: row.confidence
  };
}

async function loadAvailability(
  pool: QueueDbPool,
  gameId: string
): Promise<CatalogAvailabilityRecord[]> {
  const result = await pool.query<AvailabilityRow>(
    `
      SELECT availability_type, platform_key, source, source_url, checked_at, status
      FROM catalog.game_availability
      WHERE game_id = $1
      ORDER BY checked_at DESC, availability_type ASC
    `,
    [gameId]
  );

  return result.rows.map((row) => ({
    type: row.availability_type,
    platformKey: row.platform_key,
    source: row.source,
    sourceUrl: row.source_url,
    checkedAt: coerceDate(row.checked_at),
    status: row.status
  }));
}

async function upsertCatalogGame(
  client: QueueDbClient,
  input: CatalogGameUpsertInput
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO catalog.games (
        rawg_id,
        slug,
        name,
        description,
        released_at,
        background_image_url,
        rawg_url,
        rawg_updated_at,
        source,
        source_url,
        source_updated_at,
        synced_at,
        coop_campaign_confirmed,
        coop_player_count_min,
        coop_player_count_max,
        coop_confirmation_source,
        coop_confirmation_checked_at,
        main_flow_eligible,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, now()
      )
      ON CONFLICT (rawg_id) DO UPDATE
      SET slug = excluded.slug,
          name = excluded.name,
          description = excluded.description,
          released_at = excluded.released_at,
          background_image_url = excluded.background_image_url,
          rawg_url = excluded.rawg_url,
          rawg_updated_at = excluded.rawg_updated_at,
          source = excluded.source,
          source_url = excluded.source_url,
          source_updated_at = excluded.source_updated_at,
          synced_at = excluded.synced_at,
          coop_campaign_confirmed = excluded.coop_campaign_confirmed,
          coop_player_count_min = excluded.coop_player_count_min,
          coop_player_count_max = excluded.coop_player_count_max,
          coop_confirmation_source = excluded.coop_confirmation_source,
          coop_confirmation_checked_at = excluded.coop_confirmation_checked_at,
          main_flow_eligible = excluded.main_flow_eligible,
          updated_at = now()
      RETURNING id
    `,
    [
      input.rawgId,
      input.slug,
      input.name,
      input.description,
      input.releasedAt,
      input.backgroundImageUrl,
      input.rawgUrl,
      input.rawgUpdatedAt,
      input.source,
      input.sourceUrl,
      input.sourceUpdatedAt,
      input.syncedAt,
      input.coopCampaignConfirmed,
      input.coopPlayerCountMin,
      input.coopPlayerCountMax,
      input.coopConfirmationSource,
      input.coopConfirmationCheckedAt,
      input.mainFlowEligible
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("catalog_game_upsert_failed");
  }

  return row.id;
}

async function replacePlatforms(
  client: QueueDbClient,
  gameId: string,
  platforms: CatalogPlatformRecord[]
): Promise<void> {
  await client.query("DELETE FROM catalog.game_platforms WHERE game_id = $1", [gameId]);

  for (const platform of dedupeBy(platforms, (entry) => entry.key)) {
    await client.query(
      `
        INSERT INTO catalog.game_platforms (
          game_id,
          rawg_platform_id,
          platform_key,
          platform_name
        )
        VALUES ($1, $2, $3, $4)
      `,
      [gameId, platform.rawgPlatformId, platform.key, platform.name]
    );
  }
}

async function replaceGenres(
  client: QueueDbClient,
  gameId: string,
  genres: CatalogGenreRecord[]
): Promise<void> {
  await client.query("DELETE FROM catalog.game_genres WHERE game_id = $1", [gameId]);

  for (const genre of dedupeBy(genres, (entry) => entry.slug)) {
    await client.query(
      `
        INSERT INTO catalog.game_genres (game_id, rawg_genre_id, slug, name)
        VALUES ($1, $2, $3, $4)
      `,
      [gameId, genre.rawgGenreId, genre.slug, genre.name]
    );
  }
}

async function replaceTimeEstimate(
  client: QueueDbClient,
  gameId: string,
  estimate: CatalogTimeEstimateRecord | null
): Promise<void> {
  await client.query("DELETE FROM catalog.game_time_estimates WHERE game_id = $1", [gameId]);

  if (!estimate) {
    return;
  }

  await client.query(
    `
      INSERT INTO catalog.game_time_estimates (
        game_id,
        minutes,
        source,
        source_url,
        checked_at,
        confidence,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, now())
    `,
    [
      gameId,
      estimate.minutes,
      estimate.source,
      estimate.sourceUrl,
      estimate.checkedAt,
      estimate.confidence
    ]
  );
}

async function replaceAvailability(
  client: QueueDbClient,
  gameId: string,
  availability: CatalogAvailabilityRecord[]
): Promise<void> {
  await client.query("DELETE FROM catalog.game_availability WHERE game_id = $1", [
    gameId
  ]);

  for (const item of availability) {
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
      `,
      [
        gameId,
        item.type,
        item.platformKey,
        item.source,
        item.sourceUrl,
        item.checkedAt,
        item.status
      ]
    );
  }
}

function mapGame(row: GameRow): CatalogGameRecord {
  return {
    id: row.id,
    rawgId: row.rawg_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    releasedAt: coerceNullableDate(row.released_at),
    backgroundImageUrl: row.background_image_url,
    rawgUrl: row.rawg_url,
    rawgUpdatedAt: coerceNullableDate(row.rawg_updated_at),
    source: row.source,
    sourceUrl: row.source_url,
    sourceUpdatedAt: coerceNullableDate(row.source_updated_at),
    syncedAt: coerceDate(row.synced_at),
    coopCampaignConfirmed: row.coop_campaign_confirmed,
    coopPlayerCountMin: row.coop_player_count_min,
    coopPlayerCountMax: row.coop_player_count_max,
    coopConfirmationSource: row.coop_confirmation_source,
    coopConfirmationCheckedAt: coerceNullableDate(row.coop_confirmation_checked_at),
    mainFlowEligible: row.main_flow_eligible
  };
}

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) {
    return 24;
  }

  return Math.min(60, Math.max(1, Math.floor(limit)));
}

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function coerceNullableDate(value: Date | string | null): Date | null {
  return value ? coerceDate(value) : null;
}

function dedupeBy<T>(values: T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}
