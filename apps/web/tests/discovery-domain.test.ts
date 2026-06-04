import { describe, expect, it } from "vitest";

import {
  canCreateDiscoveryMatch,
  evaluateDiscoveryDecision,
  getDiscoveryLibraryHandoffPolicy,
  NOT_NOW_COOLDOWN_DAYS,
  shouldExcludeFromCurrentDeck
} from "../src/modules/discovery/domain/discovery-policy";
import {
  mergeDuoMoodAnswers
} from "../src/modules/discovery/domain/mood-quiz";
import {
  evaluateCollaborativeInfluence,
  normalizeRecommendationFilters,
  rankDiscoveryRecommendations,
  type DiscoveryRecommendationGameFacts
} from "../src/modules/discovery/domain/recommendation-policy";

describe("discovery decision policy", () => {
  it("creates a match only when both duo members want the same game", () => {
    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "want"
      })
    ).toEqual({ ok: true });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "skip"
      })
    ).toEqual({ ok: false, reason: "partner-has-not-wanted" });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "not_now",
        partnerDecision: "want"
      })
    ).toEqual({ ok: false, reason: "actor-did-not-want" });
  });

  it("blocks duplicate matches and same-member approvals", () => {
    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-2",
        actorDecision: "want",
        partnerDecision: "want",
        existingMatch: true
      })
    ).toEqual({ ok: false, reason: "already-matched" });

    expect(
      canCreateDiscoveryMatch({
        actorUserId: "member-1",
        partnerUserId: "member-1",
        actorDecision: "want",
        partnerDecision: "want"
      })
    ).toEqual({ ok: false, reason: "same-member" });
  });

  it("returns cooldown and negative recommendation signal for Agora nao", () => {
    const decidedAt = new Date("2026-06-04T12:00:00.000Z");
    const effect = evaluateDiscoveryDecision({
      decision: "not_now",
      decidedAt
    });

    expect(effect).toMatchObject({
      decision: "not_now",
      preferenceWeight: -2,
      countsAsApproval: false,
      countsAsNegativeSignal: true,
      removesCurrentCard: true
    });
    expect(effect.cooldownUntil).toEqual(
      new Date("2026-06-18T12:00:00.000Z")
    );
    expect(NOT_NOW_COOLDOWN_DAYS).toBe(14);
  });

  it("keeps Pular free of preference weight and match impact", () => {
    const effect = evaluateDiscoveryDecision({ decision: "skip" });

    expect(effect).toMatchObject({
      decision: "skip",
      cooldownUntil: null,
      preferenceWeight: 0,
      countsAsApproval: false,
      countsAsNegativeSignal: false,
      removesCurrentCard: true
    });
  });

  it("excludes current cards according to durable decision and cooldown semantics", () => {
    const now = new Date("2026-06-04T12:00:00.000Z");

    expect(shouldExcludeFromCurrentDeck({ decision: null, now })).toBe(false);
    expect(shouldExcludeFromCurrentDeck({ decision: "want", now })).toBe(true);
    expect(shouldExcludeFromCurrentDeck({ decision: "skip", now })).toBe(true);
    expect(
      shouldExcludeFromCurrentDeck({
        decision: "not_now",
        cooldownUntil: new Date("2026-06-05T12:00:00.000Z"),
        now
      })
    ).toBe(true);
    expect(
      shouldExcludeFromCurrentDeck({
        decision: "not_now",
        cooldownUntil: new Date("2026-06-03T12:00:00.000Z"),
        now
      })
    ).toBe(false);
  });

  it("allows discovered games to move only to Phase 3 library handoff statuses", () => {
    expect(getDiscoveryLibraryHandoffPolicy("wishlist")).toEqual({
      ok: true,
      status: "wishlist"
    });
    expect(getDiscoveryLibraryHandoffPolicy("jogando")).toEqual({
      ok: true,
      status: "jogando"
    });
    expect(getDiscoveryLibraryHandoffPolicy("pausado")).toEqual({
      ok: true,
      status: "pausado"
    });
    expect(getDiscoveryLibraryHandoffPolicy("zerado")).toEqual({
      ok: false,
      reason: "future-confirmation-required"
    });
    expect(getDiscoveryLibraryHandoffPolicy("dropado")).toEqual({
      ok: false,
      reason: "future-confirmation-required"
    });
    expect(getDiscoveryLibraryHandoffPolicy("favorito")).toEqual({
      ok: false,
      reason: "invalid-status"
    });
  });
});

describe("discovery mood quiz policy", () => {
  it("treats one-member answers as preview only", () => {
    expect(
      mergeDuoMoodAnswers({
        first: {
          energy: "low",
          commitment: "short",
          vibe: "laugh"
        }
      })
    ).toEqual({
      kind: "preview",
      answeredMembers: 1,
      recommendationMode: "preview-only",
      mood: {
        energy: "low",
        commitment: "short",
        vibe: "laugh",
        conflictResolution: "none"
      }
    });
  });

  it("merges conflicting duo answers into middle-ground and flexible mood", () => {
    expect(
      mergeDuoMoodAnswers({
        first: {
          energy: "low",
          commitment: "short",
          vibe: "laugh"
        },
        second: {
          energy: "high",
          commitment: "epic",
          vibe: "focus"
        }
      })
    ).toEqual({
      kind: "duo",
      answeredMembers: 2,
      recommendationMode: "full-duo",
      mood: {
        energy: "medium",
        commitment: "steady",
        vibe: "flexible",
        conflictResolution: "flexible"
      }
    });
  });
});

describe("discovery recommendation policy", () => {
  it("enables common-platform filtering by default and allows intentional opt-out", () => {
    const games = [
      recommendationGame({
        catalogGameId: "pc-game",
        title: "PC Game",
        platforms: ["pc"]
      }),
      recommendationGame({
        catalogGameId: "xbox-game",
        title: "Xbox Game",
        platforms: ["xbox"]
      })
    ];

    expect(
      rankDiscoveryRecommendations({
        games,
        memberPlatforms: {
          first: ["pc"],
          second: ["pc"]
        }
      }).recommendations.map((game) => game.catalogGameId)
    ).toEqual(["pc-game"]);
    expect(
      rankDiscoveryRecommendations({
        games,
        memberPlatforms: {
          first: ["pc"],
          second: ["pc"]
        },
        filters: {
          commonPlatformOnly: false
        }
      }).recommendations.map((game) => ({
        id: game.catalogGameId,
        reasons: game.reasons
      }))
    ).toEqual([
      {
        id: "pc-game",
        reasons: expect.arrayContaining(["PC em comum"])
      },
      {
        id: "xbox-game",
        reasons: expect.arrayContaining(["sem plataforma em comum"])
      }
    ]);
  });

  it("applies time, availability, coop, mood, year, genre and rarity filters", () => {
    const mood = mergeDuoMoodAnswers({
      first: {
        energy: "medium",
        commitment: "steady",
        vibe: "think"
      },
      second: {
        energy: "medium",
        commitment: "steady",
        vibe: "think"
      }
    });

    if (mood.kind !== "duo") {
      throw new Error("expected full duo mood");
    }

    const result = rankDiscoveryRecommendations({
      games: [
        recommendationGame({
          catalogGameId: "filtered-in",
          title: "Filtered In",
          estimatedMinutes: 360,
          availability: [
            {
              type: "game-pass",
              platformKey: "pc",
              status: "available"
            }
          ],
          coopTypes: ["campaign"],
          moodTags: ["energy-medium", "commitment-steady", "vibe-think"],
          releaseYear: 2022,
          genres: ["puzzle"],
          rarity: "rare"
        }),
        recommendationGame({
          catalogGameId: "too-long",
          title: "Too Long",
          estimatedMinutes: 1200
        })
      ],
      memberPlatforms: {
        first: ["pc"],
        second: ["pc"]
      },
      filters: {
        maxEstimatedMinutes: 480,
        availability: "game-pass",
        coopTypes: ["campaign"],
        mood: mood.mood,
        yearFrom: 2020,
        yearTo: 2024,
        genres: ["puzzle"],
        rarity: ["rare"]
      }
    });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      catalogGameId: "filtered-in",
      reasons: expect.arrayContaining([
        "PC em comum",
        "campanha 2p",
        "curto para hoje",
        "Game Pass verificado",
        "meio-termo da dupla"
      ])
    });
  });

  it("prefers flexible games when mood answers conflict", () => {
    const mood = mergeDuoMoodAnswers({
      first: {
        energy: "low",
        commitment: "short",
        vibe: "laugh"
      },
      second: {
        energy: "high",
        commitment: "epic",
        vibe: "focus"
      }
    });

    if (mood.kind !== "duo") {
      throw new Error("expected full duo mood");
    }

    const result = rankDiscoveryRecommendations({
      games: [
        recommendationGame({
          catalogGameId: "flexible",
          title: "Flexible",
          moodTags: ["energy-medium", "commitment-steady", "vibe-flexible"]
        }),
        recommendationGame({
          catalogGameId: "intense",
          title: "Intense",
          moodTags: ["energy-high", "commitment-epic", "vibe-focus"]
        })
      ],
      memberPlatforms: {
        first: ["pc"],
        second: ["pc"]
      },
      filters: {
        mood: mood.mood
      }
    });

    expect(result.recommendations.map((game) => game.catalogGameId)).toEqual([
      "flexible"
    ]);
    expect(result.recommendations[0]?.reasons).toContain("vibe flexivel");
  });

  it("keeps collaborative influence disabled below minimum data thresholds", () => {
    expect(
      evaluateCollaborativeInfluence({
        currentDuoDecisionCount: 19,
        crossDuoPositiveDecisionCount: 100
      })
    ).toMatchObject({
      enabled: false,
      weight: 0,
      reason: "threshold-not-met"
    });
    expect(
      evaluateCollaborativeInfluence({
        currentDuoDecisionCount: 20,
        crossDuoPositiveDecisionCount: 100
      })
    ).toMatchObject({
      enabled: true,
      weight: 0.1,
      reason: "threshold-met"
    });
  });

  it("returns compact human-readable recommendation reasons, not percentages", () => {
    const result = rankDiscoveryRecommendations({
      games: [
        recommendationGame({
          catalogGameId: "reasoned",
          title: "Reasoned",
          genres: ["puzzle"],
          tags: ["cozy"],
          rarity: "epic"
        })
      ],
      memberPlatforms: {
        first: ["pc"],
        second: ["pc"]
      },
      positiveGenres: ["puzzle"],
      positiveTags: ["cozy"]
    });

    expect(result.recommendations[0]?.reasons).toEqual([
      "campanha 2p",
      "PC em comum",
      "curto para hoje",
      "puzzle que voces costumam curtir",
      "epico QUEUE/2"
    ]);
    expect(JSON.stringify(result.recommendations)).not.toMatch(/\d+%/);
  });

  it("validates bounded filter inputs before ranking", () => {
    expect(
      normalizeRecommendationFilters({
        maxEstimatedMinutes: -1,
        yearFrom: 2026,
        yearTo: 2020
      })
    ).toEqual({
      ok: false,
      errors: ["invalid-max-estimated-minutes", "invalid-year-range"]
    });
  });
});

function recommendationGame(
  overrides: Partial<DiscoveryRecommendationGameFacts> = {}
): DiscoveryRecommendationGameFacts {
  return {
    catalogGameId: "game",
    title: "Game",
    mainFlowEligible: true,
    coopCampaignConfirmed: true,
    platforms: ["pc"],
    estimatedMinutes: 360,
    availability: [],
    coopTypes: ["campaign"],
    moodTags: [],
    releaseYear: 2022,
    genres: ["action"],
    tags: [],
    rarity: "common",
    ...overrides
  };
}
