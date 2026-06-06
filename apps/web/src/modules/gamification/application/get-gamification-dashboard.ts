import { getAchievementBySlug } from "../domain/achievement-catalog";
import { getNextLevelProgress } from "../domain/level-curve";
import { getQuestTemplate } from "../domain/quest-catalog";
import type {
  GamificationDashboardRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

const DASHBOARD_ACTIVE_QUEST_LIMIT = 3;
const DASHBOARD_RECENT_ACHIEVEMENT_LIMIT = 3;
const DASHBOARD_RECENT_LEDGER_LIMIT = 5;

export async function getGamificationDashboard(
  input: { userId: GamificationUserId },
  repository?: GamificationRepository
): Promise<GamificationDashboardRecord | null> {
  const resolvedRepository =
    repository ?? (await import("../infrastructure/gamification-repository")).gamificationRepository;

  return resolvedRepository.withUserTransaction(input.userId, async (transaction) =>
    getGamificationDashboardFromTransaction(input, transaction)
  );
}

export async function getGamificationDashboardFromTransaction(
  input: { userId: GamificationUserId },
  transaction: GamificationRepositoryTransaction
): Promise<GamificationDashboardRecord | null> {
  const membership = await transaction.resolveMembership(input.userId);

  if (!membership) {
    return null;
  }

  const projection = await transaction.readProjection(membership.duoId);

  if (!projection) {
    return null;
  }

  const progress = getNextLevelProgress(projection.xp);
  const questCycles = await transaction.readActiveQuestCycles(membership.duoId);
  const questProgress = await transaction.readQuestProgressForCycles({
    duoId: membership.duoId,
    questCycleIds: questCycles.map((cycle) => cycle.id)
  });
  const questProgressByCycleId = new Map(
    questProgress.map((record) => [record.questCycleId, record])
  );
  const achievementUnlocks = await transaction.readAchievementUnlocks(membership.duoId);
  const recentLedger = await transaction.readRecentXpLedgerAwards({
    duoId: membership.duoId,
    limit: DASHBOARD_RECENT_LEDGER_LIMIT
  });

  return {
    duoId: membership.duoId,
    xp: projection.xp,
    level: projection.level,
    nextLevel: progress.nextLevel,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    progressRatio: progress.progressRatio,
    streak: {
      current: projection.streak,
      availableFreezes: projection.availableFreezes
    },
    activeQuests: questCycles
      .slice()
      .sort((left, right) => {
        const typeOrder = questTypeOrder(left.questType) - questTypeOrder(right.questType);

        if (typeOrder !== 0) {
          return typeOrder;
        }

        const dateOrder = left.windowEndAt.getTime() - right.windowEndAt.getTime();

        return dateOrder !== 0 ? dateOrder : left.questSlug.localeCompare(right.questSlug);
      })
      .slice(0, DASHBOARD_ACTIVE_QUEST_LIMIT)
      .map((cycle) => {
        const template = getQuestTemplate(cycle.questSlug);
        const cycleProgress = questProgressByCycleId.get(cycle.id);

        return {
          questSlug: cycle.questSlug,
          questType: cycle.questType,
          cycleKey: cycle.cycleKey,
          title: template?.title ?? cycle.questSlug,
          description: template?.description ?? "",
          currentValue: cycleProgress?.currentValue ?? 0,
          goalValue: template?.goalValue ?? 1,
          completed: Boolean(cycleProgress?.completedAt),
          windowEndAt: cycle.windowEndAt
        };
      }),
    recentAchievements: achievementUnlocks.slice(0, DASHBOARD_RECENT_ACHIEVEMENT_LIMIT).map((unlock) => {
      const seed = getAchievementBySlug(unlock.achievementSlug);

      return {
        slug: unlock.achievementSlug,
        title: seed?.title ?? unlock.achievementSlug,
        rarity: seed?.rarity ?? "common",
        unlockedAt: unlock.unlockedAt
      };
    }),
    recentLedger: recentLedger.map((award) => ({
      id: award.id,
      amount: award.amount,
      reasonCode: award.reasonCode,
      sourceType: award.sourceType,
      awardedAt: award.awardedAt
    })),
    updatedAt: projection.updatedAt
  };
}

function questTypeOrder(questType: "weekly" | "monthly" | "seasonal"): number {
  if (questType === "weekly") {
    return 0;
  }

  if (questType === "monthly") {
    return 1;
  }

  return 2;
}
