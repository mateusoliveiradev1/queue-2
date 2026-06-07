import type { AchievementSeed } from "../domain/achievement-catalog";
import {
  evaluateAchievements,
  type AchievementMetricSnapshot
} from "../domain/achievement-predicates";
import {
  evaluateXpSourceEligibility,
  getRewardIntensityForRarity,
  type GamificationFactSourceType,
  type XpEligibilityResult
} from "../domain/gamification-policy";
import { getQuestTemplate, type QuestTemplate } from "../domain/quest-catalog";
import {
  evaluateStreakTransition,
  getDuoDayKey,
  getFreezeEarnedForLevelChange,
  isStreakEligibleFact,
  type StreakFactType
} from "../domain/streak-policy";
import type {
  GamificationAchievementSummary,
  GamificationApplyFactResult,
  GamificationFactInput,
  GamificationProjectionRecord,
  GamificationQuestProgressRecord,
  GamificationQuestProgressSummary,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationRewardSummary,
  GamificationStreakStateRecord,
  GamificationStreakSummary,
  GamificationXpLedgerRecord
} from "./ports";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export async function applyGamificationFact(
  input: GamificationFactInput,
  repository?: GamificationRepository
): Promise<GamificationApplyFactResult> {
  if (!input.actorUserId) {
    return { ok: false, reason: "actor-required" };
  }

  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;

  return resolvedRepository.withUserTransaction(input.actorUserId, (transaction) =>
    applyGamificationFactToTransaction(input, transaction)
  );
}

export async function applyGamificationFactToTransaction(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction
): Promise<GamificationApplyFactResult> {
  const membership = input.actorUserId
    ? await transaction.resolveMembership(input.actorUserId)
    : null;

  if (!membership) {
    return { ok: false, reason: "membership-required" };
  }

  if (membership.duoId !== input.duoId) {
    return { ok: false, reason: "duo-mismatch" };
  }

  const projection = await transaction.lockProjection(input.duoId);

  if (!projection) {
    return { ok: false, reason: "projection-not-found" };
  }

  const timezone = await transaction.readDuoTimezone(input.duoId);
  const duoDay = getDuoDayKey({
    occurredAt: input.occurredAt,
    timezone: timezone || DEFAULT_TIMEZONE
  });
  const awardsForSourceToday = input.sourceType === "chapter"
    ? await transaction.countXpAwardsForDuoDay({
        duoId: input.duoId,
        sourceType: input.sourceType,
        duoDay,
        timezone: timezone || DEFAULT_TIMEZONE
      })
    : 0;
  const eligibility = evaluateXpSourceEligibility({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    confirmedDuoFact: input.confirmedDuoFact,
    alreadyAwarded: false,
    durationSeconds: readNumber(input.metadata, "durationSeconds"),
    awardsForSourceToday,
    overrideAmount: input.sourceType === "adjustment" ? input.amountOverride : undefined
  });

  if (!eligibility.ok && eligibility.reason === "unconfirmed-fact") {
    return { ok: false, reason: "unconfirmed-fact" };
  }

  if (!eligibility.ok && eligibility.reason === "invalid-adjustment") {
    return { ok: false, reason: "invalid-adjustment" };
  }

  const xpAwards: GamificationXpLedgerRecord[] = [];
  let duplicate = false;

  if (eligibility.ok) {
    const award = await transaction.insertXpLedgerAward({
      duoId: input.duoId,
      awardKey: eligibility.awardKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      amount: eligibility.amount,
      reasonCode: eligibility.reasonCode,
      awardedByUserId: input.actorUserId,
      metadata: {
        ...(input.metadata ?? {}),
        scope: eligibility.scope
      }
    });

    if (!award) {
      duplicate = true;

      return {
        ok: true,
        duplicate,
        summary: emptyRewardSummary(projection)
      };
    }

    xpAwards.push(award);

    if (input.sourceType === "adjustment") {
      await transaction.insertAdjustment({
        duoId: input.duoId,
        adjustmentKey: eligibility.awardKey,
        amountDelta: eligibility.amount,
        reasonCode: eligibility.reasonCode,
        actorUserId: input.actorUserId,
        metadata: input.metadata
      });
    }
  }

  const questProgress = await applyQuestProgress(input, transaction, xpAwards);
  const streak = await applyStreak(input, transaction, projection, duoDay);
  const totalXpAwarded = xpAwards.reduce((sum, award) => sum + award.amount, 0);
  const shouldUpdateProjection = totalXpAwarded !== 0 || streak !== null;
  let nextProjection = shouldUpdateProjection
    ? await transaction.updateProjection({
        duoId: input.duoId,
        xpDelta: totalXpAwarded,
        streak: streak?.currentStreak,
        availableFreezes: streak?.availableFreezes
      })
    : projection;
  const levelUp = nextProjection.level.level > projection.level.level
    ? {
        previousLevel: projection.level,
        currentLevel: nextProjection.level
      }
    : null;
  const freezeDelta = getFreezeEarnedForLevelChange({
    previousLevel: projection.level.level,
    nextLevel: nextProjection.level.level
  });
  const freezeInserted = freezeDelta > 0
    ? await transaction.insertStreakEvent({
        duoId: input.duoId,
        eventKey: `freeze-earned:level:${nextProjection.level.level}`,
        eventType: "freeze-earned",
        duoDay,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actorUserId: input.actorUserId,
        freezeDelta,
        metadata: {
          previousLevel: projection.level.level,
          currentLevel: nextProjection.level.level
        }
      })
    : false;
  const earnedFreezes = freezeInserted ? freezeDelta : 0;

  if (earnedFreezes > 0) {
    nextProjection = await transaction.updateProjection({
      duoId: input.duoId,
      xpDelta: 0,
      streak: streak?.currentStreak,
      availableFreezes: nextProjection.availableFreezes + earnedFreezes
    });
  }

  const streakWithFreezes = streak
    ? {
        ...streak,
        earnedFreezes,
        availableFreezes: nextProjection.availableFreezes
      }
    : earnedFreezes > 0
      ? {
          previousStreak: projection.streak,
          currentStreak: projection.streak,
          availableFreezes: nextProjection.availableFreezes,
          earnedFreezes,
          consumedFreeze: false,
          reset: false,
          duoDay
        }
      : null;
  const achievementMetrics = await transaction.readAchievementMetrics(input.duoId, {
    timezone: timezone || DEFAULT_TIMEZONE
  });
  const achievements = await applyAchievements(
    input,
    transaction,
    evaluateAchievements(withProjectedAchievementCount(achievementMetrics))
  );

  await insertRewardNotifications(input, transaction, {
    xpAwards,
    levelUp,
    achievements,
    questProgress,
    streak: streakWithFreezes
  });

  return {
    ok: true,
    duplicate,
    summary: {
      totalXpAwarded,
      xpAwards,
      levelUp,
      achievements,
      questProgress,
      streak: streakWithFreezes,
      projection: nextProjection,
      skippedXpReason: getSkippedXpReason(eligibility)
    }
  };
}

async function applyQuestProgress(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction,
  xpAwards: GamificationXpLedgerRecord[]
): Promise<GamificationQuestProgressSummary[]> {
  const cycles = await transaction.readActiveQuestCycles(input.duoId);
  const summaries: GamificationQuestProgressSummary[] = [];

  for (const cycle of cycles) {
    const template = getQuestTemplate(cycle.questSlug);

    if (!template || !factMatchesQuest(input, template)) {
      continue;
    }

    const sourceKey = `${input.sourceType}:${input.sourceId}`;
    const advancement = await transaction.advanceQuestProgress({
      duoId: input.duoId,
      questCycleId: cycle.id,
      sourceKey,
      increment: 1,
      goal: template.goalValue,
      completedAt: input.occurredAt,
      lastSourceType: input.sourceType,
      lastSourceId: input.sourceId,
      metadata: {
        eligibilityKey: template.eligibilityKey
      }
    });
    const questAward = advancement.completedNow
      ? await transaction.insertXpLedgerAward({
          duoId: input.duoId,
          awardKey: `quest:${cycle.id}`,
          sourceType: "quest",
          sourceId: cycle.id,
          amount: template.xpReward,
          reasonCode: "quest-complete",
          awardedByUserId: input.actorUserId,
          metadata: {
            questSlug: cycle.questSlug,
            questType: cycle.questType,
            cycleKey: cycle.cycleKey,
            completedBySourceKey: sourceKey,
            scope: "duo"
          }
        })
      : null;

    if (questAward) {
      xpAwards.push(questAward);
    }

    const progress = questAward
      ? await transaction.linkQuestProgressReward({
          duoId: input.duoId,
          questCycleId: cycle.id,
          rewardAwardId: questAward.id
        })
      : advancement.progress;

    summaries.push(questSummary(cycle, template, progress, questAward?.amount ?? 0));
  }

  return summaries;
}

async function applyStreak(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction,
  projection: GamificationProjectionRecord,
  duoDay: string
): Promise<Omit<GamificationStreakSummary, "earnedFreezes"> | null> {
  const streakFactType = mapStreakFactType(input.sourceType);

  if (!streakFactType || !isStreakEligibleFact(streakFactType)) {
    return null;
  }

  const currentState = await transaction.readStreakState(input.duoId);
  const baseState = currentState ?? {
    duoId: input.duoId,
    currentStreak: projection.streak,
    longestStreak: Math.max(projection.streak, 0),
    availableFreezes: projection.availableFreezes,
    lastActivityDuoDay: null,
    updatedAt: input.occurredAt
  };
  const eventInserted = await transaction.insertStreakEvent({
    duoId: input.duoId,
    eventKey: `activity:${input.sourceType}:${input.sourceId}`,
    eventType: "activity",
    duoDay,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    actorUserId: input.actorUserId,
    metadata: { streakFactType }
  });

  if (!eventInserted) {
    return null;
  }

  const transition = evaluateStreakTransition({
    currentDuoDay: duoDay,
    lastActivityDuoDay: baseState.lastActivityDuoDay,
    currentStreak: baseState.currentStreak,
    availableFreezes: baseState.availableFreezes
  });
  const nextState: GamificationStreakStateRecord = {
    duoId: input.duoId,
    currentStreak: transition.nextStreak,
    longestStreak: Math.max(baseState.longestStreak, transition.nextStreak),
    availableFreezes: transition.availableFreezes,
    lastActivityDuoDay: duoDay,
    updatedAt: input.occurredAt
  };

  await transaction.upsertStreakState(nextState);

  if (transition.consumedFreeze) {
    await transaction.insertStreakEvent({
      duoId: input.duoId,
      eventKey: `freeze-consumed:${input.sourceType}:${input.sourceId}`,
      eventType: "freeze-consumed",
      duoDay,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      actorUserId: input.actorUserId,
      freezeDelta: -transition.consumedFreezes,
      metadata: {
        consumedFreezes: transition.consumedFreezes,
        previousDuoDay: baseState.lastActivityDuoDay
      }
    });
  }

  if (transition.reset) {
    await transaction.insertStreakEvent({
      duoId: input.duoId,
      eventKey: `streak-reset:${input.sourceType}:${input.sourceId}`,
      eventType: "streak-reset",
      duoDay,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      actorUserId: input.actorUserId,
      deltaDays: -baseState.currentStreak,
      freezeDelta: 0,
      metadata: {
        previousDuoDay: baseState.lastActivityDuoDay,
        reason: "fact-gap-reset"
      }
    });
  }

  return {
    previousStreak: baseState.currentStreak,
    currentStreak: transition.nextStreak,
    availableFreezes: transition.availableFreezes,
    consumedFreeze: transition.consumedFreeze,
    reset: transition.reset,
    duoDay
  };
}

async function applyAchievements(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction,
  seeds: readonly AchievementSeed[]
): Promise<GamificationAchievementSummary[]> {
  const summaries: GamificationAchievementSummary[] = [];

  for (const seed of seeds) {
    const unlock = await transaction.insertAchievementUnlock({
      duoId: input.duoId,
      achievementSlug: seed.slug,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      unlockedByUserId: input.actorUserId,
      metadata: {
        title: seed.title,
        rarity: seed.rarity,
        predicateKey: seed.predicateKey
      }
    });

    if (!unlock) {
      continue;
    }

    summaries.push(achievementSummary(seed, unlock.unlockedAt));
  }

  return summaries;
}

async function insertRewardNotifications(
  input: GamificationFactInput,
  transaction: GamificationRepositoryTransaction,
  effects: {
    xpAwards: GamificationXpLedgerRecord[];
    levelUp: GamificationRewardSummary["levelUp"];
    achievements: GamificationAchievementSummary[];
    questProgress: GamificationQuestProgressSummary[];
    streak: GamificationRewardSummary["streak"];
  }
): Promise<void> {
  for (const award of effects.xpAwards) {
    await transaction.insertRewardNotification({
      duoId: input.duoId,
      actorUserId: input.actorUserId,
      notificationType: award.sourceType === "quest" ? "quest-complete" : "xp-award",
      intensity: award.amount >= 200 ? "special" : "standard",
      title: award.sourceType === "quest" ? "Desafio concluido" : "XP da dupla registrado",
      body: `+${award.amount} XP para a dupla.`,
      actionRefType: award.sourceType,
      actionRefId: award.sourceId,
      metadata: { awardKey: award.awardKey }
    });
  }

  if (effects.levelUp) {
    await transaction.insertRewardNotification({
      duoId: input.duoId,
      actorUserId: input.actorUserId,
      notificationType: "level-up",
      intensity: effects.levelUp.currentLevel.level >= 50 ? "legendary" : "special",
      title: "Nivel da dupla subiu",
      body: `${effects.levelUp.previousLevel.name} -> ${effects.levelUp.currentLevel.name}.`,
      actionRefType: input.sourceType,
      actionRefId: input.sourceId
    });
  }

  for (const achievement of effects.achievements) {
    await transaction.insertRewardNotification({
      duoId: input.duoId,
      actorUserId: input.actorUserId,
      notificationType: "achievement",
      intensity: getRewardIntensityForRarity(achievement.rarity),
      title: "Conquista liberada",
      body: achievement.title,
      actionRefType: "achievement",
      actionRefId: input.sourceId,
      metadata: { achievementSlug: achievement.slug }
    });
  }

  if (effects.streak?.earnedFreezes) {
    await transaction.insertRewardNotification({
      duoId: input.duoId,
      actorUserId: input.actorUserId,
      notificationType: "streak-freeze",
      intensity: "special",
      title: "Streak Freeze na manga",
      body: "A dupla ganhou uma protecao de sequencia.",
      actionRefType: input.sourceType,
      actionRefId: input.sourceId
    });
  }

  if (effects.streak?.consumedFreeze) {
    await transaction.insertRewardNotification({
      duoId: input.duoId,
      actorUserId: input.actorUserId,
      notificationType: "streak-freeze",
      intensity: "quiet",
      title: "Gelo sem drama",
      body: "Um freeze segurou a sequencia da dupla.",
      actionRefType: input.sourceType,
      actionRefId: input.sourceId
    });
  }
}

function factMatchesQuest(
  input: GamificationFactInput,
  template: QuestTemplate
): boolean {
  if (!input.confirmedDuoFact) {
    return false;
  }

  switch (template.eligibilityKey) {
    case "confirmed-session":
      return input.sourceType === "live-session" || input.sourceType === "offline-session";
    case "completed-chapter":
      return input.sourceType === "chapter";
    case "discovery-match":
      return input.sourceType === "discovery-match";
    case "monthly-confirmed-facts":
    case "two-duo-days":
    case "seasonal-spooky":
    case "seasonal-awards":
    case "seasonal-anniversary":
      return [
        "chapter",
        "live-session",
        "offline-session",
        "scheduled-session",
        "terminal-zerado"
      ].includes(input.sourceType);
    default:
      return false;
  }
}

function mapStreakFactType(
  sourceType: GamificationFactSourceType
): StreakFactType | null {
  if (sourceType === "live-session" || sourceType === "offline-session") {
    return "confirmed-session";
  }

  if (sourceType === "chapter") {
    return "completed-chapter";
  }

  if (sourceType === "scheduled-session") {
    return "confirmed-scheduled-attendance";
  }

  if (sourceType === "terminal-zerado" || sourceType === "terminal-dropado") {
    return "confirmed-terminal-status";
  }

  if (sourceType === "quest") {
    return "completed-quest";
  }

  return null;
}

function questSummary(
  cycle: {
    questSlug: string;
    questType: QuestProgressSummaryQuestType;
    cycleKey: string;
  },
  template: QuestTemplate,
  progress: GamificationQuestProgressRecord | undefined,
  xpAwarded: number
): GamificationQuestProgressSummary {
  return {
    questSlug: cycle.questSlug,
    questType: cycle.questType,
    cycleKey: cycle.cycleKey,
    currentValue: progress?.currentValue ?? 0,
    goalValue: template.goalValue,
    completed: Boolean(progress?.completedAt),
    xpAwarded
  };
}

type QuestProgressSummaryQuestType = GamificationQuestProgressSummary["questType"];

function achievementSummary(
  seed: AchievementSeed,
  unlockedAt: Date
): GamificationAchievementSummary {
  return {
    slug: seed.slug,
    title: seed.title,
    rarity: seed.rarity,
    unlockedAt
  };
}

function emptyRewardSummary(
  projection: GamificationProjectionRecord,
  skippedXpReason?: string
): GamificationRewardSummary {
  return {
    totalXpAwarded: 0,
    xpAwards: [],
    levelUp: null,
    achievements: [],
    questProgress: [],
    streak: null,
    projection,
    skippedXpReason: isSkippableXpReason(skippedXpReason)
      ? skippedXpReason
      : undefined
  };
}

function getSkippedXpReason(
  eligibility: XpEligibilityResult
): GamificationRewardSummary["skippedXpReason"] {
  if (eligibility.ok || !isSkippableXpReason(eligibility.reason)) {
    return undefined;
  }

  return eligibility.reason;
}

function isSkippableXpReason(
  reason: string | undefined
): reason is NonNullable<GamificationRewardSummary["skippedXpReason"]> {
  return [
    "source-does-not-award-xp",
    "session-too-short",
    "chapter-daily-cap-reached",
    "invalid-adjustment"
  ].includes(reason ?? "");
}

function readNumber(
  metadata: Record<string, unknown> | undefined,
  key: string
): number | null {
  const value = metadata?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function withProjectedAchievementCount(
  snapshot: AchievementMetricSnapshot
): AchievementMetricSnapshot {
  const unlocked = new Set(snapshot.unlockedAchievementSlugs);
  const newlyQualified = evaluateAchievements(snapshot).filter(
    (achievement) =>
      achievement.predicateKey !== "achievement-count:25" &&
      !unlocked.has(achievement.slug)
  );

  return {
    ...snapshot,
    achievementCount: Math.max(
      snapshot.achievementCount,
      unlocked.size + newlyQualified.length
    )
  };
}
