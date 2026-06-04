import "server-only";

import { randomUUID } from "node:crypto";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import type {
  DiscoveryDecisionRecord,
  DiscoveryGameReadState,
  DiscoveryLiveSessionPayload,
  DiscoveryLiveSessionRecord,
  DiscoveryMatchHistoryItem,
  DiscoveryMatchRecord,
  DiscoveryMemberContext,
  DiscoveryRepository,
  DiscoveryReadState
} from "../application/ports";
import { mergeDuoMoodAnswers, type MoodQuizAnswers } from "../domain/mood-quiz";
import {
  canCreateDiscoveryMatch,
  evaluateDiscoveryDecision,
  type DiscoveryDecision,
  type DiscoveryDecisionEffect,
  type DiscoveryLibraryHandoffStatus,
  type DiscoverySourceMode
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

type CatalogGameExistsRow = {
  exists: boolean;
};

type ReasonFactRow = {
  coop_campaign_confirmed: boolean;
  estimated_minutes: number | null;
  availability_type: "free" | "game-pass" | null;
  common_platforms: string[] | null;
};

type MatchHistoryRow = MatchRow & {
  slug: string;
  name: string;
  background_image_url: string | null;
  library_status: LibraryStatus | null;
};

type LiveSessionRow = {
  id: string;
  duo_id: string;
  started_by_user_id: string;
  status: "active" | "ended" | "expired";
  started_at: Date;
  expires_at: Date;
  ended_at: Date | null;
};

type MoodAnswerRow = {
  user_id: string;
  quiz_round: string;
  question_key: "energy" | "commitment" | "vibe";
  answer_key: string;
};

let runtimePool: QueueDbPool | undefined;
const LIVE_SESSION_MINUTES = 10;

export const discoveryRepository: DiscoveryRepository = createDiscoveryRepository();

export function createDiscoveryRepository(
  pool: QueueDbPool = getRuntimePool()
): DiscoveryRepository {
  return {
    getReadState: (input) => getReadState(pool, input),
    recordDecision: (input) => recordDecision(pool, input),
    markMatchLibraryHandoff: (input) => markMatchLibraryHandoff(pool, input),
    getMatchHistory: (input) => getMatchHistory(pool, input),
    startLiveSession: (input) => startLiveSession(pool, input),
    getLiveSession: (input) => getLiveSession(pool, input),
    answerMoodQuiz: (input) => answerMoodQuiz(pool, input)
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

async function recordDecision(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
    decision: DiscoveryDecision;
    sourceMode: DiscoverySourceMode;
  }
) {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return { ok: false as const, reason: "membership-required" as const };
    }

    if (!(await catalogGameExists(client, input.catalogGameId))) {
      return { ok: false as const, reason: "catalog-game-not-found" as const };
    }

    const effect = evaluateDiscoveryDecision({ decision: input.decision });
    const decision = await upsertDecision(client, {
      ...input,
      duoId: context.duoId,
      effect
    });
    const existingMatch = await getExistingMatch(
      client,
      context.duoId,
      input.catalogGameId
    );
    const partnerDecision = context.partnerUserId
      ? await getPartnerDecision(client, {
          duoId: context.duoId,
          partnerUserId: context.partnerUserId,
          catalogGameId: input.catalogGameId
        })
      : null;
    const matchPolicy = canCreateDiscoveryMatch({
      actorUserId: input.userId,
      partnerUserId: context.partnerUserId ?? input.userId,
      actorDecision: input.decision,
      partnerDecision: partnerDecision?.decision ?? null,
      existingMatch: Boolean(existingMatch)
    });

    await recordDiscoveryEvent(client, context.duoId, "discovery.decision_recorded", {
      catalogGameId: input.catalogGameId,
      userId: input.userId,
      decision: input.decision,
      sourceMode: input.sourceMode
    });

    if (existingMatch && input.decision === "want") {
      return {
        ok: true as const,
        state: {
          kind: "already-matched" as const,
          catalogGameId: input.catalogGameId,
          match: existingMatch
        },
        decision,
        effect,
        matchPolicy,
        match: existingMatch
      };
    }

    if (matchPolicy.ok && context.partnerUserId) {
      const reasonSnapshot = await getReasonSnapshot(
        client,
        context.duoId,
        input.catalogGameId
      );
      const createdMatch = await createMatch(client, {
        duoId: context.duoId,
        catalogGameId: input.catalogGameId,
        sourceMode: input.sourceMode,
        actorUserId: input.userId,
        partnerUserId: context.partnerUserId,
        reasonSnapshot
      });

      await recordDiscoveryEvent(client, context.duoId, "discovery.match_created", {
        catalogGameId: input.catalogGameId,
        matchId: createdMatch.id,
        reasonSnapshot
      });

      return {
        ok: true as const,
        state: {
          kind: "match-created" as const,
          catalogGameId: input.catalogGameId,
          match: createdMatch
        },
        decision,
        effect,
        matchPolicy,
        match: createdMatch
      };
    }

    if (effect.decision === "not_now" && effect.cooldownUntil) {
      return {
        ok: true as const,
        state: {
          kind: "cooldown-set" as const,
          catalogGameId: input.catalogGameId,
          cooldownUntil: effect.cooldownUntil
        },
        decision,
        effect,
        matchPolicy,
        match: null
      };
    }

    return {
      ok: true as const,
      state: {
        kind: "card-advanced" as const,
        catalogGameId: input.catalogGameId
      },
      decision,
      effect,
      matchPolicy,
      match: null
    };
  });
}

async function markMatchLibraryHandoff(
  pool: QueueDbPool,
  input: {
    userId: string;
    catalogGameId: string;
    status: DiscoveryLibraryHandoffStatus;
  }
): Promise<void> {
  await withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return;
    }

    await client.query(
      `
        UPDATE app.discovery_matches
        SET library_handoff_status = $3,
            library_handoff_at = now(),
            library_handoff_by_user_id = $4
        WHERE duo_id = $1
          AND catalog_game_id = $2
      `,
      [context.duoId, input.catalogGameId, input.status, input.userId]
    );
  });
}

async function getMatchHistory(
  pool: QueueDbPool,
  input: {
    userId: string;
    limit?: number;
  }
): Promise<DiscoveryMatchHistoryItem[]> {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return [];
    }

    const result = await client.query<MatchHistoryRow>(
      `
        SELECT
          match.id,
          match.duo_id,
          match.catalog_game_id,
          match.matched_at,
          match.created_from,
          match.first_user_id,
          match.second_user_id,
          match.reason_snapshot,
          match.library_handoff_status,
          game.slug,
          game.name,
          game.background_image_url,
          library.status AS library_status
        FROM app.discovery_matches AS match
        INNER JOIN catalog.games AS game
          ON game.id = match.catalog_game_id
        LEFT JOIN app.duo_library_games AS library
          ON library.duo_id = match.duo_id
          AND library.catalog_game_id = match.catalog_game_id
        WHERE match.duo_id = $1
        ORDER BY match.matched_at DESC
        LIMIT $2
      `,
      [context.duoId, Math.min(24, Math.max(1, input.limit ?? 12))]
    );

    return result.rows.map((row) => ({
      match: mapMatch(row),
      slug: row.slug,
      title: row.name,
      coverUrl: row.background_image_url,
      libraryStatus: row.library_status,
      reasons: row.reason_snapshot ?? []
    }));
  });
}

async function startLiveSession(
  pool: QueueDbPool,
  input: {
    userId: string;
  }
) {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return { ok: false as const, reason: "membership-required" as const };
    }

    await expireOldLiveSessions(client, context.duoId);

    const result = await client.query<LiveSessionRow>(
      `
        INSERT INTO app.discovery_live_sessions (
          duo_id,
          started_by_user_id,
          status,
          started_at,
          expires_at,
          updated_at
        )
        VALUES ($1, $2, 'active', now(), now() + ($3::text || ' minutes')::interval, now())
        RETURNING
          id,
          duo_id,
          started_by_user_id,
          status,
          started_at,
          expires_at,
          ended_at
      `,
      [context.duoId, input.userId, LIVE_SESSION_MINUTES]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("discovery_live_session_create_failed");
    }

    return {
      ok: true as const,
      session: mapLiveSession(row)
    };
  });
}

async function getLiveSession(
  pool: QueueDbPool,
  input: {
    userId: string;
    sessionId?: string | null;
  }
): Promise<DiscoveryLiveSessionPayload> {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return { ok: false, reason: "membership-required" };
    }

    await expireOldLiveSessions(client, context.duoId);

    const session = await findLiveSession(client, {
      duoId: context.duoId,
      sessionId: input.sessionId ?? null
    });

    if (!session) {
      return { ok: false, reason: "live-session-not-found" };
    }

    return {
      ok: true,
      session,
      matches: await getLiveMatches(client, context.duoId, session.startedAt),
      expiresInSeconds: Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      )
    };
  });
}

async function answerMoodQuiz(
  pool: QueueDbPool,
  input: {
    userId: string;
    answers: MoodQuizAnswers;
  }
) {
  return withAppUserTransaction(pool, input.userId, async (client) => {
    const context = await getMemberContext(client, input.userId);

    if (!context) {
      return {
        mood: {
          kind: "empty" as const,
          answeredMembers: 0 as const,
          recommendationMode: "none" as const
        }
      };
    }

    const quizRound = await getCurrentMoodQuizRound(client, context.duoId);

    for (const [questionKey, answerKey] of Object.entries(input.answers)) {
      await client.query(
        `
          INSERT INTO app.discovery_mood_quiz_answers (
            duo_id,
            user_id,
            quiz_round,
            question_key,
            answer_key,
            answered_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, now(), now())
          ON CONFLICT (duo_id, user_id, quiz_round, question_key) DO UPDATE
          SET answer_key = excluded.answer_key,
              answered_at = excluded.answered_at,
              updated_at = now()
        `,
        [context.duoId, input.userId, quizRound, questionKey, answerKey]
      );
    }

    return {
      mood: await getMergedMoodForRound(client, {
        duoId: context.duoId,
        quizRound,
        memberUserIds: context.memberUserIds
      })
    };
  });
}

async function expireOldLiveSessions(
  client: QueueDbClient,
  duoId: string
): Promise<void> {
  await client.query(
    `
      UPDATE app.discovery_live_sessions
      SET status = 'expired',
          updated_at = now()
      WHERE duo_id = $1
        AND status = 'active'
        AND expires_at <= now()
    `,
    [duoId]
  );
}

async function findLiveSession(
  client: QueueDbClient,
  input: {
    duoId: string;
    sessionId: string | null;
  }
): Promise<DiscoveryLiveSessionRecord | null> {
  const result = await client.query<LiveSessionRow>(
    `
      SELECT
        id,
        duo_id,
        started_by_user_id,
        status,
        started_at,
        expires_at,
        ended_at
      FROM app.discovery_live_sessions
      WHERE duo_id = $1
        AND ($2::uuid IS NULL OR id = $2::uuid)
        AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [input.duoId, input.sessionId]
  );
  const row = result.rows[0];

  return row ? mapLiveSession(row) : null;
}

async function getLiveMatches(
  client: QueueDbClient,
  duoId: string,
  startedAt: Date
): Promise<DiscoveryMatchHistoryItem[]> {
  const result = await client.query<MatchHistoryRow>(
    `
      SELECT
        match.id,
        match.duo_id,
        match.catalog_game_id,
        match.matched_at,
        match.created_from,
        match.first_user_id,
        match.second_user_id,
        match.reason_snapshot,
        match.library_handoff_status,
        game.slug,
        game.name,
        game.background_image_url,
        library.status AS library_status
      FROM app.discovery_matches AS match
      INNER JOIN catalog.games AS game
        ON game.id = match.catalog_game_id
      LEFT JOIN app.duo_library_games AS library
        ON library.duo_id = match.duo_id
        AND library.catalog_game_id = match.catalog_game_id
      WHERE match.duo_id = $1
        AND match.matched_at >= $2
      ORDER BY match.matched_at DESC
      LIMIT 12
    `,
    [duoId, startedAt]
  );

  return result.rows.map((row) => ({
    match: mapMatch(row),
    slug: row.slug,
    title: row.name,
    coverUrl: row.background_image_url,
    libraryStatus: row.library_status,
    reasons: row.reason_snapshot ?? []
  }));
}

async function getCurrentMoodQuizRound(
  client: QueueDbClient,
  duoId: string
): Promise<string> {
  const result = await client.query<{ quiz_round: string }>(
    `
      SELECT quiz_round
      FROM app.discovery_mood_quiz_answers
      WHERE duo_id = $1
      ORDER BY answered_at DESC
      LIMIT 1
    `,
    [duoId]
  );

  return result.rows[0]?.quiz_round ?? randomUUID();
}

async function getMergedMoodForRound(
  client: QueueDbClient,
  input: {
    duoId: string;
    quizRound: string;
    memberUserIds: string[];
  }
) {
  const result = await client.query<MoodAnswerRow>(
    `
      SELECT user_id, quiz_round, question_key, answer_key
      FROM app.discovery_mood_quiz_answers
      WHERE duo_id = $1
        AND quiz_round = $2
      ORDER BY user_id, question_key
    `,
    [input.duoId, input.quizRound]
  );
  const answersByUser = new Map<string, Partial<MoodQuizAnswers>>();

  for (const row of result.rows) {
    const answers = answersByUser.get(row.user_id) ?? {};
    if (row.question_key === "energy" && isMoodEnergyAnswer(row.answer_key)) {
      answers.energy = row.answer_key;
    }
    if (row.question_key === "commitment" && isMoodCommitmentAnswer(row.answer_key)) {
      answers.commitment = row.answer_key;
    }
    if (row.question_key === "vibe" && isMoodVibeAnswer(row.answer_key)) {
      answers.vibe = row.answer_key;
    }
    answersByUser.set(row.user_id, answers);
  }
  const [firstUserId, secondUserId] = input.memberUserIds;

  return mergeDuoMoodAnswers({
    first: firstUserId ? completeMoodAnswers(answersByUser.get(firstUserId)) : null,
    second: secondUserId ? completeMoodAnswers(answersByUser.get(secondUserId)) : null
  });
}

function completeMoodAnswers(
  answers: Partial<MoodQuizAnswers> | undefined
): MoodQuizAnswers | null {
  if (!answers?.energy || !answers.commitment || !answers.vibe) {
    return null;
  }

  return {
    energy: answers.energy,
    commitment: answers.commitment,
    vibe: answers.vibe
  };
}

function isMoodEnergyAnswer(value: string): value is MoodQuizAnswers["energy"] {
  return ["low", "medium", "high"].includes(value);
}

function isMoodCommitmentAnswer(
  value: string
): value is MoodQuizAnswers["commitment"] {
  return ["short", "steady", "epic"].includes(value);
}

function isMoodVibeAnswer(value: string): value is MoodQuizAnswers["vibe"] {
  return ["laugh", "think", "focus", "flexible"].includes(value);
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

async function catalogGameExists(
  client: QueueDbClient,
  catalogGameId: string
): Promise<boolean> {
  const result = await client.query<CatalogGameExistsRow>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM catalog.games
        WHERE id = $1
      ) AS exists
    `,
    [catalogGameId]
  );

  return result.rows[0]?.exists ?? false;
}

async function upsertDecision(
  client: QueueDbClient,
  input: {
    duoId: string;
    userId: string;
    catalogGameId: string;
    decision: DiscoveryDecision;
    sourceMode: DiscoverySourceMode;
    effect: DiscoveryDecisionEffect;
  }
): Promise<DiscoveryDecisionRecord> {
  const result = await client.query<DecisionRow>(
    `
      INSERT INTO app.discovery_member_decisions (
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        cooldown_until,
        preference_weight,
        decided_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      ON CONFLICT (duo_id, user_id, catalog_game_id) DO UPDATE
      SET decision = excluded.decision,
          source_mode = excluded.source_mode,
          cooldown_until = excluded.cooldown_until,
          preference_weight = excluded.preference_weight,
          decided_at = excluded.decided_at,
          updated_at = now()
      RETURNING
        duo_id,
        user_id,
        catalog_game_id,
        decision,
        source_mode,
        decided_at,
        cooldown_until,
        preference_weight
    `,
    [
      input.duoId,
      input.userId,
      input.catalogGameId,
      input.decision,
      input.sourceMode,
      input.effect.cooldownUntil,
      input.effect.preferenceWeight
    ]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("discovery_decision_upsert_failed");
  }

  return mapDecision(row);
}

async function getExistingMatch(
  client: QueueDbClient,
  duoId: string,
  catalogGameId: string
): Promise<DiscoveryMatchRecord | null> {
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
        AND catalog_game_id = $2
      LIMIT 1
    `,
    [duoId, catalogGameId]
  );
  const row = result.rows[0];

  return row ? mapMatch(row) : null;
}

async function getPartnerDecision(
  client: QueueDbClient,
  input: {
    duoId: string;
    partnerUserId: string;
    catalogGameId: string;
  }
): Promise<DiscoveryDecisionRecord | null> {
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
        AND user_id = $2
        AND catalog_game_id = $3
      LIMIT 1
    `,
    [input.duoId, input.partnerUserId, input.catalogGameId]
  );
  const row = result.rows[0];

  return row ? mapDecision(row) : null;
}

async function getReasonSnapshot(
  client: QueueDbClient,
  duoId: string,
  catalogGameId: string
): Promise<string[]> {
  const result = await client.query<ReasonFactRow>(
    `
      WITH common_platforms AS (
        SELECT platform.platform
        FROM app.member_platforms AS platform
        WHERE platform.duo_id = $1
          AND platform.enabled = true
        GROUP BY platform.platform
        HAVING count(DISTINCT platform.user_id) = 2
      )
      SELECT
        game.coop_campaign_confirmed,
        estimate.minutes AS estimated_minutes,
        availability.availability_type,
        array_remove(array_agg(DISTINCT game_platform.platform_key), NULL) AS common_platforms
      FROM catalog.games AS game
      LEFT JOIN catalog.game_platforms AS game_platform
        ON game_platform.game_id = game.id
        AND game_platform.platform_key IN (SELECT platform FROM common_platforms)
      LEFT JOIN catalog.game_time_estimates AS estimate
        ON estimate.game_id = game.id
        AND estimate.minutes IS NOT NULL
      LEFT JOIN catalog.game_availability AS availability
        ON availability.game_id = game.id
        AND availability.status = 'available'
      WHERE game.id = $2
      GROUP BY
        game.coop_campaign_confirmed,
        estimate.minutes,
        availability.availability_type
      LIMIT 1
    `,
    [duoId, catalogGameId]
  );
  const row = result.rows[0];

  return [
    row?.coop_campaign_confirmed ? "campanha 2p" : null,
    row?.common_platforms?.[0] ? `${formatPlatform(row.common_platforms[0])} em comum` : null,
    row?.estimated_minutes && row.estimated_minutes <= 480 ? "curto para hoje" : null,
    row?.availability_type === "game-pass" ? "Game Pass verificado" : null,
    row?.availability_type === "free" ? "gratis verificado" : null
  ].filter((reason): reason is string => Boolean(reason)).slice(0, 5);
}

async function createMatch(
  client: QueueDbClient,
  input: {
    duoId: string;
    catalogGameId: string;
    sourceMode: DiscoverySourceMode;
    actorUserId: string;
    partnerUserId: string;
    reasonSnapshot: string[];
  }
): Promise<DiscoveryMatchRecord> {
  const result = await client.query<MatchRow>(
    `
      INSERT INTO app.discovery_matches (
        duo_id,
        catalog_game_id,
        created_from,
        first_user_id,
        second_user_id,
        reason_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (duo_id, catalog_game_id) DO NOTHING
      RETURNING
        id,
        duo_id,
        catalog_game_id,
        matched_at,
        created_from,
        first_user_id,
        second_user_id,
        reason_snapshot,
        library_handoff_status
    `,
    [
      input.duoId,
      input.catalogGameId,
      input.sourceMode,
      input.actorUserId,
      input.partnerUserId,
      JSON.stringify(input.reasonSnapshot)
    ]
  );
  const row = result.rows[0];

  if (row) {
    return mapMatch(row);
  }

  const existing = await getExistingMatch(client, input.duoId, input.catalogGameId);

  if (!existing) {
    throw new Error("discovery_match_create_failed");
  }

  return existing;
}

async function recordDiscoveryEvent(
  client: QueueDbClient,
  duoId: string,
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
      VALUES ($1, $2, 'discovery', $3, $4::jsonb)
    `,
    [duoId, eventType, duoId, JSON.stringify(payload)]
  );
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

function mapLiveSession(row: LiveSessionRow): DiscoveryLiveSessionRecord {
  return {
    id: row.id,
    duoId: row.duo_id,
    startedByUserId: row.started_by_user_id,
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    endedAt: row.ended_at
  };
}

function formatPlatform(platform: string): string {
  const labels: Record<string, string> = {
    pc: "PC",
    playstation: "PlayStation",
    xbox: "Xbox",
    switch: "Switch",
    "steam-deck": "Steam Deck"
  };

  return labels[platform] ?? platform;
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}
