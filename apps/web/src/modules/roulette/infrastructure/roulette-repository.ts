import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

import { getRouletteStateFromTransaction } from "../application/get-roulette-state";
import { replayRouletteRoundFromTransaction } from "../application/replay-roulette-round";
import type { RouletteRarity } from "../domain/roulette-policy";
import type {
  DiscardRouletteResult,
  GetRouletteStateResult,
  LockRouletteResultAsPrincipalInput,
  LockRouletteResultAsPrincipalResult,
  ReplayRouletteRoundResult,
  RouletteBoostBalanceRecord,
  RouletteBoostLedgerRecord,
  RouletteCooldownRecord,
  RouletteDuoId,
  RouletteEligibleGameRecord,
  RouletteHistoryEventRecord,
  RouletteMembershipContext,
  RoulettePityStateRecord,
  RouletteRepository,
  RouletteRepositoryTransaction,
  RouletteRoundEntryRecord,
  RouletteRoundId,
  RouletteRoundRecord,
  RouletteUserId,
  StartRouletteRoundInput,
  StartRouletteRoundResult
} from "../application/ports";

type MembershipRow = {
  duo_id: string;
  user_id: string;
};

type EligibleGameRow = {
  id: string;
  catalog_game_id: string;
  status: string;
  title: string;
  cover_url: string | null;
  rarity: RouletteRarity;
  updated_at: Date;
};

type BoostBalanceRow = {
  duo_id: string;
  balance: number;
  cap: number;
  updated_at: Date;
};

type PityStateRow = {
  duo_id: string;
  draws_since_epic_or_higher: number;
  last_epic_or_higher_at: Date | null;
  updated_at: Date;
};

type CooldownRow = {
  duo_id: string;
  library_game_id: string;
  round_id: string | null;
  remaining_rounds: number;
  weight_multiplier: string | number;
  updated_at: Date;
};

type RoundRow = {
  id: string;
  duo_id: string;
  idempotency_key: string;
  status: RouletteRoundRecord["status"];
  result_library_game_id: string;
  result_catalog_game_id: string | null;
  result_rarity: RouletteRarity;
  boost_spent: boolean;
  boost_ledger_id: string | null;
  pity_before: number;
  pity_after: number;
  weekend_multiplier_applied: boolean;
  selected_by_user_id: string;
  resolved_by_user_id: string | null;
  metadata: unknown;
  selected_at: Date;
  revealed_at: Date | null;
  resolved_at: Date | null;
  updated_at: Date;
  created_at: Date;
};

type RoundEntryRow = {
  id: string;
  duo_id: string;
  round_id: string;
  slot_index: number;
  library_game_id: string;
  catalog_game_id: string | null;
  rarity: RouletteRarity;
  title_snapshot: string;
  cover_url_snapshot: string | null;
  selected_slot: boolean;
  metadata: unknown;
  created_at: Date;
};

type HistoryEventRow = {
  id: string;
  duo_id: string;
  round_id: string | null;
  event_key: string;
  event_type: RouletteHistoryEventRecord["eventType"];
  actor_user_id: string | null;
  metadata: unknown;
  created_at: Date;
};

let runtimePool: QueueDbPool | undefined;
let defaultRouletteRepository: RouletteRepository | undefined;

export const rouletteRepository: RouletteRepository = {
  withUserTransaction: (...args) =>
    getDefaultRouletteRepository().withUserTransaction(...args),
  getRouletteState: (...args) =>
    getDefaultRouletteRepository().getRouletteState(...args),
  startRouletteRound: (...args) =>
    getDefaultRouletteRepository().startRouletteRound(...args),
  replayRouletteRound: (...args) =>
    getDefaultRouletteRepository().replayRouletteRound(...args),
  lockRouletteResultAsPrincipal: (...args) =>
    getDefaultRouletteRepository().lockRouletteResultAsPrincipal(...args),
  discardRouletteResult: (...args) =>
    getDefaultRouletteRepository().discardRouletteResult(...args),
  readRouletteHistory: (...args) =>
    getDefaultRouletteRepository().readRouletteHistory(...args)
};

export function createRouletteRepository(
  pool: QueueDbPool = getRuntimePool()
): RouletteRepository {
  return {
    withUserTransaction: (userId, callback) =>
      withAppUserTransaction(pool, userId, (client) =>
        callback(createRouletteTransaction(client))
      ),
    getRouletteState: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        getRouletteStateShell(createRouletteTransaction(client), input.userId)
      ),
    startRouletteRound: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        startRouletteRoundShell(createRouletteTransaction(client), input)
      ),
    replayRouletteRound: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        replayRouletteRoundShell(createRouletteTransaction(client), input)
      ),
    lockRouletteResultAsPrincipal: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        lockRouletteResultAsPrincipalShell(createRouletteTransaction(client), input)
      ),
    discardRouletteResult: (input) =>
      withAppUserTransaction(pool, input.userId, (client) =>
        discardRouletteResultShell(createRouletteTransaction(client), input)
      ),
    readRouletteHistory: (input) =>
      withAppUserTransaction(pool, input.userId, async (client) => {
        const transaction = createRouletteTransaction(client);
        const membership = await transaction.resolveMembership(input.userId);

        return membership
          ? transaction.readHistory({
              duoId: membership.duoId,
              limit: input.limit
            })
          : [];
      })
  };
}

export function createRouletteTransaction(
  client: QueueDbClient
): RouletteRepositoryTransaction {
  return {
    resolveMembership: (userId) => resolveMembership(client, userId),
    readEligiblePool: (input) => readEligiblePool(client, input.duoId),
    readAudioPreference: (input) => readAudioPreference(client, input.duoId),
    readActiveRound: (input) => readActiveRound(client, input.duoId),
    readRoundById: (input) => readRoundById(client, input.duoId, input.roundId),
    readRoundByIdempotencyKey: () => pendingPlan0603("readRoundByIdempotencyKey"),
    readRoundEntries: (input) =>
      readRoundEntries(client, input.duoId, input.roundId),
    lockBoostBalance: (input) => lockBoostBalance(client, input.duoId),
    materializeBoostFromXp: () => pendingPlan0603("materializeBoostFromXp"),
    insertBoostLedgerEntry: () => pendingPlan0603("insertBoostLedgerEntry"),
    updateBoostBalance: () => pendingPlan0603("updateBoostBalance"),
    lockPityState: (input) => lockPityState(client, input.duoId),
    updatePityState: () => pendingPlan0603("updatePityState"),
    readCooldowns: (input) => readCooldowns(client, input.duoId),
    upsertCooldown: () => pendingPlan0603("upsertCooldown"),
    decrementCooldowns: () => pendingPlan0603("decrementCooldowns"),
    persistRound: () => pendingPlan0603("persistRound"),
    persistRoundEntries: () => pendingPlan0603("persistRoundEntries"),
    markRoundRevealed: () => pendingPlan0603("markRoundRevealed"),
    recordReplay: () => pendingPlan0603("recordReplay"),
    lockRoundResult: () => pendingPlan0603("lockRoundResult"),
    discardRoundResult: () => pendingPlan0603("discardRoundResult"),
    insertHistoryEvent: () => pendingPlan0603("insertHistoryEvent"),
    readHistory: (input) => readHistory(client, input.duoId, input.limit)
  };
}

async function getRouletteStateShell(
  transaction: RouletteRepositoryTransaction,
  userId: RouletteUserId
): Promise<GetRouletteStateResult> {
  const membership = await transaction.resolveMembership(userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  return getRouletteStateFromTransaction(input, transaction);
}

async function startRouletteRoundShell(
  transaction: RouletteRepositoryTransaction,
  input: StartRouletteRoundInput
): Promise<StartRouletteRoundResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  return pendingPlan0603("startRouletteRound");
}

async function replayRouletteRoundShell(
  transaction: RouletteRepositoryTransaction,
  input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  }
): Promise<ReplayRouletteRoundResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  return replayRouletteRoundFromTransaction(input, transaction);
}

async function lockRouletteResultAsPrincipalShell(
  transaction: RouletteRepositoryTransaction,
  input: LockRouletteResultAsPrincipalInput
): Promise<LockRouletteResultAsPrincipalResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  return pendingPlan0603("lockRouletteResultAsPrincipal");
}

async function discardRouletteResultShell(
  transaction: RouletteRepositoryTransaction,
  input: {
    userId: RouletteUserId;
    roundId: RouletteRoundId;
  }
): Promise<DiscardRouletteResult> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  return pendingPlan0603("discardRouletteResult");
}

async function resolveMembership(
  client: QueueDbClient,
  userId: RouletteUserId
): Promise<RouletteMembershipContext | null> {
  const result = await client.query<MembershipRow>(
    `
      SELECT member.duo_id, member.user_id
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

  if (result.rows.length === 0) {
    return null;
  }

  const memberUserIds = result.rows.map((row) => row.user_id);

  return {
    duoId: result.rows[0]!.duo_id,
    memberUserIds,
    partnerUserId: memberUserIds.find((memberUserId) => memberUserId !== userId) ?? null,
    userId
  };
}

async function readEligiblePool(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<RouletteEligibleGameRecord[]> {
  const result = await client.query<EligibleGameRow>(
    `
      SELECT
        library.id,
        library.catalog_game_id,
        library.status,
        game.name AS title,
        game.background_image_url AS cover_url,
        'common'::text AS rarity,
        library.updated_at
      FROM app.duo_library_games AS library
      INNER JOIN catalog.games AS game ON game.id = library.catalog_game_id
      WHERE library.duo_id = $1
        AND library.status IN ('wishlist', 'pausado')
      ORDER BY library.updated_at DESC, library.id
    `,
    [duoId]
  );

  return result.rows.map((row) => ({
    catalogGameId: row.catalog_game_id,
    coverUrl: row.cover_url,
    id: row.id,
    rarity: row.rarity,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at
  }));
}

async function readAudioPreference(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<boolean> {
  const result = await client.query<{ audio_enabled: boolean }>(
    `
      SELECT coalesce(preference.audio_enabled, true) AS audio_enabled
      FROM app.duos AS duo
      LEFT JOIN app.duo_preferences AS preference ON preference.duo_id = duo.id
      WHERE duo.id = $1
      LIMIT 1
    `,
    [duoId]
  );

  return result.rows[0]?.audio_enabled ?? true;
}

async function readActiveRound(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<RouletteRoundRecord | null> {
  const result = await client.query<RoundRow>(
    `
      SELECT *
      FROM app.roulette_rounds
      WHERE duo_id = $1
        AND status IN ('active', 'revealing', 'pending_invitation')
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [duoId]
  );

  return result.rows[0] ? mapRoundRow(result.rows[0]) : null;
}

async function readRoundById(
  client: QueueDbClient,
  duoId: RouletteDuoId,
  roundId: RouletteRoundId
): Promise<RouletteRoundRecord | null> {
  const result = await client.query<RoundRow>(
    `
      SELECT *
      FROM app.roulette_rounds
      WHERE duo_id = $1
        AND id = $2
      LIMIT 1
    `,
    [duoId, roundId]
  );

  return result.rows[0] ? mapRoundRow(result.rows[0]) : null;
}

async function readRoundEntries(
  client: QueueDbClient,
  duoId: RouletteDuoId,
  roundId: RouletteRoundId
): Promise<RouletteRoundEntryRecord[]> {
  const result = await client.query<RoundEntryRow>(
    `
      SELECT *
      FROM app.roulette_round_entries
      WHERE duo_id = $1
        AND round_id = $2
      ORDER BY slot_index
    `,
    [duoId, roundId]
  );

  return result.rows.map(mapRoundEntryRow);
}

async function lockBoostBalance(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<RouletteBoostBalanceRecord> {
  await client.query(
    `
      INSERT INTO app.roulette_boost_balances (duo_id, balance, cap)
      VALUES ($1, 0, 600)
      ON CONFLICT (duo_id) DO NOTHING
    `,
    [duoId]
  );

  const result = await client.query<BoostBalanceRow>(
    `
      SELECT duo_id, balance, cap, updated_at
      FROM app.roulette_boost_balances
      WHERE duo_id = $1
      FOR UPDATE
    `,
    [duoId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("roulette_boost_balance_missing_after_upsert");
  }

  return {
    balance: Number(row.balance),
    cap: Number(row.cap),
    duoId: row.duo_id,
    updatedAt: row.updated_at
  };
}

async function lockPityState(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<RoulettePityStateRecord> {
  await client.query(
    `
      INSERT INTO app.roulette_pity_state (duo_id, draws_since_epic_or_higher)
      VALUES ($1, 0)
      ON CONFLICT (duo_id) DO NOTHING
    `,
    [duoId]
  );

  const result = await client.query<PityStateRow>(
    `
      SELECT duo_id, draws_since_epic_or_higher, last_epic_or_higher_at, updated_at
      FROM app.roulette_pity_state
      WHERE duo_id = $1
      FOR UPDATE
    `,
    [duoId]
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("roulette_pity_state_missing_after_upsert");
  }

  return {
    drawsSinceEpicOrHigher: Number(row.draws_since_epic_or_higher),
    duoId: row.duo_id,
    lastEpicOrHigherAt: row.last_epic_or_higher_at,
    updatedAt: row.updated_at
  };
}

async function readCooldowns(
  client: QueueDbClient,
  duoId: RouletteDuoId
): Promise<RouletteCooldownRecord[]> {
  const result = await client.query<CooldownRow>(
    `
      SELECT
        duo_id,
        library_game_id,
        round_id,
        remaining_rounds,
        weight_multiplier,
        updated_at
      FROM app.roulette_cooldowns
      WHERE duo_id = $1
        AND remaining_rounds > 0
      ORDER BY updated_at DESC
    `,
    [duoId]
  );

  return result.rows.map((row) => ({
    duoId: row.duo_id,
    libraryGameId: row.library_game_id,
    remainingRounds: Number(row.remaining_rounds),
    roundId: row.round_id,
    updatedAt: row.updated_at,
    weightMultiplier: Number(row.weight_multiplier)
  }));
}

async function readHistory(
  client: QueueDbClient,
  duoId: RouletteDuoId,
  limit: number
): Promise<RouletteHistoryEventRecord[]> {
  const result = await client.query<HistoryEventRow>(
    `
      SELECT *
      FROM app.roulette_history_events
      WHERE duo_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [duoId, limit]
  );

  return result.rows.map(mapHistoryEventRow);
}

function mapRoundRow(row: RoundRow): RouletteRoundRecord {
  return {
    boostLedgerId: row.boost_ledger_id,
    boostSpent: row.boost_spent,
    createdAt: row.created_at,
    duoId: row.duo_id,
    id: row.id,
    idempotencyKey: row.idempotency_key,
    metadata: normalizeMetadata(row.metadata),
    pityAfter: Number(row.pity_after),
    pityBefore: Number(row.pity_before),
    resultCatalogGameId: row.result_catalog_game_id,
    resultLibraryGameId: row.result_library_game_id,
    resultRarity: row.result_rarity,
    revealedAt: row.revealed_at,
    resolvedAt: row.resolved_at,
    resolvedByUserId: row.resolved_by_user_id,
    selectedAt: row.selected_at,
    selectedByUserId: row.selected_by_user_id,
    status: row.status,
    updatedAt: row.updated_at,
    weekendMultiplierApplied: row.weekend_multiplier_applied
  };
}

function mapRoundEntryRow(row: RoundEntryRow): RouletteRoundEntryRecord {
  return {
    catalogGameId: row.catalog_game_id,
    coverUrlSnapshot: row.cover_url_snapshot,
    createdAt: row.created_at,
    duoId: row.duo_id,
    id: row.id,
    libraryGameId: row.library_game_id,
    metadata: normalizeMetadata(row.metadata),
    rarity: row.rarity,
    roundId: row.round_id,
    selectedSlot: row.selected_slot,
    slotIndex: Number(row.slot_index),
    titleSnapshot: row.title_snapshot
  };
}

function mapHistoryEventRow(row: HistoryEventRow): RouletteHistoryEventRecord {
  return {
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    duoId: row.duo_id,
    eventKey: row.event_key,
    eventType: row.event_type,
    id: row.id,
    metadata: normalizeMetadata(row.metadata),
    roundId: row.round_id
  };
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function pendingPlan0603(methodName: string): Promise<never> {
  throw new Error(`roulette_repository_${methodName}_pending_06_03`);
}

function getRuntimePool(): QueueDbPool {
  runtimePool ??= createRuntimePool();
  return runtimePool;
}

function getDefaultRouletteRepository(): RouletteRepository {
  defaultRouletteRepository ??= createRouletteRepository(getRuntimePool());
  return defaultRouletteRepository;
}
