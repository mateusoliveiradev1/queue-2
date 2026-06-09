import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rouletteModulePath = "../src/modules/roulette";
const roulettePolicyPath = "src/modules/roulette/domain/roulette-policy.ts";

type RouletteModule = Record<string, unknown>;

describe("roulette domain policy scaffold", () => {
  it("D-01 D-02 D-04 ROUL-01 pulls only Wishlist/Pausado backlog games and blocks pools below 3", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_ELIGIBLE_STATUSES).toEqual(["wishlist", "pausado"]);
    expect(roulette.ROULETTE_EXCLUDED_STATUSES).toEqual([
      "jogando",
      "zerado",
      "dropado"
    ]);
    expect(roulette.ROULETTE_MINIMUM_ELIGIBLE_GAMES).toBe(3);

    const evaluateEligiblePool = getFunction(roulette, "evaluateRouletteEligiblePool");

    expect(
      evaluateEligiblePool({
        games: [
          eligibleGame({ id: "wish-1", status: "wishlist" }),
          eligibleGame({ id: "pause-1", status: "pausado" }),
          eligibleGame({ id: "active-1", status: "jogando" }),
          eligibleGame({ id: "done-1", status: "zerado" }),
          eligibleGame({ id: "drop-1", status: "dropado" })
        ]
      })
    ).toEqual({
      count: 2,
      ctas: ["biblioteca", "descobrir", "catalogo"],
      ok: false,
      reason: "minimum-eligible-pool",
      required: 3
    });
  });

  it("D-03 ROUL-02 creates exactly 60 visual reel slots while keeping one server result authoritative", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_REEL_SLOT_COUNT).toBe(60);

    const buildRouletteReel = getFunction(roulette, "buildRouletteReel");
    const selected = eligibleGame({
      id: "game-selected",
      rarity: "epic",
      title: "Persisted Result"
    });
    const reel = buildRouletteReel({
      eligibleGames: [
        selected,
        eligibleGame({ id: "game-2", rarity: "common" }),
        eligibleGame({ id: "game-3", rarity: "rare" })
      ],
      selectedResultId: selected.id,
      slotCount: 60
    }) as Array<{ authoritativeResult?: boolean; gameId: string }>;

    expect(reel).toHaveLength(60);
    expect(reel.filter((slot) => slot.authoritativeResult)).toHaveLength(1);
    expect(reel.find((slot) => slot.authoritativeResult)?.gameId).toBe(selected.id);
  });

  it("D-05 D-10 D-12 D-14 ROUL-06 locks rarity, boost, pity, cap and weekend constants", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_BASE_RARITY_WEIGHTS).toEqual({
      common: 70,
      rare: 22,
      epic: 7,
      legendary: 1
    });
    expect(roulette.ROULETTE_BOOSTED_RARITY_WEIGHTS).toEqual({
      common: 55,
      rare: 28,
      epic: 14,
      legendary: 3
    });
    expect(roulette.ROULETTE_PITY_THRESHOLD).toBe(10);
    expect(roulette.ROULETTE_BOOST_COST).toBe(100);
    expect(roulette.ROULETTE_BOOST_BALANCE_CAP).toBe(600);
    expect(roulette.ROULETTE_WEEKEND_BOOST_MULTIPLIER).toBe(1.2);
  });

  it("D-06 ROUL-07 discounts recent discarded results for 3 rounds at 50 percent without removing them", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_COOLDOWN_ROUNDS).toBe(3);
    expect(roulette.ROULETTE_COOLDOWN_WEIGHT_MULTIPLIER).toBe(0.5);

    const applyCooldownWeights = getFunction(roulette, "applyRouletteCooldownWeights");
    const weighted = applyCooldownWeights({
      cooldowns: [{ libraryGameId: "recent-discard", remainingRounds: 3 }],
      weights: [
        { libraryGameId: "recent-discard", weight: 70 },
        { libraryGameId: "fresh-game", weight: 70 }
      ]
    }) as Array<{ libraryGameId: string; weight: number }>;

    expect(weighted.find((entry) => entry.libraryGameId === "recent-discard")?.weight).toBe(35);
    expect(weighted.find((entry) => entry.libraryGameId === "fresh-game")?.weight).toBe(70);
    expect(weighted.every((entry) => entry.weight > 0)).toBe(true);
  });

  it("D-08 D-09 D-13 ROUL-08 mirrors real duo XP into boost balance without spending lifetime XP", async () => {
    const roulette = await loadRouletteModule();
    const applyBoostEarnings = getFunction(roulette, "applyRouletteBoostEarnings");

    expect(
      applyBoostEarnings({
        currentBalance: 580,
        eligibleXpAwardAmount: 100,
        isWeekend: true,
        lifetimeDuoXp: 1200
      })
    ).toEqual({
      balance: 600,
      capped: true,
      delta: 24,
      lifetimeDuoXp: 1200,
      multiplier: 1.2
    });
  });

  it("D-15 D-16 ROUL-10 SAFE-06 models refund-before-persistence and one active round per duo", async () => {
    const roulette = await loadRouletteModule();
    const evaluateRoundFailure = getFunction(roulette, "evaluateRouletteRoundFailure");
    const evaluateStartPermission = getFunction(roulette, "evaluateRouletteStartPermission");

    expect(
      evaluateRoundFailure({
        boostSpent: true,
        persistedRoundId: null
      })
    ).toEqual({
      nextStatus: "failed",
      refundBoost: true,
      updateHistory: false,
      updatePity: false
    });
    expect(
      evaluateRoundFailure({
        boostSpent: true,
        persistedRoundId: "round-1"
      })
    ).toEqual({
      nextStatus: "resumable",
      refundBoost: false,
      updateHistory: false,
      updatePity: false
    });
    expect(
      evaluateStartPermission({
        activeRoundStatus: "pending_invitation"
      })
    ).toEqual({
      ok: false,
      reason: "active-round-exists"
    });
  });

  it("keeps roulette domain implementation free of framework, DB, auth and infrastructure imports", () => {
    if (!existsSync(roulettePolicyPath)) {
      throw new Error(`missing Phase 6 implementation: ${roulettePolicyPath}`);
    }

    const source = readFileSync(roulettePolicyPath, "utf8");

    expect(source).not.toMatch(/from "(next|react|drizzle-orm|better-auth|server-only|@queue\/db)/);
    expect(source).not.toMatch(/from "\.\.\/infrastructure/);
  });
});

async function loadRouletteModule(): Promise<RouletteModule> {
  return import(rouletteModulePath) as Promise<RouletteModule>;
}

function getFunction(module: RouletteModule, name: string): (...args: unknown[]) => unknown {
  const value = module[name];

  if (typeof value !== "function") {
    throw new Error(`missing Phase 6 implementation export: ${name}`);
  }

  return value as (...args: unknown[]) => unknown;
}

function eligibleGame(
  overrides: Partial<{
    id: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    status: string;
    title: string;
  }> = {}
) {
  return {
    id: "game-1",
    rarity: "common" as const,
    status: "wishlist",
    title: "Coop Test",
    ...overrides
  };
}
