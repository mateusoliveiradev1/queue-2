import { getAchievementBySlug } from "../domain/achievement-catalog";
import { getNextLevelProgress } from "../domain/level-curve";
import { getQuestTemplate } from "../domain/quest-catalog";
import type {
  GamificationDashboardRecord,
  GamificationRepository,
  GamificationRepositoryTransaction,
  GamificationUserId
} from "./ports";

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
    activeQuests: questCycles.map((cycle) => {
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
    recentAchievements: achievementUnlocks.slice(0, 8).map((unlock) => {
      const seed = getAchievementBySlug(unlock.achievementSlug);

      return {
        slug: unlock.achievementSlug,
        title: seed?.title ?? unlock.achievementSlug,
        rarity: seed?.rarity ?? "common",
        unlockedAt: unlock.unlockedAt
      };
    }),
    updatedAt: projection.updatedAt
  };
}
