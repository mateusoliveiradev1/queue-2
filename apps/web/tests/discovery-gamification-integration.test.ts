import { describe, expect, it, vi } from "vitest";

import { recordDiscoveryDecisionUseCase } from "../src/modules/discovery/application/record-discovery-decision";
import type {
  DiscoveryGamificationEffect,
  DiscoveryMatchRecord,
  DiscoveryRepository,
  RecordDiscoveryDecisionResult
} from "../src/modules/discovery/application/ports";

const now = new Date("2026-06-06T15:00:00.000Z");

describe("Discovery matches trigger gamification", () => {
  it("applies a discovery-match fact without recurring XP", async () => {
    const match = matchRecord();
    const applyMatchFact = vi.fn(async (): Promise<DiscoveryGamificationEffect> => ({
      ok: true,
      reward: rewardSummary()
    }));
    const repository = {
      recordDecision: vi.fn(async () => matchCreatedResult(match))
    } as unknown as Pick<DiscoveryRepository, "recordDecision">;

    await expect(
      recordDiscoveryDecisionUseCase(
        {
          userId: "member-2",
          catalogGameId: "game-1",
          decision: "want",
          sourceMode: "deck"
        },
        repository,
        { applyMatchFact }
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        gamification: {
          ok: true,
          reward: expect.objectContaining({
            totalXpAwarded: 0,
            xpAwards: []
          })
        }
      })
    );
    expect(applyMatchFact).toHaveBeenCalledWith({
      userId: "member-2",
      match
    });
  });

  it("does not reapply gamification for an already matched game", async () => {
    const applyMatchFact = vi.fn();
    const repository = {
      recordDecision: vi.fn(async () => alreadyMatchedResult(matchRecord()))
    } as unknown as Pick<DiscoveryRepository, "recordDecision">;

    await expect(
      recordDiscoveryDecisionUseCase(
        {
          userId: "member-2",
          catalogGameId: "game-1",
          decision: "want",
          sourceMode: "deck"
        },
        repository,
        { applyMatchFact }
      )
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        state: expect.objectContaining({ kind: "already-matched" })
      })
    );
    expect(applyMatchFact).not.toHaveBeenCalled();
  });
});

function matchCreatedResult(match: DiscoveryMatchRecord): RecordDiscoveryDecisionResult {
  return {
    ok: true,
    state: {
      kind: "match-created",
      catalogGameId: match.catalogGameId,
      match
    },
    decision: {
      duoId: match.duoId,
      userId: "member-2",
      catalogGameId: match.catalogGameId,
      decision: "want",
      sourceMode: "deck",
      decidedAt: now,
      cooldownUntil: null,
      preferenceWeight: 2
    },
    effect: {
      decision: "want",
      cooldownUntil: null,
      preferenceWeight: 2,
      countsAsApproval: true,
      countsAsNegativeSignal: false,
      removesCurrentCard: true
    },
    matchPolicy: {
      ok: true
    },
    match
  };
}

function alreadyMatchedResult(match: DiscoveryMatchRecord): RecordDiscoveryDecisionResult {
  return {
    ok: true,
    state: {
      kind: "already-matched",
      catalogGameId: match.catalogGameId,
      match
    },
    decision: {
      duoId: match.duoId,
      userId: "member-2",
      catalogGameId: match.catalogGameId,
      decision: "want",
      sourceMode: "deck",
      decidedAt: now,
      cooldownUntil: null,
      preferenceWeight: 2
    },
    effect: {
      decision: "want",
      cooldownUntil: null,
      preferenceWeight: 2,
      countsAsApproval: true,
      countsAsNegativeSignal: false,
      removesCurrentCard: true
    },
    matchPolicy: {
      ok: true
    },
    match
  };
}

function matchRecord(overrides: Partial<DiscoveryMatchRecord> = {}): DiscoveryMatchRecord {
  return {
    id: "00000000-0000-4000-8000-000000000501",
    duoId: "duo-1",
    catalogGameId: "game-1",
    matchedAt: now,
    createdFrom: "deck",
    firstUserId: "member-1",
    secondUserId: "member-2",
    reasonSnapshot: ["Ambos querem jogar"],
    libraryHandoffStatus: null,
    ...overrides
  };
}

function rewardSummary() {
  const level = { level: 1, name: "Lv1 Casuais", xpRequired: 0 };

  return {
    totalXpAwarded: 0,
    xpAwards: [],
    levelUp: null,
    achievements: [
      {
        slug: "radar-ligado",
        title: "Radar ligado",
        rarity: "common" as const,
        unlockedAt: now
      }
    ],
    questProgress: [],
    streak: null,
    projection: {
      duoId: "duo-1",
      xp: 0,
      level,
      streak: 0,
      availableFreezes: 0,
      updatedAt: now
    },
    skippedXpReason: "source-does-not-award-xp" as const
  };
}
