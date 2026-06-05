import type {
  PlayChapterRecord,
  PlayRepository,
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
      xpAward: PlayXpAwardRecord | null;
    }
  | {
      ok: false;
      reason: "chapter-not-found" | "membership-required";
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
  return repository.withUserTransaction(input.userId, async (transaction) => {
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

    return {
      ok: true,
      ...result
    };
  });
}
