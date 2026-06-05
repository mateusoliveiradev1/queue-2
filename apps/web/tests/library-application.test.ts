import { describe, expect, it, vi } from "vitest";

import {
  getLibraryQueueUseCase
} from "../src/modules/library/application/get-library-queue";
import type {
  LibraryGameDetailRecord,
  LibraryGameRecord,
  LibraryQueueRecord,
  LibraryRepository
} from "../src/modules/library/application/ports";

describe("library queue use case", () => {
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

function createRepository(overrides: Partial<LibraryRepository> = {}): LibraryRepository {
  const game = libraryGame();

  return {
    getOverview: async () => null,
    getQueue: async () => queueRecord(12, 0),
    updateMemberPlatforms: async (input) => ({ ok: true, platforms: input.platforms }),
    addGameToWishlist: async () => ({ ok: true, game }),
    getJogandoCount: async () => 0,
    getLibraryGame: async () => game,
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
