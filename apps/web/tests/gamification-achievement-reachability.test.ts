import { describe, expect, it } from "vitest";

import { ACHIEVEMENT_CATALOG } from "../src/modules/gamification/domain/achievement-catalog";
import {
  ACHIEVEMENT_PREDICATES,
  auditAchievementReachability,
  createAchievementPredicateFixture,
  evaluateAchievements,
  type AchievementPredicateKey,
  type AchievementPredicateRegistry
} from "../src/modules/gamification/domain/achievement-predicates";

describe("gamification achievement reachability", () => {
  it("keeps exactly 50 active seeds backed by one typed definition per predicate key", () => {
    const catalogKeys = new Set(ACHIEVEMENT_CATALOG.map((seed) => seed.predicateKey));
    const registryKeys = new Set(Object.keys(ACHIEVEMENT_PREDICATES));

    expect(ACHIEVEMENT_CATALOG).toHaveLength(50);
    expect(new Set(ACHIEVEMENT_CATALOG.map((seed) => seed.slug))).toHaveLength(50);
    expect(registryKeys).toEqual(catalogKeys);
    expect(registryKeys.size).toBe(49);
  });

  it("proves 50 reachable / 50 active with authoritative sources and fixtures", () => {
    const report = auditAchievementReachability();

    expect(report).toEqual({
      active: 50,
      reachable: 50,
      orphanPredicateKeys: []
    });

    for (const seed of ACHIEVEMENT_CATALOG) {
      const predicateKey = seed.predicateKey as AchievementPredicateKey;
      const definition = ACHIEVEMENT_PREDICATES[predicateKey];
      const fixture = createAchievementPredicateFixture(predicateKey);

      expect(definition.sources.length).toBeGreaterThan(0);
      expect(definition.sources).not.toEqual(
        expect.arrayContaining(["roulette-result", "review"])
      );
      expect(evaluateAchievements(fixture).map((achievement) => achievement.slug)).toContain(
        seed.slug
      );
    }
  });

  it("evaluates thresholds and composite predicates without parsing predicate strings", () => {
    const snapshot = createAchievementPredicateFixture("aligned-play-day:1");
    const qualified = evaluateAchievements(snapshot).map((achievement) => achievement.slug);

    expect(qualified).toContain("dois-controles-um-plano");
    expect(qualified).not.toContain("trilogia-fechada");
    expect(ACHIEVEMENT_PREDICATES["aligned-play-day:1"]).toMatchObject({
      kind: "all",
      conditions: expect.arrayContaining([
        expect.objectContaining({ metric: "alignedPlayDayCount", atLeast: 1 }),
        expect.objectContaining({ metric: "doubleConfirmationCount", atLeast: 1 })
      ])
    });
  });

  it("lists every affected slug when a predicate definition is missing", () => {
    const registry = {
      ...ACHIEVEMENT_PREDICATES
    } as Partial<AchievementPredicateRegistry>;

    delete registry["streak-days:7"];

    expect(() => auditAchievementReachability(registry)).toThrowError(
      /dupla-afinada, semana-acesa/
    );
  });

  it("remaps only the three pre-roulette copies to real Phase 5 facts", () => {
    expect(seed("ponteiro-curioso")).toMatchObject({
      group: "roleta",
      predicateKey: "library-growth-count:10",
      description: expect.stringMatching(/fila elegivel/i)
    });
    expect(seed("quase-epico")).toMatchObject({
      group: "roleta",
      predicateKey: "achievement-count:25",
      description: expect.stringMatching(/conquistas/i)
    });
    expect(seed("case-de-respeito")).toMatchObject({
      group: "roleta",
      predicateKey: "level:25",
      description: expect.stringMatching(/sorteio/i)
    });

    expect(
      ACHIEVEMENT_CATALOG.filter((achievement) => achievement.group === "roleta").map(
        (achievement) => achievement.predicateKey
      )
    ).not.toEqual(expect.arrayContaining([expect.stringMatching(/^roulette-/)]));
  });
});

function seed(slug: string) {
  const achievement = ACHIEVEMENT_CATALOG.find((candidate) => candidate.slug === slug);

  if (!achievement) {
    throw new Error(`missing achievement seed: ${slug}`);
  }

  return achievement;
}
