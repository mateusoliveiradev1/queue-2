import type {
  PlayGamificationXpAwardRecord,
  PlayChapterRecord,
  PlayRepository,
  PlayRewardSummary,
  PlayXpAwardRecord
} from "./ports";

export type CreatePlayChapterResult =
  | {
      ok: true;
      chapter: PlayChapterRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-title"
        | "library-game-not-found"
        | "membership-required";
    };

export type SetPlayChapterCompletionResult =
  | {
      ok: true;
      chapter: PlayChapterRecord;
      reward: PlayRewardSummary | null;
      xpAward: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason: "chapter-not-found" | "membership-required" | "reward-application-failed";
      rewardFailureReason?: string;
    };

export async function createPlayChapterUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    title: string;
  },
  repository: PlayRepository
): Promise<CreatePlayChapterResult> {
  const title = input.title.trim();

  if (title.length < 1 || title.length > 120) {
    return { ok: false, reason: "invalid-title" };
  }

  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const detail = await transaction.readGamePlayDetail({
      duoId: membership.duoId,
      catalogGameId: input.catalogGameId
    });

    if (!detail) {
      return { ok: false, reason: "library-game-not-found" };
    }

    return {
      ok: true,
      chapter: await transaction.createChapter({
        duoId: membership.duoId,
        libraryGameId: detail.libraryGameId,
        title,
        actorUserId: input.userId
      })
    };
  });
}

export async function setPlayChapterCompletionUseCase(
  input: {
    userId: string;
    chapterId: string;
    completed: boolean;
  },
  repository: PlayRepository
): Promise<SetPlayChapterCompletionResult> {
  try {
    return await repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const result = await transaction.setChapterCompletion({
      duoId: membership.duoId,
      chapterId: input.chapterId,
      actorUserId: input.userId,
      completed: input.completed
    });

    if (!result) {
      return { ok: false, reason: "chapter-not-found" };
    }

    const rewardResult = input.completed
      ? await transaction.applyGamificationFact({
          duoId: membership.duoId,
          actorUserId: input.userId,
          sourceType: "chapter",
          sourceId: result.chapter.id,
          occurredAt: result.chapter.completedAt ?? result.chapter.updatedAt,
          confirmedDuoFact: true,
          metadata: {
            chapterTitle: result.chapter.title,
            libraryGameId: result.chapter.libraryGameId
          }
        })
      : null;

    if (rewardResult && !rewardResult.ok) {
      throw new RewardApplicationError(rewardResult.reason);
    }

    return {
      ok: true,
      chapter: result.chapter,
      reward: rewardResult?.summary ?? null,
      xpAward: toPlayXpAward(rewardResult?.ok ? rewardResult.summary.xpAwards[0] : undefined)
    };
  });
  } catch (error) {
    if (error instanceof RewardApplicationError) {
      return {
        ok: false,
        reason: "reward-application-failed",
        rewardFailureReason: error.reason
      };
    }

    throw error;
  }
}

class RewardApplicationError extends Error {
  constructor(readonly reason: string) {
    super(`play_reward_application_failed:${reason}`);
  }
}

function toPlayXpAward(
  award: PlayGamificationXpAwardRecord | undefined
): PlayXpAwardRecord | null {
  return award
    ? {
        id: award.id,
        duoId: award.duoId,
        awardKey: award.awardKey,
        sourceType: award.sourceType,
        sourceId: award.sourceId,
        amount: award.amount,
        awardedByUserId: award.awardedByUserId,
        metadata: award.metadata,
        awardedAt: award.awardedAt
      }
    : null;
}
