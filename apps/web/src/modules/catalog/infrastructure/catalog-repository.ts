import "server-only";

import {
  createRuntimePool,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  CatalogAvailabilityRecord,
  CatalogCurationPatch,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogGameUpsertInput,
  CatalogGenreRecord,
  CatalogLocalizationRecord,
  CatalogPlatformKey,
  CatalogPlatformRecord,
  CatalogRepository,
  CatalogSearchInput,
  CatalogTimeEstimateRecord
} from "../application/ports.ts";

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
  game_id?: string;
  rawg_platform_id: number | null;
  platform_key: CatalogPlatformKey;
  platform_name: string;
};

type GenreRow = {
  game_id?: string;
  rawg_genre_id: number | null;
  slug: string;
  name: string;
};

type TimeEstimateRow = {
  game_id?: string;
  minutes: number | null;
  source: string;
  source_url: string | null;
  checked_at: Date | string;
  confidence: "verified" | "estimated" | "unverified";
};

type AvailabilityRow = {
  game_id?: string;
  availability_type: "free" | "game-pass";
  platform_key: CatalogPlatformKey | null;
  source: string;
  source_url: string | null;
  checked_at: Date | string;
  status: "available" | "unavailable" | "unverified";
};

type LocalizationRow = {
  game_id?: string;
  locale: "pt-BR";
  version: number;
  description: string;
  source: string;
  source_url: string | null;
  published_at: Date | string;
  reviewed_at: Date | string;
};

type RowWithGameId = {
  game_id: string;
};

let runtimePool: QueueDbPool | undefined;

export const catalogRepository: CatalogRepository = {
  searchGames: (input) => searchGames(getRuntimePool(), input),
  getGameBySlug: (slug) => getGameBySlug(getRuntimePool(), slug),
  upsertGame: (input) => upsertGame(getRuntimePool(), input),
  upsertGames: (inputs) => upsertGames(getRuntimePool(), inputs),
  syncRawgGame: (input, curation) => syncRawgGame(getRuntimePool(), input, curation)
};

export function createCatalogRepository(pool: QueueDbPool): CatalogRepository {
  return {
    searchGames: (input) => searchGames(pool, input),
    getGameBySlug: (slug) => getGameBySlug(pool, slug),
    upsertGame: (input) => upsertGame(pool, input),
    upsertGames: (inputs) => upsertGames(pool, inputs),
    syncRawgGame: (input, curation) => syncRawgGame(pool, input, curation)
  };
}

async function searchGames(
  pool: QueueDbPool,
  input: CatalogSearchInput = {}
): Promise<CatalogGameDetailRecord[]> {
  const limit = clampLimit(input.limit);
  const ids = [...new Set(input.ids ?? [])].filter(Boolean);
  const query = input.query?.trim() ? input.query.trim() : null;
  const onlyMainFlow = input.onlyMainFlow ?? false;
  const platformKeys = input.platformKeys ?? [];
  const offset = clampOffset(input.offset);

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
        game.rawg_updated_at,
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
      WHERE (cardinality($1::uuid[]) = 0 OR game.id = ANY($1::uuid[]))
        AND ($2::text IS NULL OR game.name ILIKE '%' || $2 || '%' OR game.slug ILIKE '%' || $2 || '%')
        AND ($3::boolean = false OR game.main_flow_eligible = true)
        AND (
          cardinality($4::text[]) = 0
          OR EXISTS (
            SELECT 1
            FROM catalog.game_platforms AS platform
            WHERE platform.game_id = game.id
              AND platform.platform_key = ANY($4::text[])
          )
        )
      ORDER BY
        CASE WHEN game.id = ANY($1::uuid[]) THEN 0 ELSE 1 END,
        game.main_flow_eligible DESC,
        game.synced_at DESC,
        game.name ASC
      LIMIT $5
      OFFSET $6
    `,
    [ids, query, onlyMainFlow, platformKeys, limit, offset]
  );

  return hydrateGames(pool, result.rows);
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
        game.rawg_updated_at,
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

async function syncRawgGame(
  pool: QueueDbPool,
  input: CatalogGameUpsertInput,
  curation: CatalogCurationPatch = {}
): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await adoptExistingCuratedSlug(client, input);
    const gameId = await upsertCatalogRawgFacts(client, input, curation);
    await replacePlatforms(client, gameId, input.platforms);
    await replaceGenres(client, gameId, input.genres);
    if (input.timeEstimate) {
      await replaceTimeEstimate(client, gameId, input.timeEstimate);
    }
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
  const [game] = await hydrateGames(pool, [row]);

  if (!game) {
    throw new Error("catalog_game_hydration_failed");
  }

  return game;
}

async function hydrateGames(
  pool: QueueDbPool,
  rows: GameRow[]
): Promise<CatalogGameDetailRecord[]> {
  const gameIds = rows.map((row) => row.id);

  if (gameIds.length === 0) {
    return [];
  }

  const [platforms, genres, localizations, timeEstimates, availability] = await Promise.all([
    loadPlatformsByGameIds(pool, gameIds),
    loadGenresByGameIds(pool, gameIds),
    loadPublishedLocalizationsByGameIds(pool, gameIds),
    loadTimeEstimatesByGameIds(pool, gameIds),
    loadAvailabilityByGameIds(pool, gameIds)
  ]);

  return rows.map((row) => ({
    ...mapGame(row),
    platforms: platforms.get(row.id) ?? [],
    genres: genres.get(row.id) ?? [],
    localization: localizations.get(row.id) ?? null,
    timeEstimate: timeEstimates.get(row.id) ?? null,
    availability: availability.get(row.id) ?? []
  }));
}

async function loadPlatformsByGameIds(
  pool: QueueDbPool,
  gameIds: string[]
): Promise<Map<string, CatalogPlatformRecord[]>> {
  const result = await pool.query<Required<PlatformRow>>(
    `
      SELECT game_id, rawg_platform_id, platform_key, platform_name
      FROM catalog.game_platforms
      WHERE game_id = ANY($1::uuid[])
      ORDER BY game_id ASC, platform_name ASC
    `,
    [gameIds]
  );

  return groupByGameId(result.rows, (row) => ({
    key: row.platform_key,
    name: row.platform_name,
    rawgPlatformId: row.rawg_platform_id
  }));
}

async function loadGenresByGameIds(
  pool: QueueDbPool,
  gameIds: string[]
): Promise<Map<string, CatalogGenreRecord[]>> {
  const result = await pool.query<Required<GenreRow>>(
    `
      SELECT game_id, rawg_genre_id, slug, name
      FROM catalog.game_genres
      WHERE game_id = ANY($1::uuid[])
      ORDER BY game_id ASC, name ASC
    `,
    [gameIds]
  );

  return groupByGameId(result.rows, (row) => ({
    rawgGenreId: row.rawg_genre_id,
    slug: row.slug,
    name: row.name
  }));
}

async function loadTimeEstimatesByGameIds(
  pool: QueueDbPool,
  gameIds: string[]
): Promise<Map<string, CatalogTimeEstimateRecord>> {
  const result = await pool.query<Required<TimeEstimateRow>>(
    `
      SELECT DISTINCT ON (game_id)
        game_id,
        minutes,
        source,
        source_url,
        checked_at,
        confidence
      FROM catalog.game_time_estimates
      WHERE game_id = ANY($1::uuid[])
      ORDER BY game_id ASC, checked_at DESC
    `,
    [gameIds]
  );
  return mapByGameId(result.rows, (row) => ({
    minutes: row.minutes,
    source: row.source,
    sourceUrl: row.source_url,
    checkedAt: coerceDate(row.checked_at),
    confidence: row.confidence
  }));
}

async function loadAvailabilityByGameIds(
  pool: QueueDbPool,
  gameIds: string[]
): Promise<Map<string, CatalogAvailabilityRecord[]>> {
  const result = await pool.query<Required<AvailabilityRow>>(
    `
      SELECT game_id, availability_type, platform_key, source, source_url, checked_at, status
      FROM catalog.game_availability
      WHERE game_id = ANY($1::uuid[])
      ORDER BY game_id ASC, checked_at DESC, availability_type ASC
    `,
    [gameIds]
  );

  return groupByGameId(result.rows, (row) => ({
    type: row.availability_type,
    platformKey: row.platform_key,
    source: row.source,
    sourceUrl: row.source_url,
    checkedAt: coerceDate(row.checked_at),
    status: row.status
  }));
}

async function loadPublishedLocalizationsByGameIds(
  pool: QueueDbPool,
  gameIds: string[]
): Promise<Map<string, CatalogLocalizationRecord>> {
  const result = await pool.query<Required<LocalizationRow>>(
    `
      SELECT DISTINCT ON (game_id)
        game_id,
        locale,
        version,
        description,
        source,
        source_url,
        published_at,
        reviewed_at
      FROM catalog.game_localizations
      WHERE game_id = ANY($1::uuid[])
        AND locale = 'pt-BR'
        AND status = 'published'
        AND description IS NOT NULL
        AND published_at IS NOT NULL
        AND reviewed_at IS NOT NULL
      ORDER BY game_id ASC, published_at DESC NULLS LAST, version DESC
    `,
    [gameIds]
  );
  return mapByGameId(result.rows, (row) => ({
    locale: row.locale,
    version: row.version,
    description: row.description,
    source: row.source,
    sourceUrl: row.source_url,
    publishedAt: coerceDate(row.published_at),
    reviewedAt: coerceDate(row.reviewed_at)
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

async function adoptExistingCuratedSlug(
  client: QueueDbClient,
  input: CatalogGameUpsertInput
): Promise<void> {
  await client.query(
    `
      UPDATE catalog.games AS game
      SET rawg_id = $1,
          updated_at = now()
      WHERE game.slug = $2
        AND game.rawg_id <> $1
        AND NOT EXISTS (
          SELECT 1
          FROM catalog.games AS rawg_match
          WHERE rawg_match.rawg_id = $1
        )
    `,
    [input.rawgId, input.slug]
  );
}

async function upsertCatalogRawgFacts(
  client: QueueDbClient,
  input: CatalogGameUpsertInput,
  curation: CatalogCurationPatch
): Promise<string> {
  const hasCoopCampaignConfirmed = hasPatch(curation, "coopCampaignConfirmed");
  const hasCoopPlayerCountMin = hasPatch(curation, "coopPlayerCountMin");
  const hasCoopPlayerCountMax = hasPatch(curation, "coopPlayerCountMax");
  const hasCoopConfirmationSource = hasPatch(curation, "coopConfirmationSource");
  const hasCoopConfirmationCheckedAt = hasPatch(curation, "coopConfirmationCheckedAt");
  const hasMainFlowEligible = hasPatch(curation, "mainFlowEligible");
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
        $11, $12, $13, $15, $17, $19, $21, $23, now()
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
          coop_campaign_confirmed = CASE WHEN $14::boolean THEN $13::boolean ELSE catalog.games.coop_campaign_confirmed END,
          coop_player_count_min = CASE WHEN $16::boolean THEN $15::smallint ELSE catalog.games.coop_player_count_min END,
          coop_player_count_max = CASE WHEN $18::boolean THEN $17::smallint ELSE catalog.games.coop_player_count_max END,
          coop_confirmation_source = CASE WHEN $20::boolean THEN $19::text ELSE catalog.games.coop_confirmation_source END,
          coop_confirmation_checked_at = CASE WHEN $22::boolean THEN $21::timestamptz ELSE catalog.games.coop_confirmation_checked_at END,
          main_flow_eligible = CASE WHEN $24::boolean THEN $23::boolean ELSE catalog.games.main_flow_eligible END,
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
      hasCoopCampaignConfirmed ? curation.coopCampaignConfirmed : input.coopCampaignConfirmed,
      hasCoopCampaignConfirmed,
      hasCoopPlayerCountMin ? curation.coopPlayerCountMin : input.coopPlayerCountMin,
      hasCoopPlayerCountMin,
      hasCoopPlayerCountMax ? curation.coopPlayerCountMax : input.coopPlayerCountMax,
      hasCoopPlayerCountMax,
      hasCoopConfirmationSource
        ? curation.coopConfirmationSource
        : input.coopConfirmationSource,
      hasCoopConfirmationSource,
      hasCoopConfirmationCheckedAt
        ? curation.coopConfirmationCheckedAt
        : input.coopConfirmationCheckedAt,
      hasCoopConfirmationCheckedAt,
      hasMainFlowEligible ? curation.mainFlowEligible : input.mainFlowEligible,
      hasMainFlowEligible
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("catalog_game_rawg_sync_failed");
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

function clampOffset(offset: number | undefined): number {
  if (!offset || Number.isNaN(offset)) {
    return 0;
  }

  return Math.max(0, Math.floor(offset));
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

function groupByGameId<T extends RowWithGameId, U>(
  rows: T[],
  mapRow: (row: T) => U
): Map<string, U[]> {
  const byGameId = new Map<string, U[]>();

  for (const row of rows) {
    const values = byGameId.get(row.game_id) ?? [];
    values.push(mapRow(row));
    byGameId.set(row.game_id, values);
  }

  return byGameId;
}

function mapByGameId<T extends RowWithGameId, U>(
  rows: T[],
  mapRow: (row: T) => U
): Map<string, U> {
  const byGameId = new Map<string, U>();

  for (const row of rows) {
    byGameId.set(row.game_id, mapRow(row));
  }

  return byGameId;
}

function hasPatch<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}
