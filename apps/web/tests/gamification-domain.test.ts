import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_GROUPS,
  ACTIVE_MONTHLY_QUEST_SLOT,
  ACTIVE_WEEKLY_QUEST_SLOTS,
  GAMIFICATION_RARITIES,
  LEVEL_COUNT,
  LEVEL_CURVE,
  LEVEL_CURVE_MULTIPLIER,
  LEVEL_CURVE_VERSION,
  QUEST_TEMPLATES,
  SEASONAL_QUEST_SEEDS,
  XP_MODEL_SCOPE,
  XP_SOURCE_RULES,
  evaluateStreakTransition,
  evaluateXpSourceEligibility,
  getActiveQuestTemplateSlugs,
  getDuoDayKey,
  getFreezeEarnedForLevelChange,
  getLevelForXp,
  getQuestWindow,
  getRewardIntensityForRarity
} from "../src/modules/gamification";
import {
  getNextQuestRotationAt,
  getNextStreakCheckAt
} from "../src/modules/gamification/domain/gamification-schedule";
import {
  SEASONAL_QUEST_WINDOWS
} from "../src/modules/gamification/domain/quest-catalog";

const domainFiles = [
  "src/modules/gamification/domain/gamification-policy.ts",
  "src/modules/gamification/domain/level-curve.ts",
  "src/modules/gamification/domain/achievement-catalog.ts",
  "src/modules/gamification/domain/gamification-schedule.ts",
  "src/modules/gamification/domain/quest-catalog.ts",
  "src/modules/gamification/domain/streak-policy.ts"
];
const gamificationPublicIndexSource = readFileSync(
  "src/modules/gamification/index.ts",
  "utf8"
);

describe("gamification XP policy", () => {
  it("keeps XP as one shared duo economy without individual XP rules", () => {
    expect(XP_MODEL_SCOPE).toBe("duo");
    expect(
      Object.values(XP_SOURCE_RULES).every((rule) => rule.awardScope === "duo")
    ).toBe(true);
    expect(Object.keys(XP_SOURCE_RULES)).not.toContain("member");
    expect(Object.keys(XP_SOURCE_RULES)).not.toContain("individual");
  });

  it("awards only confirmed non-farmable facts and rejects weak recurring sources", () => {
    expect(
      evaluateXpSourceEligibility({
        sourceType: "live-session",
        sourceId: "session-1",
        confirmedDuoFact: true,
        alreadyAwarded: false,
        durationSeconds: 20 * 60
      })
    ).toEqual({
      ok: true,
      awardKey: "live-session:session-1",
      amount: 30,
      reasonCode: "live-session-confirmed",
      scope: "duo"
    });
    expect(
      evaluateXpSourceEligibility({
        sourceType: "live-session",
        sourceId: "session-2",
        confirmedDuoFact: true,
        alreadyAwarded: false,
        durationSeconds: 3 * 60
      })
    ).toEqual({ ok: false, reason: "session-too-short" });
    expect(
      evaluateXpSourceEligibility({
        sourceType: "discovery-match",
        sourceId: "match-1",
        confirmedDuoFact: true,
        alreadyAwarded: false
      })
    ).toEqual({ ok: false, reason: "source-does-not-award-xp" });
  });

  it("maps rarity to styling tokens and celebration intensity without ranking members", () => {
    expect(getRewardIntensityForRarity("common")).toBe("quiet");
    expect(getRewardIntensityForRarity("epic")).toBe("special");
    expect(getRewardIntensityForRarity("legendary")).toBe("legendary");
  });
});

describe("gamification level curve", () => {
  it("has exactly 50 levels with locked anchors, a version and increasing thresholds", () => {
    expect(LEVEL_CURVE_VERSION).toBeTruthy();
    expect(LEVEL_CURVE_MULTIPLIER).toBeCloseTo(1.18, 2);
    expect(LEVEL_CURVE).toHaveLength(LEVEL_COUNT);
    expect(LEVEL_CURVE.at(0)).toMatchObject({
      level: 1,
      name: "Lv1 Casuais",
      xpRequired: 0
    });
    expect(LEVEL_CURVE.at(-1)).toMatchObject({
      level: 50,
      name: "Lv50 Lendas do Coop"
    });
    expect(new Set(LEVEL_CURVE.map((level) => level.name)).size).toBe(LEVEL_COUNT);

    for (let index = 1; index < LEVEL_CURVE.length; index += 1) {
      expect(LEVEL_CURVE[index]!.xpRequired).toBeGreaterThan(
        LEVEL_CURVE[index - 1]!.xpRequired
      );
    }
  });

  it("resolves XP totals to the highest reached shared duo level", () => {
    expect(getLevelForXp(0).name).toBe("Lv1 Casuais");
    expect(getLevelForXp(LEVEL_CURVE[9]!.xpRequired).name).toBe("Lv10 Pacto da Fila");
    expect(getLevelForXp(Number.MAX_SAFE_INTEGER).name).toBe("Lv50 Lendas do Coop");
  });
});

describe("gamification achievement catalog", () => {
  it("ships exactly 50 seeds with valid groups, rarity, visibility and no emoji dependency", () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(50);

    const groups = new Set(ACHIEVEMENT_GROUPS);
    const rarities = new Set(GAMIFICATION_RARITIES);
    const hiddenCount = ACHIEVEMENT_CATALOG.filter(
      (achievement) => achievement.visibility === "hidden"
    ).length;

    expect(hiddenCount).toBeGreaterThan(0);
    expect(hiddenCount).toBeLessThan(ACHIEVEMENT_CATALOG.length / 3);

    for (const achievement of ACHIEVEMENT_CATALOG) {
      expect(groups.has(achievement.group)).toBe(true);
      expect(rarities.has(achievement.rarity)).toBe(true);
      expect(["visible", "hidden"]).toContain(achievement.visibility);
      expect(`${achievement.title} ${achievement.description} ${achievement.iconKey}`).not.toMatch(
        /\p{Extended_Pictographic}/u
      );
      expect(achievement.iconKey).toMatch(/^badge-/);
    }
  });

  it("includes Coop-Sincronia and prioritizes real play over roulette/comedy seasoning", () => {
    const weightedGroups = ACHIEVEMENT_CATALOG.filter((achievement) =>
      ["story", "coop-sincronia", "compromisso", "streak"].includes(achievement.group)
    );
    const seasoningGroups = ACHIEVEMENT_CATALOG.filter((achievement) =>
      ["roleta", "comedia"].includes(achievement.group)
    );

    expect(
      ACHIEVEMENT_CATALOG.some((achievement) => achievement.group === "coop-sincronia")
    ).toBe(true);
    expect(weightedGroups.length).toBeGreaterThan(seasoningGroups.length);
  });
});

describe("gamification quest catalog", () => {
  it("exposes exactly three weekly slots, one monthly slot and explicit seasonal seeds", () => {
    expect(ACTIVE_WEEKLY_QUEST_SLOTS).toHaveLength(3);
    expect(ACTIVE_MONTHLY_QUEST_SLOT).toBe("mes-da-fila");
    expect(SEASONAL_QUEST_SEEDS).toEqual([
      "spooky-coop",
      "awards-em-casa",
      "aniversario-da-fila"
    ]);
    expect(getActiveQuestTemplateSlugs()).toEqual({
      weekly: ACTIVE_WEEKLY_QUEST_SLOTS,
      monthly: ACTIVE_MONTHLY_QUEST_SLOT,
      seasonal: SEASONAL_QUEST_SEEDS
    });
    expect(
      QUEST_TEMPLATES.filter((quest) => ACTIVE_WEEKLY_QUEST_SLOTS.includes(quest.slug as never))
    ).toHaveLength(3);
  });

  it("calculates weekly windows from Monday 00:00 in the duo timezone", () => {
    expect(
      getQuestWindow({
        type: "weekly",
        now: new Date("2026-06-03T15:00:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toEqual({
      type: "weekly",
      cycleKey: "weekly:2026-06-01",
      startsOn: "2026-06-01",
      endsOn: "2026-06-08",
      timezone: "America/Sao_Paulo"
    });
  });

  it("keeps seasonal activation windows explicit", () => {
    expect(SEASONAL_QUEST_WINDOWS).toEqual({
      anniversary: {
        end: { day: 1, month: 7 },
        start: { day: 1, month: 6 }
      },
      awards: {
        end: { day: 1, month: 1 },
        start: { day: 1, month: 12 }
      },
      spooky: {
        end: { day: 1, month: 11 },
        start: { day: 1, month: 10 }
      }
    });
  });
});

describe("gamification local schedule", () => {
  it("schedules weekly, monthly, seasonal and streak boundaries in Sao Paulo civil time", () => {
    const after = new Date("2026-06-03T15:00:00.000Z");
    const timezone = "America/Sao_Paulo";
    const weekly = getNextQuestRotationAt({
      after,
      questType: "weekly",
      timezone
    });
    const monthly = getNextQuestRotationAt({
      after,
      questType: "monthly",
      timezone
    });
    const seasonal = getNextQuestRotationAt({
      after,
      questType: "seasonal",
      timezone
    });
    const streak = getNextStreakCheckAt({ after, timezone });

    expect(weekly.toISOString()).toBe("2026-06-08T03:00:00.000Z");
    expect(monthly.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(seasonal.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(streak.toISOString()).toBe("2026-06-04T07:00:00.000Z");
    expect(civilDateTime(weekly, timezone)).toBe("2026-06-08 00:00");
    expect(civilDateTime(monthly, timezone)).toBe("2026-07-01 00:00");
    expect(civilDateTime(seasonal, timezone)).toBe("2026-07-01 00:00");
    expect(civilDateTime(streak, timezone)).toBe("2026-06-04 04:00");
  });

  it("keeps New York boundaries stable across both 2026 DST transitions", () => {
    const timezone = "America/New_York";
    const springStreak = getNextStreakCheckAt({
      after: new Date("2026-03-07T15:00:00.000Z"),
      timezone
    });
    const springWeekly = getNextQuestRotationAt({
      after: new Date("2026-03-07T15:00:00.000Z"),
      questType: "weekly",
      timezone
    });
    const fallStreak = getNextStreakCheckAt({
      after: new Date("2026-10-31T15:00:00.000Z"),
      timezone
    });
    const fallWeekly = getNextQuestRotationAt({
      after: new Date("2026-10-31T15:00:00.000Z"),
      questType: "weekly",
      timezone
    });
    const spookyBoundary = getNextQuestRotationAt({
      after: new Date("2026-09-30T15:00:00.000Z"),
      questType: "seasonal",
      timezone
    });

    expect(springStreak.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(springWeekly.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(fallStreak.toISOString()).toBe("2026-11-01T09:00:00.000Z");
    expect(fallWeekly.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(spookyBoundary.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(civilDateTime(springStreak, timezone)).toBe("2026-03-08 04:00");
    expect(civilDateTime(springWeekly, timezone)).toBe("2026-03-09 00:00");
    expect(civilDateTime(fallStreak, timezone)).toBe("2026-11-01 04:00");
    expect(civilDateTime(fallWeekly, timezone)).toBe("2026-11-02 00:00");
    expect(civilDateTime(spookyBoundary, timezone)).toBe("2026-10-01 00:00");
  });

  it("rejects invalid IANA timezones instead of falling back to UTC", () => {
    expect(() =>
      getNextStreakCheckAt({
        after: new Date("2026-06-06T15:00:00.000Z"),
        timezone: "Timezone inventado"
      })
    ).toThrowError("invalid_gamification_timezone");
  });
});

describe("gamification streak policy", () => {
  it("counts duo days with a 04:00 cutoff in the duo timezone", () => {
    expect(
      getDuoDayKey({
        occurredAt: new Date("2026-06-06T06:30:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toBe("2026-06-05");
    expect(
      getDuoDayKey({
        occurredAt: new Date("2026-06-06T07:30:00.000Z"),
        timezone: "America/Sao_Paulo"
      })
    ).toBe("2026-06-06");
  });

  it("earns one Streak Freeze every ten levels and consumes one automatically when needed", () => {
    expect(
      getFreezeEarnedForLevelChange({
        previousLevel: 9,
        nextLevel: 10
      })
    ).toBe(1);
    expect(
      getFreezeEarnedForLevelChange({
        previousLevel: 10,
        nextLevel: 20
      })
    ).toBe(1);
    expect(
      evaluateStreakTransition({
        lastActivityDuoDay: "2026-06-01",
        currentDuoDay: "2026-06-03",
        currentStreak: 5,
        availableFreezes: 1
      })
    ).toEqual({
      nextStreak: 6,
      availableFreezes: 0,
      consumedFreeze: true,
      consumedFreezes: 1,
      reset: false
    });
  });
});

describe("gamification module boundary", () => {
  it("keeps domain files free of framework, database, auth and infrastructure imports", () => {
    for (const domainFile of domainFiles) {
      const source = readFileSync(domainFile, "utf8");

      expect(source).not.toMatch(/from "(next|react|drizzle-orm|better-auth|server-only|@queue\/db)/);
      expect(source).not.toMatch(/from "\.\.\/infrastructure/);
    }
  });

  it("does not expose infrastructure internals through the public entrypoint", () => {
    expect(gamificationPublicIndexSource).not.toContain("infrastructure");
    expect(gamificationPublicIndexSource).not.toContain("createGamificationRepository");
    expect(gamificationPublicIndexSource).not.toContain("gamificationRepository");
  });
});

function civilDateTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}
