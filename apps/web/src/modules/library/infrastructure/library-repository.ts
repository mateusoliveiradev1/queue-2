import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import {
  PHASE_2_ACTIVE_STATUSES,
  type LibraryStatus,
  type Phase2LibraryStatus
} from "../domain/library-policy";
import { calculateMatchScore } from "../domain/match-score";
import {
  getCommonPlatforms,
  isPlatformKey,
  type PlatformKey
} from "../domain/platforms";
import type {
  AddGameToWishlistResult,
  LibraryCatalogGameFacts,
  LibraryGameDetailRecord,
  LibraryGameRecord,
  LibraryMemberPlatformRecord,
  LibraryOverviewRecord,
  LibraryRepository,
  MoveLibraryGameResult,
  UpdateMemberPlatformsResult
} from "../application/ports";

type MembershipRow = {
  duo_id: string;
};

type MemberRow = {
  user_id: string;
  platform: string | null;
};

type LibraryGameRow = {
  id: string;
  duo_id: string;
  catalog_game_id: string;
  status: LibraryStatus;
  added_by_user_id: string;
  status_updated_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

type CatalogGameRow = {
  id: string;
  slug: string;
  name: string;
  background_image_url: string | null;
  main_flow_eligible: boolean;
  coop_campaign_confirmed: boolean;
  has_reliable_time_estimate: boolean;
  has_verified_availability: boolean;
};

let runtimePool: QueueDbPool | undefined;

export const libraryRepository: LibraryRepository = createLibraryRepository();

export function createLibraryRepository(pool: QueueDbPool = getRuntimePool()): LibraryRepository {
  return {
    getOverview: (userId) => getOverview(pool, userId),
    updateMemberPlatforms: (input) => updateMemberPlatforms(pool, input),
    addGameToWishlist: (input) => addGameToWishlist(pool, input),
    getJogandoCount: (userId) => getJogandoCount(pool, userId),
    getLibraryGame: (input) => getLibraryGame(pool, input),
    moveLibraryGame: (input) => moveLibraryGame(pool, input),
    getGameDetail: (input) => getGameDetail(pool, input)
  };
}

async function getOverview(
  pool: QueueDbPool,
  userId: string
): Promise<LibraryOverviewRecord | null> {
  return asUser(pool, userId, async (client) => {
    const membership = await getMembership(client, userId);

    if (!membership) {
      return null;
    }

    const [memberPlatforms, libraryGames] = await Promise.all([
      getMemberPlatforms(client, membership.duoId),
      getLibraryGames(client, membership.duoId)
    ]);
    const details = await Promise.all(
      libraryGames.map((game) =>
        hydrateLibraryGame(client, game, memberPlatforms)
      )
    );
    const groups = createEmptyGroups();

    for (const detail of details) {
      if (PHASE_2_ACTIVE_STATUSES.includes(detail.libraryGame.status as Phase2LibraryStatus)) {
        groups[detail.libraryGame.status as Phase2LibraryStatus].push(detail);
      }
    }

    return {
      memberPlatforms,
      commonPlatforms: calculateCommonMemberPlatforms(memberPlatforms),
      groups,
      lockedStatuses: ["zerado", "dropado"]
    };
  });
}

async function updateMemberPlatforms(
  pool: QueueDbPool,
  input: {
    userId: string;
    platforms: PlatformKey[];
  }
): Promise<UpdateMemberPlatformsResult> {
  return asUser(pool, input.userId, async (client) => {
    const membership = await getMembership(client, input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    await client.query(
      `
        UPDATE app.member_platforms
        SET enabled = false,
            updated_at = now()
        WHERE user_id = $1
      `,
      [input.userId]
    );

    for (const platform of input.platforms) {
      await client.query(
        `
          INSERT INTO app.member_platforms (
            duo_id,
            user_id,
            platform,
            enabled,
            updated_at
          )
          VALUES ($1, $2, $3, true, now())
          ON CONFLICT (user_id, platform) DO UPDATE
          SET enabled = true,
              updated_at = now()
        `,
        [membership.duoId, input.userId, platform]
      );
    }

    return { ok: true, platforms: input.platforms };
  });
}

async function addGameToWishlist(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
  }
): Promise<AddGameToWishlistResult> {
  return asUser(pool, input.userId, async (client) => {
    const membership = await getMembership(client, input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    if (!(await catalogGameExists(client, input.catalogGameId))) {
      return { ok: false, reason: "catalog-game-not-found" };
    }

    const result = await client.query<LibraryGameRow>(
      `
        INSERT INTO app.duo_library_games (
          duo_id,
          catalog_game_id,
          status,
          added_by_user_id,
          status_updated_by_user_id,
          updated_at
        )
        VALUES ($1, $2, 'wishlist', $3, $3, now())
        ON CONFLICT (duo_id, catalog_game_id) DO UPDATE
        SET status = 'wishlist',
            status_updated_by_user_id = $3,
            updated_at = now()
        RETURNING
          id,
          duo_id,
          catalog_game_id,
          status,
          added_by_user_id,
          status_updated_by_user_id,
          created_at,
          updated_at
      `,
      [membership.duoId, input.catalogGameId, input.userId]
    );
    const game = result.rows[0];

    if (!game) {
      return { ok: false, reason: "catalog-game-not-found" };
    }

    await recordLibraryEvent(client, membership.duoId, input.userId, "library.wishlist_added", {
      catalogGameId: input.catalogGameId
    });

    return { ok: true, game: mapLibraryGame(game) };
  });
}

async function getJogandoCount(pool: QueueDbPool, userId: string): Promise<number> {
  return asUser(pool, userId, async (client) => {
    const membership = await getMembership(client, userId);

    if (!membership) {
      return 0;
    }

    const result = await client.query<{ count: string }>(
      `
        SELECT count(*) AS count
        FROM app.duo_library_games
        WHERE duo_id = $1
          AND status = 'jogando'
      `,
      [membership.duoId]
    );

    return Number(result.rows[0]?.count ?? 0);
  });
}

async function getLibraryGame(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
  }
): Promise<LibraryGameRecord | null> {
  return asUser(pool, input.userId, async (client) => {
    const membership = await getMembership(client, input.userId);

    if (!membership) {
      return null;
    }

    return getLibraryGameByCatalogId(client, membership.duoId, input.catalogGameId);
  });
}

async function moveLibraryGame(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
    status: Phase2LibraryStatus;
  }
): Promise<MoveLibraryGameResult> {
  try {
    return await asUser(pool, input.userId, async (client) => {
      const membership = await getMembership(client, input.userId);

      if (!membership) {
        return { ok: false, reason: "membership-required" };
      }

      const result = await client.query<LibraryGameRow>(
        `
          UPDATE app.duo_library_games
          SET status = $3,
              status_updated_by_user_id = $4,
              updated_at = now()
          WHERE duo_id = $1
            AND catalog_game_id = $2
          RETURNING
            id,
            duo_id,
            catalog_game_id,
            status,
            added_by_user_id,
            status_updated_by_user_id,
            created_at,
            updated_at
        `,
        [membership.duoId, input.catalogGameId, input.status, input.userId]
      );
      const game = result.rows[0];

      if (!game) {
        return { ok: false, reason: "library-game-not-found" };
      }

      await recordLibraryEvent(client, membership.duoId, input.userId, "library.status_moved", {
        catalogGameId: input.catalogGameId,
        status: input.status
      });

      return { ok: true, game: mapLibraryGame(game) };
    });
  } catch (error) {
    if (errorMessage(error).includes("jogando_limit_reached")) {
      return { ok: false, reason: "jogando-limit-reached" };
    }

    throw error;
  }
}

async function getGameDetail(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
  }
): Promise<LibraryGameDetailRecord | null> {
  return asUser(pool, input.userId, async (client) => {
    const membership = await getMembership(client, input.userId);

    if (!membership) {
      return null;
    }

    const libraryGame = await getLibraryGameByCatalogId(
      client,
      membership.duoId,
      input.catalogGameId
    );

    if (!libraryGame) {
      return null;
    }

    const memberPlatforms = await getMemberPlatforms(client, membership.duoId);
    return hydrateLibraryGame(client, libraryGame, memberPlatforms);
  });
}

async function hydrateLibraryGame(
  client: QueueDbClient,
  libraryGame: LibraryGameRecord,
  memberPlatforms: LibraryMemberPlatformRecord[]
): Promise<LibraryGameDetailRecord> {
  const catalogGame = await getCatalogFacts(client, libraryGame.catalogGameId);
  const [first, second] = memberPlatforms;
  const matchScore = calculateMatchScore({
    mainFlowEligible: catalogGame.mainFlowEligible,
    coopCampaignConfirmed: catalogGame.coopCampaignConfirmed,
    gamePlatforms: catalogGame.platforms,
    memberPlatforms: {
      first: first?.platforms ?? [],
      second: second?.platforms ?? []
    },
    hasReliableTimeEstimate: catalogGame.hasReliableTimeEstimate,
    hasVerifiedAvailability: catalogGame.hasVerifiedAvailability
  });

  return {
    libraryGame,
    catalogGame,
    memberPlatforms:
      first && second ? [first, second] : [],
    matchScore
  };
}

async function getMembership(
  client: QueueDbClient,
  userId: string
): Promise<{ duoId: string } | null> {
  const result = await client.query<MembershipRow>(
    `
      SELECT duo_id
      FROM app.duo_members
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = result.rows[0];

  return row ? { duoId: row.duo_id } : null;
}

async function getMemberPlatforms(
  client: QueueDbClient,
  duoId: string
): Promise<LibraryMemberPlatformRecord[]> {
  const result = await client.query<MemberRow>(
    `
      SELECT
        member.user_id,
        platform.platform
      FROM app.duo_members AS member
      LEFT JOIN app.member_platforms AS platform
        ON platform.user_id = member.user_id
        AND platform.enabled = true
      WHERE member.duo_id = $1
      ORDER BY member.member_slot, platform.platform
    `,
    [duoId]
  );
  const byUser = new Map<string, PlatformKey[]>();

  for (const row of result.rows) {
    const platforms = byUser.get(row.user_id) ?? [];
    if (row.platform && isPlatformKey(row.platform)) {
      platforms.push(row.platform);
    }
    byUser.set(row.user_id, platforms);
  }

  return [...byUser.entries()].map(([userId, platforms]) => ({
    userId,
    platforms
  }));
}

async function getLibraryGames(
  client: QueueDbClient,
  duoId: string
): Promise<LibraryGameRecord[]> {
  const result = await client.query<LibraryGameRow>(
    `
      SELECT
        id,
        duo_id,
        catalog_game_id,
        status,
        added_by_user_id,
        status_updated_by_user_id,
        created_at,
        updated_at
      FROM app.duo_library_games
      WHERE duo_id = $1
      ORDER BY updated_at DESC, created_at DESC
    `,
    [duoId]
  );

  return result.rows.map(mapLibraryGame);
}

async function getLibraryGameByCatalogId(
  client: QueueDbClient,
  duoId: string,
  catalogGameId: string
): Promise<LibraryGameRecord | null> {
  const result = await client.query<LibraryGameRow>(
    `
      SELECT
        id,
        duo_id,
        catalog_game_id,
        status,
        added_by_user_id,
        status_updated_by_user_id,
        created_at,
        updated_at
      FROM app.duo_library_games
      WHERE duo_id = $1
        AND catalog_game_id = $2
      LIMIT 1
    `,
    [duoId, catalogGameId]
  );
  const row = result.rows[0];

  return row ? mapLibraryGame(row) : null;
}

async function catalogGameExists(
  client: QueueDbClient,
  catalogGameId: string
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM catalog.games WHERE id = $1) AS exists",
    [catalogGameId]
  );

  return result.rows[0]?.exists ?? false;
}

async function getCatalogFacts(
  client: QueueDbClient,
  catalogGameId: string
): Promise<LibraryCatalogGameFacts> {
  const result = await client.query<CatalogGameRow>(
    `
      SELECT
        game.id,
        game.slug,
        game.name,
        game.background_image_url,
        game.main_flow_eligible,
        game.coop_campaign_confirmed,
        EXISTS (
          SELECT 1
          FROM catalog.game_time_estimates AS estimate
          WHERE estimate.game_id = game.id
            AND estimate.minutes IS NOT NULL
            AND estimate.confidence IN ('verified', 'estimated')
        ) AS has_reliable_time_estimate,
        EXISTS (
          SELECT 1
          FROM catalog.game_availability AS availability
          WHERE availability.game_id = game.id
            AND availability.status = 'available'
        ) AS has_verified_availability
      FROM catalog.games AS game
      WHERE game.id = $1
      LIMIT 1
    `,
    [catalogGameId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("catalog_game_not_found");
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    coverUrl: row.background_image_url,
    platforms: await getCatalogPlatformKeys(client, row.id),
    mainFlowEligible: row.main_flow_eligible,
    coopCampaignConfirmed: row.coop_campaign_confirmed,
    hasReliableTimeEstimate: row.has_reliable_time_estimate,
    hasVerifiedAvailability: row.has_verified_availability
  };
}

async function getCatalogPlatformKeys(
  client: QueueDbClient,
  catalogGameId: string
): Promise<PlatformKey[]> {
  const result = await client.query<{ platform_key: string }>(
    `
      SELECT platform_key
      FROM catalog.game_platforms
      WHERE game_id = $1
      ORDER BY platform_key
    `,
    [catalogGameId]
  );

  return result.rows
    .map((row) => row.platform_key)
    .filter(isPlatformKey);
}

async function recordLibraryEvent(
  client: QueueDbClient,
  duoId: string,
  userId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
      INSERT INTO ops.domain_events (
        duo_id,
        event_type,
        aggregate_type,
        aggregate_id,
        payload
      )
      VALUES ($1, $2, 'library', $3, $4::jsonb)
    `,
    [duoId, eventType, duoId, JSON.stringify(payload)]
  );
}

function mapLibraryGame(row: LibraryGameRow): LibraryGameRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    catalogGameId: row.catalog_game_id,
    status: row.status,
    addedByUserId: row.added_by_user_id,
    statusUpdatedByUserId: row.status_updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createEmptyGroups(): Record<Phase2LibraryStatus, LibraryGameDetailRecord[]> {
  return {
    wishlist: [],
    jogando: [],
    pausado: []
  };
}

function calculateCommonMemberPlatforms(
  members: LibraryMemberPlatformRecord[]
): PlatformKey[] {
  const [first, second] = members;
  return first && second ? getCommonPlatforms(first.platforms, second.platforms) : [];
}

function asUser<T>(
  pool: QueueDbPool,
  userId: string,
  callback: (client: QueueDbClient) => Promise<T>
): Promise<T> {
  return withAppUserTransaction(pool, userId, callback);
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
}
