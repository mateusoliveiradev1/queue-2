import { readFileSync } from "node:fs";

import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import {
  assignRoleForActivation,
  type ActivePlayGame
} from "../src/modules/play";
import type {
  ActivePlayGameRecord,
  PlayMembershipContext,
  PlayRepository,
  PlayRepositoryTransaction
} from "../src/modules/play/application/ports";
import { createPlayRepository } from "../src/modules/play/infrastructure/play-repository";

const playRepositorySource = readFileSync(
  "src/modules/play/infrastructure/play-repository.ts",
  "utf8"
);
const playPublicIndexSource = readFileSync("src/modules/play/index.ts", "utf8");

describe("play application contract", () => {
  it("activates the first game through repository transaction ports as Principal", async () => {
    const upsertActiveRoleRows = vi.fn<PlayRepositoryTransaction["upsertActiveRoleRows"]>(async (input) =>
      input.games.map((game, index) =>
        activeRecord({
          id: `active-${index}`,
          libraryGameId: game.libraryGameId,
          role: game.role,
          position: game.position
        })
      )
    );
    const repository = fakePlayRepository({
      activeGames: [],
      upsertActiveRoleRows
    });

    await expect(
      activateGameWithPolicy({
        userId: "member-1",
        libraryGameId: "library-1",
        repository
      })
    ).resolves.toEqual({
      ok: true,
      activeGames: [
        expect.objectContaining({
          libraryGameId: "library-1",
          role: "principal",
          position: 1
        })
      ]
    });
    expect(upsertActiveRoleRows).toHaveBeenCalledWith({
      duoId: "duo-1",
      actorUserId: "member-1",
      games: [
        {
          libraryGameId: "library-1",
          role: "principal",
          position: 1
        }
      ]
    });
  });

  it("returns fourth-playing-game before trying to mutate persistence", async () => {
    const upsertActiveRoleRows = vi.fn();
    const repository = fakePlayRepository({
      activeGames: [
        activeRecord({ id: "a", role: "principal", position: 1 }),
        activeRecord({ id: "b", role: "secondary", position: 2 }),
        activeRecord({ id: "c", role: "secondary", position: 3 })
      ],
      upsertActiveRoleRows
    });

    await expect(
      activateGameWithPolicy({
        userId: "member-1",
        libraryGameId: "library-4",
        repository
      })
    ).resolves.toEqual({
      ok: false,
      reason: "fourth-playing-game"
    });
    expect(upsertActiveRoleRows).not.toHaveBeenCalled();
  });

  it("returns membership-required when no duo context exists", async () => {
    const repository = fakePlayRepository({
      membership: null,
      activeGames: []
    });

    await expect(
      activateGameWithPolicy({
        userId: "member-1",
        libraryGameId: "library-1",
        repository
      })
    ).resolves.toEqual({
      ok: false,
      reason: "membership-required"
    });
  });
});

describe("play repository skeleton", () => {
  it("reads active games inside the app user transaction context", async () => {
    const { pool, calls } = fakePlayReadPool();
    const repository = createPlayRepository(pool);

    await expect(
      repository.readActivePlayGames({
        userId: "member-1"
      })
    ).resolves.toEqual([
      expect.objectContaining({
        id: "active-1",
        duoId: "duo-1",
        libraryGameId: "library-1",
        catalogGameId: "catalog-1",
        role: "principal",
        position: 1
      })
    ]);
    expect(calls.map((call) => call.sql)).toEqual(
      expect.arrayContaining([
        "BEGIN",
        expect.stringContaining("set_config('queue2.user_id'"),
        expect.stringContaining("FROM app.play_active_games AS active"),
        "COMMIT"
      ])
    );
  });

  it("keeps persistence patterns server-only, RLS-scoped and idempotent", () => {
    expect(playRepositorySource).toContain("import \"server-only\"");
    expect(playRepositorySource).toContain("withAppUserTransaction");
    expect(playRepositorySource).toContain("pg_advisory_xact_lock");
    expect(playRepositorySource).toContain("ON CONFLICT (library_game_id) DO UPDATE");
    expect(playRepositorySource).toContain("ON CONFLICT (session_id, user_id) DO NOTHING");
    expect(playRepositorySource).toContain("ON CONFLICT (duo_id, award_key) DO NOTHING");
    expect(playRepositorySource).toContain("FOR UPDATE SKIP LOCKED");
  });

  it("does not expose infrastructure internals through the play public entrypoint", () => {
    expect(playPublicIndexSource).not.toContain("infrastructure");
    expect(playPublicIndexSource).not.toContain("createPlayRepository");
    expect(playPublicIndexSource).not.toContain("playRepository");
  });
});

type ActivationResult =
  | {
      ok: true;
      activeGames: ActivePlayGameRecord[];
    }
  | {
      ok: false;
      reason: "membership-required" | "fourth-playing-game" | "invalid-active-layout";
    };

async function activateGameWithPolicy(input: {
  userId: string;
  libraryGameId: string;
  repository: PlayRepository;
}): Promise<ActivationResult> {
  return input.repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return {
        ok: false,
        reason: "membership-required"
      };
    }

    const current = await transaction.readActivePlayGames({
      duoId: membership.duoId
    });
    const assignment = assignRoleForActivation(current.map(toPolicyActiveGame));

    if (!assignment.ok) {
      return {
        ok: false,
        reason:
          assignment.reason === "fourth-playing-game"
            ? "fourth-playing-game"
            : "invalid-active-layout"
      };
    }

    const activeGames = await transaction.upsertActiveRoleRows({
      duoId: membership.duoId,
      actorUserId: input.userId,
      games: [
        ...current.map((game) => ({
          libraryGameId: game.libraryGameId,
          role: game.role,
          position: game.position
        })),
        {
          libraryGameId: input.libraryGameId,
          role: assignment.value.role,
          position: assignment.value.position
        }
      ]
    });

    return {
      ok: true,
      activeGames
    };
  });
}

function fakePlayRepository(input: {
  membership?: PlayMembershipContext | null;
  activeGames: ActivePlayGameRecord[];
  upsertActiveRoleRows?: PlayRepositoryTransaction["upsertActiveRoleRows"];
}): PlayRepository {
  const membership =
    input.membership === undefined
      ? {
          duoId: "duo-1",
          userId: "member-1",
          partnerUserId: "member-2",
          memberUserIds: ["member-1", "member-2"]
        }
      : input.membership;
  const transaction: PlayRepositoryTransaction = {
    resolveMembership: vi.fn(async () => membership),
    readActivePlayGames: vi.fn(async () => input.activeGames),
    upsertActiveRoleRows:
      input.upsertActiveRoleRows ?? vi.fn(async () => input.activeGames),
    createSession: vi.fn(),
    confirmSession: vi.fn(),
    insertNotificationItem: vi.fn(),
    insertXpAward: vi.fn()
  };

  return {
    withUserTransaction: async (_userId, callback) => callback(transaction),
    resolveMembership: vi.fn(async () => membership),
    readActivePlayGames: vi.fn(async () => input.activeGames),
    upsertActiveRoleRows: vi.fn(async () => input.activeGames),
    createSessionConfirmation: vi.fn(),
    cancelConfirmation: vi.fn(),
    insertNotificationItem: vi.fn(),
    insertXpAward: vi.fn(),
    claimDueReminderJobs: vi.fn()
  };
}

function fakePlayReadPool(): {
  pool: QueueDbPool;
  calls: Array<{ sql: string; values: unknown[] }>;
} {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (sql.includes("set_config('queue2.user_id'")) {
        return { rows: [] };
      }

      if (sql.includes("FROM app.duo_members AS member")) {
        return {
          rows: [
            { duo_id: "duo-1", user_id: "member-1" },
            { duo_id: "duo-1", user_id: "member-2" }
          ]
        };
      }

      if (sql.includes("FROM app.play_active_games AS active")) {
        return {
          rows: [
            {
              id: "active-1",
              duo_id: "duo-1",
              library_game_id: "library-1",
              catalog_game_id: "catalog-1",
              role: "principal",
              position: 1,
              updated_at: new Date("2026-06-05T12:00:00.000Z")
            }
          ]
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const pool = {
    connect: vi.fn(async () => client)
  } as unknown as QueueDbPool;

  return { pool, calls };
}

function activeRecord(overrides: Partial<ActivePlayGameRecord> = {}): ActivePlayGameRecord {
  return {
    id: "active-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "catalog-1",
    role: "principal",
    position: 1,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function toPolicyActiveGame(game: ActivePlayGameRecord): ActivePlayGame {
  return {
    id: game.id,
    role: game.role,
    position: game.position
  };
}
