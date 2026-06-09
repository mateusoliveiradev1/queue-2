import "server-only";

import {
  createRuntimePool,
  withAppUserTransaction,
  type QueueDbClient,
  type QueueDbPool
} from "@queue/db";

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
    readEligiblePool: () => pendingPlan0603("readEligiblePool"),
    readActiveRound: () => pendingPlan0603("readActiveRound"),
    readRoundById: () => pendingPlan0603("readRoundById"),
    readRoundByIdempotencyKey: () => pendingPlan0603("readRoundByIdempotencyKey"),
    readRoundEntries: () => pendingPlan0603("readRoundEntries"),
    lockBoostBalance: () => pendingPlan0603("lockBoostBalance"),
    materializeBoostFromXp: () => pendingPlan0603("materializeBoostFromXp"),
    insertBoostLedgerEntry: () => pendingPlan0603("insertBoostLedgerEntry"),
    updateBoostBalance: () => pendingPlan0603("updateBoostBalance"),
    lockPityState: () => pendingPlan0603("lockPityState"),
    updatePityState: () => pendingPlan0603("updatePityState"),
    readCooldowns: () => pendingPlan0603("readCooldowns"),
    upsertCooldown: () => pendingPlan0603("upsertCooldown"),
    decrementCooldowns: () => pendingPlan0603("decrementCooldowns"),
    persistRound: () => pendingPlan0603("persistRound"),
    persistRoundEntries: () => pendingPlan0603("persistRoundEntries"),
    markRoundRevealed: () => pendingPlan0603("markRoundRevealed"),
    recordReplay: () => pendingPlan0603("recordReplay"),
    lockRoundResult: () => pendingPlan0603("lockRoundResult"),
    discardRoundResult: () => pendingPlan0603("discardRoundResult"),
    insertHistoryEvent: () => pendingPlan0603("insertHistoryEvent"),
    readHistory: () => pendingPlan0603("readHistory")
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

  return pendingPlan0603("getRouletteState");
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

  return pendingPlan0603("replayRouletteRound");
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
