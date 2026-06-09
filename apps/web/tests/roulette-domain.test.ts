import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const rouletteModulePath = "../src/modules/roulette";
const roulettePolicyPath = "src/modules/roulette/domain/roulette-policy.ts";

type RouletteModule = Record<string, unknown>;

describe("roulette pure domain policy", () => {
  it("documents complete Phase 6 requirement and D-01 through D-32 coverage map", () => {
    const requirementCoverage = {
      "ROUL-01": "eligible pool, blocked state and playable route shell",
      "ROUL-02": "server-authoritative selection before visual reel reveal",
      "ROUL-03": "opt-in audio, no autoplay and persisted audio preference",
      "ROUL-04": "reduced motion staged reveal and replay without redraw",
      "ROUL-05": "rarity seal, Legendary particles and static fallback",
      "ROUL-06": "base weights, boosted weights and deterministic distribution simulation",
      "ROUL-07": "discard cooldown for 3 rounds at 50 percent weight",
      "ROUL-08": "boost balance cost, cap and weekend generation multiplier",
      "ROUL-09": "lock result as Jogando Principal with replacement-required branch",
      "ROUL-10": "idempotency, one active round, no duplicate costs or history",
      "SAFE-06": "atomic server mutations, RLS and no client-owned economy facts"
    } as const;
    const decisionCoverage = {
      "D-01": "curated backlog source",
      "D-02": "Wishlist and Pausado eligibility",
      "D-03": "60 visual covers with one real result",
      "D-04": "minimum eligible pool of 3",
      "D-05": "base rarity weights",
      "D-06": "recent discard cooldown",
      "D-07": "pending invitation after reveal",
      "D-08": "separate boost balance",
      "D-09": "boost mirrors collective XP",
      "D-10": "100 boost improves rarity odds",
      "D-11": "visible pity progress",
      "D-12": "pity guarantee at 10",
      "D-13": "weekend generation multiplier 1.2",
      "D-14": "boost balance cap 600",
      "D-15": "refund before persistence only",
      "D-16": "one active or pending round",
      "D-17": "editorial 5.5s reveal cadence",
      "D-18": "opt-in audio preference",
      "D-19": "reduced motion staged reveal",
      "D-20": "Legendary static and particle fallback",
      "D-21": "persisted shared result before animation",
      "D-22": "replay is not a redraw",
      "D-23": "mobile full-bleed reel, fixed pointer, controls below, no tiny card",
      "D-24": "authoritative resume after refresh",
      "D-25": "commitment invitation copy",
      "D-26": "lock as Principal with audit",
      "D-27": "replacement required with no auto-pause",
      "D-28": "roleta-principal dashboard highlight",
      "D-29": "new round blocked until invitation resolution",
      "D-30": "discard without persisted boost refund",
      "D-31": "roulette-result-locked and roulette-result-discarded Central facts",
      "D-32": "compact history with boost, pity, locked and discarded outcomes"
    } as const;

    expect(Object.keys(requirementCoverage)).toEqual([
      "ROUL-01",
      "ROUL-02",
      "ROUL-03",
      "ROUL-04",
      "ROUL-05",
      "ROUL-06",
      "ROUL-07",
      "ROUL-08",
      "ROUL-09",
      "ROUL-10",
      "SAFE-06"
    ]);
    expect(Object.keys(decisionCoverage)).toEqual(
      Array.from({ length: 32 }, (_, index) => `D-${String(index + 1).padStart(2, "0")}`)
    );
    expect(decisionCoverage["D-23"]).toContain("full-bleed");
    expect(decisionCoverage["D-31"]).toContain("roulette-result-locked");
    expect(requirementCoverage["ROUL-03"]).toContain("no autoplay");
  });

  it("D-01 D-02 D-04 ROUL-01 pulls only Wishlist/Pausado backlog games and blocks pools below 3", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_ELIGIBLE_STATUSES).toEqual(["wishlist", "pausado"]);
    expect(roulette.ROULETTE_MINIMUM_ELIGIBLE_GAMES).toBe(3);

    const getEligiblePoolPolicy = getFunction(roulette, "getEligiblePoolPolicy");

    expect(
      getEligiblePoolPolicy({
        games: [
          rouletteGame({ id: "wish-1", status: "wishlist" }),
          rouletteGame({ id: "pause-1", status: "pausado" }),
          rouletteGame({ id: "active-1", status: "jogando" }),
          rouletteGame({ id: "done-1", status: "zerado" }),
          rouletteGame({ id: "drop-1", status: "dropado" })
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

    const buildVisualReel = getFunction(roulette, "buildVisualReel");
    const selected = rouletteGame({
      id: "game-selected",
      rarity: "epic",
      title: "Persisted Result"
    });
    const reel = buildVisualReel({
      eligibleGames: [
        selected,
        rouletteGame({ id: "game-2", rarity: "common" }),
        rouletteGame({ id: "game-3", rarity: "rare" })
      ],
      selectedResultId: selected.id,
      seed: "round-a"
    }) as Array<{ authoritativeResult?: boolean; gameId: string; slotIndex: number }>;

    expect(reel).toHaveLength(60);
    expect(reel[0]?.slotIndex).toBe(1);
    expect(reel[59]?.slotIndex).toBe(60);
    expect(reel.filter((slot) => slot.authoritativeResult)).toHaveLength(1);
    expect(reel.find((slot) => slot.authoritativeResult)?.gameId).toBe(selected.id);
  });

  it("D-05 D-10 D-12 D-14 locks rarity, boost, pity, cap and weekend constants", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_BASE_WEIGHTS).toEqual({
      common: 70,
      rare: 22,
      epic: 7,
      legendary: 1
    });
    expect(roulette.ROULETTE_BOOSTED_WEIGHTS).toEqual({
      common: 55,
      rare: 28,
      epic: 14,
      legendary: 3
    });
    expect(roulette.ROULETTE_PITY_THRESHOLD).toBe(10);
    expect(roulette.ROULETTE_BOOST_COST).toBe(100);
    expect(roulette.ROULETTE_BOOST_BALANCE_CAP).toBe(600);
    expect(roulette.ROULETTE_WEEKEND_BOOST_EARN_MULTIPLIER).toBe(1.2);
  });

  it("D-05 D-10 D-12 selects deterministic results from weighted rarity policy and pity", async () => {
    const roulette = await loadRouletteModule();
    const selectRouletteResult = getFunction(roulette, "selectRouletteResult");
    const games = [
      rouletteGame({ id: "common-1", rarity: "common" }),
      rouletteGame({ id: "rare-1", rarity: "rare" }),
      rouletteGame({ id: "epic-1", rarity: "epic" }),
      rouletteGame({ id: "legendary-1", rarity: "legendary" })
    ];

    expect(
      selectRouletteResult({
        eligibleGames: games,
        pityCount: 0,
        roll: 0.71
      })
    ).toEqual({
      ok: true,
      pityApplied: false,
      result: games[1],
      totalWeight: 100
    });
    expect(
      selectRouletteResult({
        eligibleGames: games,
        pityCount: 10,
        roll: 0.01
      })
    ).toEqual({
      ok: true,
      pityApplied: true,
      result: games[2],
      totalWeight: 8
    });
  });

  it("D-12 updates pity exactly once per persisted result", async () => {
    const roulette = await loadRouletteModule();
    const applyPityTransition = getFunction(roulette, "applyPityTransition");

    expect(
      applyPityTransition({
        drawsSinceEpicOrHigher: 9,
        resultRarity: "rare"
      })
    ).toEqual({
      drawsSinceEpicOrHigher: 10,
      qualifiedResult: false
    });
    expect(
      applyPityTransition({
        drawsSinceEpicOrHigher: 10,
        resultRarity: "epic"
      })
    ).toEqual({
      drawsSinceEpicOrHigher: 0,
      qualifiedResult: true
    });
  });

  it("D-06 ROUL-07 discounts recent discarded results for 3 rounds at 50 percent without removing them", async () => {
    const roulette = await loadRouletteModule();

    expect(roulette.ROULETTE_COOLDOWN_ROUNDS).toBe(3);
    expect(roulette.ROULETTE_COOLDOWN_MULTIPLIER).toBe(0.5);

    const applyCooldownWeights = getFunction(roulette, "applyCooldownWeights");
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
    const calculateBoostEarnAmount = getFunction(roulette, "calculateBoostEarnAmount");
    const applyBoostCostPolicy = getFunction(roulette, "applyBoostCostPolicy");

    expect(
      calculateBoostEarnAmount({
        currentBalance: 580,
        eligibleXpAwardAmount: 100,
        isWeekend: true,
        lifetimeDuoXp: 1200
      })
    ).toEqual({
      balance: 600,
      capped: true,
      earnedAmount: 24,
      lifetimeDuoXp: 1200,
      multiplier: 1.2
    });
    expect(
      applyBoostCostPolicy({
        boostRequested: true,
        currentBalance: 120,
        lifetimeDuoXp: 1200
      })
    ).toEqual({
      balance: 20,
      cost: 100,
      lifetimeDuoXp: 1200,
      ok: true,
      spent: true
    });
  });

  it("D-15 D-16 ROUL-10 SAFE-06 models refund-before-persistence and one active round per duo", async () => {
    const roulette = await loadRouletteModule();
    const getRoundResumePolicy = getFunction(roulette, "getRoundResumePolicy");

    expect(
      getRoundResumePolicy({
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
      getRoundResumePolicy({
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
      getRoundResumePolicy({
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

function rouletteGame(
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
