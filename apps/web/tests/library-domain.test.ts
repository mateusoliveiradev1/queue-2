import { describe, expect, it } from "vitest";

import {
  getLibraryMovePolicy
} from "../src/modules/library/domain/library-policy";
import {
  calculateMatchScore
} from "../src/modules/library/domain/match-score";
import {
  getCommonPlatforms,
  normalizePlatformKey,
  normalizePlatformSet
} from "../src/modules/library/domain/platforms";
import {
  moveLibraryGameUseCase
} from "../src/modules/library/application/move-library-game";
import {
  updateMemberPlatformsUseCase
} from "../src/modules/library/application/update-member-platforms";
import type {
  LibraryGameRecord,
  LibraryRepository
} from "../src/modules/library/application/ports";

describe("library platform policy", () => {
  it("normalizes supported platforms and rejects unknown labels", () => {
    expect(normalizePlatformKey("PC")).toBe("pc");
    expect(normalizePlatformKey("PS5")).toBe("playstation");
    expect(normalizePlatformKey("Nintendo Switch")).toBe("switch");
    expect(normalizePlatformKey("stadia")).toBeNull();
    expect(normalizePlatformSet(["PC", "Steam Deck", "stadia"])).toEqual([
      "pc",
      "steam-deck"
    ]);
  });

  it("calculates common platforms as a pure duo intersection", () => {
    expect(getCommonPlatforms(["pc", "xbox"], ["pc", "switch"])).toEqual(["pc"]);
  });
});

describe("library status policy", () => {
  it("blocks future confirmation statuses during Phase 2", () => {
    expect(
      getLibraryMovePolicy({
        status: "zerado",
        currentJogandoCount: 0
      })
    ).toEqual({
      ok: false,
      reason: "future-confirmation-required",
      status: "zerado"
    });
  });

  it("blocks a fourth Jogando game", () => {
    expect(
      getLibraryMovePolicy({
        status: "jogando",
        currentJogandoCount: 3
      })
    ).toEqual({
      ok: false,
      reason: "jogando-limit-reached"
    });
  });
});

describe("library match score", () => {
  it("uses explainable labels and factors instead of fake percentages", () => {
    const score = calculateMatchScore({
      mainFlowEligible: true,
      coopCampaignConfirmed: true,
      gamePlatforms: ["pc", "xbox"],
      memberPlatforms: {
        first: ["pc", "switch"],
        second: ["pc", "xbox"]
      },
      hasReliableTimeEstimate: false,
      hasVerifiedAvailability: false
    });

    expect(score).toEqual({
      label: "Boa",
      recommendedForMainFlow: true,
      commonPlatforms: ["pc"],
      factors: [
        "coop campanha 2p confirmado",
        "plataforma em comum: PC",
        "tempo sem fonte confiavel",
        "disponibilidade nao verificada"
      ]
    });
    expect(JSON.stringify(score)).not.toMatch(/\d+%/);
  });

  it("blocks recommendation when no common platform exists", () => {
    expect(
      calculateMatchScore({
        mainFlowEligible: true,
        coopCampaignConfirmed: true,
        gamePlatforms: ["xbox"],
        memberPlatforms: {
          first: ["pc"],
          second: ["pc"]
        },
        hasReliableTimeEstimate: true,
        hasVerifiedAvailability: true
      })
    ).toMatchObject({
      label: "Bloqueada",
      recommendedForMainFlow: false,
      factors: expect.arrayContaining(["sem plataforma em comum"])
    });
  });
});

describe("library use cases", () => {
  it("rejects invalid platform input before persistence", async () => {
    const repository = createRepository();

    await expect(
      updateMemberPlatformsUseCase(
        {
          userId: "user-1",
          platforms: ["pc", "unknown-box"]
        },
        repository
      )
    ).resolves.toEqual({ ok: false, reason: "invalid-platform" });
  });

  it("returns future-confirmation result for Zerado and Dropado moves", async () => {
    const repository = createRepository();

    await expect(
      moveLibraryGameUseCase(
        {
          userId: "user-1",
          catalogGameId: "catalog-1",
          status: "dropado"
        },
        repository
      )
    ).resolves.toEqual({
      ok: false,
      reason: "future-confirmation-required",
      status: "dropado"
    });
  });
});

function createRepository(): LibraryRepository {
  const game = libraryGame();

  return {
    getOverview: async () => null,
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
    getGameDetail: async () => null
  };
}

function libraryGame(): LibraryGameRecord {
  return {
    id: "library-1",
    duoId: "duo-1",
    catalogGameId: "catalog-1",
    status: "wishlist",
    addedByUserId: "user-1",
    statusUpdatedByUserId: "user-1",
    createdAt: new Date("2026-06-03T12:00:00.000Z"),
    updatedAt: new Date("2026-06-03T12:00:00.000Z")
  };
}
