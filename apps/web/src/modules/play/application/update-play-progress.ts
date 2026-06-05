import type {
  PlayProgressRecord,
  PlayRepository
} from "./ports";

export type UpdatePlayProgressResult =
  | {
      ok: true;
      progress: PlayProgressRecord;
    }
  | {
      ok: false;
      reason:
        | "library-game-not-found"
        | "membership-required"
        | "percent-out-of-range";
    };

export async function updatePlayProgressUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    subjectivePercent: number | null;
  },
  repository: PlayRepository
): Promise<UpdatePlayProgressResult> {
  const percent =
    input.subjectivePercent === null ? null : Math.floor(input.subjectivePercent);

  if (percent !== null && (percent < 0 || percent > 100)) {
    return { ok: false, reason: "percent-out-of-range" };
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
      progress: await transaction.updateProgressPercent({
        duoId: membership.duoId,
        libraryGameId: detail.libraryGameId,
        actorUserId: input.userId,
        subjectivePercent: percent
      })
    };
  });
}
