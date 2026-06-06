import { DUO_DAY_CUTOFF_HOUR } from "../domain/streak-policy";
import {
  ACTIVE_MONTHLY_QUEST_SLOT,
  ACTIVE_WEEKLY_QUEST_SLOTS,
  SEASONAL_QUEST_SEEDS,
  getQuestTemplate,
  type QuestTemplate,
  type QuestType
} from "../domain/quest-catalog";
import type {
  GamificationChallengeQuestRecord,
  GamificationChallengeSectionRecord,
  GamificationChallengesRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

const SECTION_EXPECTED_SLOTS: Record<QuestType, number> = {
  weekly: ACTIVE_WEEKLY_QUEST_SLOTS.length,
  monthly: 1,
  seasonal: SEASONAL_QUEST_SEEDS.length
};

export async function getChallenges(
  input: { userId: GamificationUserId; now?: Date },
  repository?: GamificationRepository
): Promise<GamificationChallengesRecord | null> {
  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;

  return resolvedRepository.withUserTransaction(input.userId, async (transaction) =>
    getChallengesFromTransaction(input, transaction)
  );
}

export async function getChallengesFromTransaction(
  input: { userId: GamificationUserId; now?: Date },
  transaction: GamificationRepositoryTransaction
): Promise<GamificationChallengesRecord | null> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return null;
  }

  const projection = await transaction.readProjection(membership.duoId);

  if (!projection) {
    return null;
  }

  const [timezone, cycles, streakState] = await Promise.all([
    transaction.readDuoTimezone(membership.duoId),
    transaction.readActiveQuestCycles(membership.duoId),
    transaction.readStreakState(membership.duoId)
  ]);
  const progress = await transaction.readQuestProgressForCycles({
    duoId: membership.duoId,
    questCycleIds: cycles.map((cycle) => cycle.id)
  });
  const progressByCycleId = new Map(
    progress.map((progressRecord) => [progressRecord.questCycleId, progressRecord])
  );
  const quests = cycles
    .map((cycle): GamificationChallengeQuestRecord | null => {
      const template = getQuestTemplate(cycle.questSlug);

      if (!template) {
        return null;
      }

      const questProgress = progressByCycleId.get(cycle.id);

      return {
        questSlug: cycle.questSlug,
        questType: cycle.questType,
        cycleKey: cycle.cycleKey,
        title: template.title,
        description: template.description,
        currentValue: questProgress?.currentValue ?? 0,
        goalValue: template.goalValue,
        completed: Boolean(questProgress?.completedAt),
        completedAt: questProgress?.completedAt ?? null,
        xpReward: template.xpReward,
        windowStartAt: cycle.windowStartAt,
        windowEndAt: cycle.windowEndAt,
        timezone: cycle.timezone,
        seasonalKey: template.seasonalKey
      };
    })
    .filter((quest): quest is GamificationChallengeQuestRecord => quest !== null);

  return {
    duoId: membership.duoId,
    timezone,
    generatedAt: input.now ?? new Date(),
    streak: {
      current: streakState?.currentStreak ?? projection.streak,
      longest: streakState?.longestStreak ?? Math.max(projection.streak, 0),
      availableFreezes: streakState?.availableFreezes ?? projection.availableFreezes,
      lastActivityDuoDay: streakState?.lastActivityDuoDay ?? null,
      cutoffHour: DUO_DAY_CUTOFF_HOUR
    },
    sections: [
      section("weekly", quests),
      section("monthly", quests),
      section("seasonal", quests)
    ]
  };
}

function section(
  questType: QuestType,
  quests: GamificationChallengeQuestRecord[]
): GamificationChallengeSectionRecord {
  const selected = quests
    .filter((quest) => quest.questType === questType)
    .sort((left, right) => questOrder(left, right))
    .slice(0, SECTION_EXPECTED_SLOTS[questType]);

  return {
    questType,
    quests: selected,
    expectedSlots: SECTION_EXPECTED_SLOTS[questType]
  };
}

function questOrder(
  left: GamificationChallengeQuestRecord,
  right: GamificationChallengeQuestRecord
): number {
  const typeOrder = preferredTemplateOrder(left) - preferredTemplateOrder(right);

  if (typeOrder !== 0) {
    return typeOrder;
  }

  const dateOrder = left.windowEndAt.getTime() - right.windowEndAt.getTime();

  return dateOrder !== 0 ? dateOrder : left.questSlug.localeCompare(right.questSlug);
}

function preferredTemplateOrder(quest: GamificationChallengeQuestRecord): number {
  if (quest.questType === "weekly") {
    return indexOrFallback(ACTIVE_WEEKLY_QUEST_SLOTS, quest.questSlug);
  }

  if (quest.questType === "monthly") {
    return quest.questSlug === ACTIVE_MONTHLY_QUEST_SLOT ? 0 : 99;
  }

  return indexOrFallback(SEASONAL_QUEST_SEEDS, quest.questSlug);
}

function indexOrFallback(
  templates: readonly QuestTemplate["slug"][],
  slug: string
): number {
  const index = templates.indexOf(slug);

  return index >= 0 ? index : 99;
}
