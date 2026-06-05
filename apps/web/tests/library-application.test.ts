import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import {
  getLibraryGameStatusesUseCase
} from "../src/modules/library/application/get-library-game-statuses";
import {
  getLibraryQueueUseCase
} from "../src/modules/library/application/get-library-queue";
import type {
  LibraryGameDetailRecord,
  LibraryGameRecord,
  LibraryQueueRecord,
  LibraryRepository
} from "../src/modules/library/application/ports";
import { createLibraryRepository } from "../src/modules/library/infrastructure/library-repository";

type QueryCall = {
  sql: string;
  values: unknown[];
};

describe("library queue use case", () => {
  it("deduplicates catalog ids before reading current library statuses", async () => {
    const getLibraryGameStatuses = vi.fn(async () => ({
      "game-1": "wishlist" as const
    }));
    const repository = createRepository({ getLibraryGameStatuses });

    await expect(
      getLibraryGameStatusesUseCase(
        {
          userId: "user-1",
          catalogGameIds: ["game-1", " game-1 ", "", "game-2"]
        },
        repository
      )
    ).resolves.toEqual({
      ok: true,
      statuses: {
        "game-1": "wishlist"
      }
    });

    expect(getLibraryGameStatuses).toHaveBeenCalledWith({
      userId: "user-1",
      catalogGameIds: ["game-1", "game-2"]
    });
  });

  it("normalizes raw route-like inputs before calling the repository", async () => {
    const getQueue = vi.fn(async (input) => queueRecord(input.limit, input.offset));
    const repository = createRepository({ getQueue });

    await expect(
      getLibraryQueueUseCase(
        {
          userId: "user-1",
          view: "misterio",
          query: "  Portal  ",
          commonPlatformOnly: "true",
          platform: "PS5",
          sort: "raridade",
          page: "3",
          limit: "24",
          offset: "999"
        },
        repository
      )
    ).resolves.toMatchObject({ ok: true });

    expect(getQueue).toHaveBeenCalledWith({
      userId: "user-1",
      view: "todas",
      statuses: ["wishlist", "jogando", "pausado"],
      query: "Portal",
      commonPlatformOnly: true,
      platform: "playstation",
      sort: "recentes",
      limit: 24,
      offset: 48
    });
  });

  it("keeps Todas as the active queue without archived statuses", async () => {
    const getQueue = vi.fn(async (input) => queueRecord(input.limit, input.offset));
    const repository = createRepository({ getQueue });

    await getLibraryQueueUseCase(
      {
        userId: "user-1",
        view: "todas",
        query: null,
        commonPlatformOnly: false,
        platform: null,
        sort: "match",
        limit: "13",
        offset: "-8"
      },
      repository
    );

    expect(getQueue.mock.calls[0]?.[0]).toMatchObject({
      view: "todas",
      statuses: ["wishlist", "jogando", "pausado"],
      sort: "match",
      limit: 12,
      offset: 0
    });
    expect(getQueue.mock.calls[0]?.[0].statuses).not.toContain("zerado");
    expect(getQueue.mock.calls[0]?.[0].statuses).not.toContain("dropado");
  });

  it("maps Arquivo to terminal statuses without expanding the active queue", async () => {
    const getQueue = vi.fn(async (input) => queueRecord(input.limit, input.offset));
    const repository = createRepository({ getQueue });

    await getLibraryQueueUseCase(
      {
        userId: "user-1",
        view: "arquivo",
        query: "",
        commonPlatformOnly: false,
        platform: null,
        sort: "nome",
        page: "2",
        limit: "99",
        offset: null
      },
      repository
    );

    expect(getQueue.mock.calls[0]?.[0]).toMatchObject({
      view: "arquivo",
      statuses: ["zerado", "dropado"],
      sort: "nome",
      limit: 24,
      offset: 24
    });
    expect(getQueue.mock.calls[0]?.[0].statuses).not.toContain("wishlist");
    expect(getQueue.mock.calls[0]?.[0].statuses).not.toContain("jogando");
    expect(getQueue.mock.calls[0]?.[0].statuses).not.toContain("pausado");
  });

  it("returns membership-required when the repository cannot resolve a duo", async () => {
    const repository = createRepository({
      getQueue: vi.fn(async () => null)
    });

    await expect(
      getLibraryQueueUseCase(
        {
          userId: "user-without-duo",
          view: "wishlist",
          query: null,
          commonPlatformOnly: false,
          platform: null,
          sort: "recentes",
          limit: "12",
          offset: "0"
        },
        repository
      )
    ).resolves.toEqual({ ok: false, reason: "membership-required" });
  });
});

describe("library repository performance", () => {
  it("hydrates all queue sections with one catalog fact batch", async () => {
    const { pool, calls } = fakeLibraryQueuePool();
    const repository = createLibraryRepository(pool);

    const result = await repository.getQueue({
      userId: "user-1",
      view: "todas",
      statuses: ["wishlist", "jogando", "pausado"],
      query: null,
      commonPlatformOnly: false,
      platform: null,
      sort: "match",
      limit: 12,
      offset: 0
    });

    expect(result).toMatchObject({
      nextQueue: [
        { catalogGame: { id: "game-next" } },
        { catalogGame: { id: "game-playing" } }
      ],
      playing: [{ catalogGame: { id: "game-playing" } }],
      page: {
        items: [
          { catalogGame: { id: "game-next" } },
          { catalogGame: { id: "game-page" } }
        ]
      }
    });

    const catalogFactCalls = calls.filter(
      (call) =>
        call.sql.includes("FROM catalog.games AS game") &&
        call.sql.includes("game.id = ANY($1::uuid[])")
    );
    const platformCalls = calls.filter(
      (call) =>
        call.sql.includes("SELECT game_id, platform_key") &&
        call.sql.includes("FROM catalog.game_platforms") &&
        call.sql.includes("game_id = ANY($1::uuid[])")
    );

    expect(catalogFactCalls).toHaveLength(1);
    expect(platformCalls).toHaveLength(1);
    expect(catalogFactCalls[0]?.values[0]).toEqual([
      "game-next",
      "game-playing",
      "game-page"
    ]);
    expect(platformCalls[0]?.values[0]).toEqual([
      "game-next",
      "game-playing",
      "game-page"
    ]);
  });
});

function fakeLibraryQueuePool(): { pool: QueueDbPool; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }

      if (sql.includes("set_config('queue2.user_id'")) {
        return { rows: [] };
      }

      if (sql.includes("FROM app.duo_members") && sql.includes("LIMIT 1")) {
        return { rows: [{ duo_id: "duo-1" }] };
      }

      if (sql.includes("LEFT JOIN app.member_platforms")) {
        return {
          rows: [
            { user_id: "user-1", platform: "pc" },
            { user_id: "user-1", platform: "switch" },
            { user_id: "user-2", platform: "pc" }
          ]
        };
      }

      if (sql.includes("SELECT status, count(*) AS count")) {
        return {
          rows: [
            { status: "wishlist", count: "2" },
            { status: "jogando", count: "1" },
            { status: "pausado", count: "1" }
          ]
        };
      }

      if (sql.includes("SELECT count(*) AS count") && sql.includes("AS library_game")) {
        return { rows: [{ count: "2" }] };
      }

      if (sql.includes("SELECT count(*) AS count")) {
        return { rows: [{ count: "0" }] };
      }

      if (
        sql.includes("FROM app.duo_library_games AS library_game") &&
        sql.includes("SELECT") &&
        sql.includes("library_game.id")
      ) {
        const statuses = values[1] as string[];
        const limit = values[4] as number;

        if (statuses.length === 1 && statuses[0] === "jogando") {
          return { rows: [libraryRow("library-playing", "game-playing", "jogando")] };
        }

        if (limit === 4) {
          return {
            rows: [
              libraryRow("library-next", "game-next", "wishlist"),
              libraryRow("library-playing", "game-playing", "jogando")
            ]
          };
        }

        return {
          rows: [
            libraryRow("library-next", "game-next", "wishlist"),
            libraryRow("library-page", "game-page", "pausado")
          ]
        };
      }

      if (
        sql.includes("FROM catalog.games AS game") &&
        sql.includes("game.id = ANY($1::uuid[])")
      ) {
        return {
          rows: (values[0] as string[]).map((id) => ({
            id,
            slug: id,
            name: labelForCatalogGame(id),
            background_image_url: `https://media.rawg.io/media/games/${id}.jpg`,
            main_flow_eligible: true,
            coop_campaign_confirmed: true,
            has_reliable_time_estimate: true,
            has_verified_availability: id !== "game-page"
          }))
        };
      }

      if (
        sql.includes("SELECT game_id, platform_key") &&
        sql.includes("FROM catalog.game_platforms")
      ) {
        return {
          rows: (values[0] as string[]).map((game_id) => ({
            game_id,
            platform_key: "pc"
          }))
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

function createRepository(overrides: Partial<LibraryRepository> = {}): LibraryRepository {
  const game = libraryGame();

  return {
    getOverview: async () => null,
    getQueue: async () => queueRecord(12, 0),
    updateMemberPlatforms: async (input) => ({ ok: true, platforms: input.platforms }),
    addGameToWishlist: async () => ({ ok: true, game }),
    getJogandoCount: async () => 0,
    getLibraryGame: async () => game,
    getLibraryGameStatuses: async () => ({}),
    moveLibraryGame: async (input) => ({
      ok: true,
      game: {
        ...game,
        status: input.status
      }
    }),
    getGameDetail: async () => detailRecord("wishlist"),
    ...overrides
  };
}

function queueRecord(limit: 12 | 24, offset: number): LibraryQueueRecord {
  return {
    memberPlatforms: [
      { userId: "user-1", platforms: ["pc", "switch"] },
      { userId: "user-2", platforms: ["pc", "xbox"] }
    ],
    commonPlatforms: ["pc"],
    statusCounts: {
      wishlist: 2,
      jogando: 1,
      pausado: 1
    },
    archiveCount: 0,
    nextQueue: [detailRecord("wishlist")],
    playing: [detailRecord("jogando")],
    page: {
      items: [detailRecord("wishlist")],
      total: 4,
      limit,
      offset,
      hasNextPage: offset + limit < 4,
      hasPreviousPage: offset > 0
    }
  };
}

function detailRecord(status: "wishlist" | "jogando" | "pausado"): LibraryGameDetailRecord {
  return {
    libraryGame: {
      ...libraryGame(),
      status
    },
    catalogGame: {
      id: "game-1",
      slug: "it-takes-two",
      name: "It Takes Two",
      coverUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
      platforms: ["pc", "xbox"],
      mainFlowEligible: true,
      coopCampaignConfirmed: true,
      hasReliableTimeEstimate: true,
      hasVerifiedAvailability: false
    },
    memberPlatforms: [
      { userId: "user-1", platforms: ["pc", "switch"] },
      { userId: "user-2", platforms: ["pc", "xbox"] }
    ],
    matchScore: {
      label: "Forte",
      recommendedForMainFlow: true,
      commonPlatforms: ["pc"],
      factors: [
        "coop campanha 2p confirmado",
        "plataforma em comum: PC",
        "tempo estimado com fonte",
        "disponibilidade nao verificada"
      ]
    }
  };
}

function libraryGame(): LibraryGameRecord {
  return {
    id: "library-1",
    duoId: "duo-1",
    catalogGameId: "game-1",
    status: "wishlist",
    addedByUserId: "user-1",
    statusUpdatedByUserId: "user-1",
    createdAt: new Date("2026-06-03T12:00:00.000Z"),
    updatedAt: new Date("2026-06-03T12:00:00.000Z")
  };
}

function libraryRow(
  id: string,
  catalogGameId: string,
  status: "wishlist" | "jogando" | "pausado"
) {
  return {
    id,
    duo_id: "duo-1",
    catalog_game_id: catalogGameId,
    status,
    added_by_user_id: "user-1",
    status_updated_by_user_id: "user-1",
    created_at: new Date("2026-06-03T12:00:00.000Z"),
    updated_at: new Date("2026-06-03T12:00:00.000Z")
  };
}

function labelForCatalogGame(id: string): string {
  if (id === "game-next") {
    return "Next Game";
  }

  if (id === "game-playing") {
    return "Playing Game";
  }

  return "Page Game";
}
