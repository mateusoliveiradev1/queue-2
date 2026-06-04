import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  DiscoveryDecisionRecord,
  DiscoveryDeckRepository,
  DiscoveryGameReadState,
  DiscoveryMatchRecord,
  DiscoveryMemberContext,
  DiscoveryReadState
} from "../application/ports";
import type {
  DiscoveryDecision,
  DiscoveryLibraryHandoffStatus,
  DiscoverySourceMode
} from "../domain/discovery-policy";
import type { LibraryStatus } from "../../library";

type MemberRow = {
  duo_id: string;
  user_id: string;
  member_slot: number;
};

type PlatformRow = {
  user_id: string;
  platform: string;
};

type DecisionRow = {
  duo_id: string;
  user_id: string;
  catalog_game_id: string;
  decision: DiscoveryDecision;
  source_mode: DiscoverySourceMode;
  decided_at: Date;
  cooldown_until: Date | null;
  preference_weight: number;
};

type LibraryRow = {
  catalog_game_id: string;
  status: LibraryStatus;
};

type MatchRow = {
  id: string;
  duo_id: string;
  catalog_game_id: string;
  matched_at: Date;
  created_from: DiscoverySourceMode;
  first_user_id: string;
  second_user_id: string;
  reason_snapshot: string[] | null;
  library_handoff_status: DiscoveryLibraryHandoffStatus | null;
};

type CountRow = {
  count: string;
};

type GenreRow = {
  name: string;
};

let runtimePool: QueueDbPool | undefined;

export const discoveryRepository: DiscoveryDeckRepository = createDiscoveryRepository();

export function createDiscoveryRepository(
  pool: QueueDbPool = getRuntimePool()
): DiscoveryDeckRepository {
  return {
    getReadState: (input) => getReadState(pool, input)
  };
}

async function getReadState(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameIds: string[];
  }
): Promise<DiscoveryReadState> {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return emptyReadState(null);
    }

    const catalogGameIds = [...new Set(input.catalogGameIds)].filter(Boolean);
    const [decisions, libraryRows, matches, positiveGenres, currentDuoDecisionCount] =
      await Promise.all([
        getDecisions(client, context.duoId, catalogGameIds),
        getLibraryRows(client, context.duoId, catalogGameIds),
        getMatches(client, context.duoId, catalogGameIds),
        getPositiveGenres(client, context.duoId),
        getCurrentDuoDecisionCount(client, context.duoId)
      ]);

    return {
      context,
      games: catalogGameIds.map((catalogGameId) =>
        toGameReadState({
          catalogGameId,
          userId: input.userId,
          decisions,
          libraryRows,
          matches
        })
      ),
      positiveProfile: {
        genres: positiveGenres,
        tags: []
      },
      collaborative: {
        currentDuoDecisionCount,
        crossDuoPositiveDecisionCount: 0
      }
    };
  });
}

async function getMemberContext(
  client: QueueDbClient,
  userId: string
): Promise<DiscoveryMemberContext | null> {
  const membership = await client.query<MemberRow>(
    `
      SELECT member.duo_id, member.user_id, member.member_slot
      FROM app.duo_members AS member
      WHERE member.duo_id = (
        SELECT own.duo_id
        FROM app.duo_members AS own
        WHERE own.user_id = $1
        LIMIT 1
      )
      ORDER BY member.member_slot
    `,
    [userId]
  );

  if (membership.rows.length === 0) {
    return null;
  }

  const platforms = await client.query<PlatformRow>(
    `
      SELECT platform.user_id, platform.platform
      FROM app.member_platforms AS platform
      WHERE platform.duo_id = $1
        AND platform.enabled = true
      ORDER BY platform.user_id, platform.platform
    `,
    [membership.rows[0]!.duo_id]
  );
  const platformsByUser = new Map<string, string[]>();

  for (const row of platforms.rows) {
    const values = platformsByUser.get(row.user_id) ?? [];
    values.push(row.platform);
    platformsByUser.set(row.user_id, values);
  }

  const first = membership.rows[0]!;
  const second = membership.rows[1] ?? null;

  return {
    duoId: first.duo_id,
    userId,
    partnerUserId:
      membership.rows.find((member) => member.user_id !== userId)?.user_id ?? null,
    memberUserIds: membership.rows.map((member) => member.user_id),
    memberPlatforms: {
      first: platformsByUser.get(first.user_id) ?? [],
      second: second ? platformsByUser.get(second.user_id) ?? [] : []
    }
  };
}

async function getDecisions(
  client: QueueDbClient,
  duoId: string,
  catalogGameIds: string[]
): Promise<DiscoveryDecisionRecord[]> {
  if (catalogGameIds.length === 0) {
    return [];
  }

  const result = await client.query<DecisionRow>(
    `
      SELECT
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        decided_at,
        cooldown_until,
        preference_weight
      FROM app.discovery_member_decisions
      WHERE duo_id = $1
        AND catalog_game_id = ANY($2::uuid[])
    `,
    [duoId, catalogGameIds]
  );

  return result.rows.map(mapDecision);
}

async function getLibraryRows(
  client: QueueDbClient,
  duoId: string,
  catalogGameIds: string[]
): Promise<LibraryRow[]> {
  if (catalogGameIds.length === 0) {
    return [];
  }

  const result = await client.query<LibraryRow>(
    `
      SELECT catalog_game_id, status
      FROM app.duo_library_games
      WHERE duo_id = $1
        AND catalog_game_id = ANY($2::uuid[])
    `,
    [duoId, catalogGameIds]
  );

  return result.rows;
}

async function getMatches(
  client: QueueDbClient,
  duoId: string,
  catalogGameIds: string[]
): Promise<DiscoveryMatchRecord[]> {
  if (catalogGameIds.length === 0) {
    return [];
  }

  const result = await client.query<MatchRow>(
    `
      SELECT
        id,
        duo_id,
        catalog_game_id,
        matched_at,
        created_from,
        first_user_id,
        second_user_id,
        reason_snapshot,
        library_handoff_status
      FROM app.discovery_matches
      WHERE duo_id = $1
        AND catalog_game_id = ANY($2::uuid[])
    `,
    [duoId, catalogGameIds]
  );

  return result.rows.map(mapMatch);
}

async function getPositiveGenres(
  client: QueueDbClient,
  duoId: string
): Promise<string[]> {
  const result = await client.query<GenreRow>(
    `
      SELECT DISTINCT lower(genre.name) AS name
      FROM app.discovery_member_decisions AS decision
      INNER JOIN catalog.game_genres AS genre
        ON genre.game_id = decision.catalog_game_id
      WHERE decision.duo_id = $1
        AND decision.decision = 'want'
      ORDER BY lower(genre.name)
      LIMIT 12
    `,
    [duoId]
  );

  return result.rows.map((row) => row.name).filter(Boolean);
}

async function getCurrentDuoDecisionCount(
  client: QueueDbClient,
  duoId: string
): Promise<number> {
  const result = await client.query<CountRow>(
    `
      SELECT count(DISTINCT catalog_game_id)::text AS count
      FROM app.discovery_member_decisions
      WHERE duo_id = $1
    `,
    [duoId]
  );

  return Number.parseInt(result.rows[0]?.count ?? "0", 10);
}

function toGameReadState(input: {
  catalogGameId: string;
  userId: string;
  decisions: DiscoveryDecisionRecord[];
  libraryRows: LibraryRow[];
  matches: DiscoveryMatchRecord[];
}): DiscoveryGameReadState {
  const currentMemberDecision =
    input.decisions.find(
      (decision) =>
        decision.userId === input.userId &&
        decision.catalogGameId === input.catalogGameId
    ) ?? null;
  const gameDecisions = input.decisions.filter(
    (decision) => decision.catalogGameId === input.catalogGameId
  );

  return {
    catalogGameId: input.catalogGameId,
    currentMemberDecision,
    seenByCurrentMember: Boolean(currentMemberDecision),
    seenByAnyMember: gameDecisions.length > 0,
    libraryStatus:
      input.libraryRows.find((row) => row.catalog_game_id === input.catalogGameId)
        ?.status ?? null,
    match:
      input.matches.find((match) => match.catalogGameId === input.catalogGameId) ??
      null
  };
}

function emptyReadState(context: DiscoveryMemberContext | null): DiscoveryReadState {
  return {
    context,
    games: [],
    positiveProfile: {
      genres: [],
      tags: []
    },
    collaborative: {
      currentDuoDecisionCount: 0,
      crossDuoPositiveDecisionCount: 0
    }
  };
}

function mapDecision(row: DecisionRow): DiscoveryDecisionRecord {
  return {
    duoId: row.duo_id,
    userId: row.user_id,
    catalogGameId: row.catalog_game_id,
    decision: row.decision,
    sourceMode: row.source_mode,
    decidedAt: row.decided_at,
    cooldownUntil: row.cooldown_until,
    preferenceWeight: row.preference_weight
  };
}

function mapMatch(row: MatchRow): DiscoveryMatchRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    catalogGameId: row.catalog_game_id,
    matchedAt: row.matched_at,
    createdFrom: row.created_from,
    firstUserId: row.first_user_id,
    secondUserId: row.second_user_id,
    reasonSnapshot: row.reason_snapshot ?? [],
    libraryHandoffStatus: row.library_handoff_status
  };
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}
