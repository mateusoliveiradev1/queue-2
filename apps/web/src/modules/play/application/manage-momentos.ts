import type {
  PlayMomentoRecord,
  PlayRepository
} from "./ports";

export type CreateMomentoResult =
  | {
      ok: true;
      momento: PlayMomentoRecord;
    }
  | {
      ok: false;
      reason:
        | "invalid-momento"
        | "library-game-not-found"
        | "membership-required"
        | "session-not-found";
    };

export type RevealMomentoSpoilerResult =
  | {
      ok: true;
      momento: PlayMomentoRecord;
    }
  | {
      ok: false;
      reason: "membership-required" | "momento-not-found";
    };

export async function createMomentoUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    body: string;
    isSpoiler: boolean;
    sessionId?: string | null;
  },
  repository: PlayRepository
): Promise<CreateMomentoResult> {
  const body = normalizeMomentoBody(input.body);

  if (!body) {
    return { ok: false, reason: "invalid-momento" };
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

    const sessionId = input.sessionId?.trim() || null;

    if (sessionId) {
      const session = await transaction.readSessionDetail({
        duoId: membership.duoId,
        sessionId
      });

      if (!session || session.libraryGameId !== detail.libraryGameId) {
        return { ok: false, reason: "session-not-found" };
      }
    }

    const momento = await transaction.createMomento({
      duoId: membership.duoId,
      libraryGameId: detail.libraryGameId,
      sessionId,
      body,
      isSpoiler: input.isSpoiler,
      actorUserId: input.userId
    });

    return momento
      ? { ok: true, momento }
      : { ok: false, reason: "library-game-not-found" };
  });
}

export async function revealMomentoSpoilerUseCase(
  input: {
    userId: string;
    momentoId: string;
  },
  repository: PlayRepository
): Promise<RevealMomentoSpoilerResult> {
  return repository.withUserTransaction(input.userId, async (transaction) => {
    const membership = await transaction.resolveMembership(input.userId);

    if (!membership) {
      return { ok: false, reason: "membership-required" };
    }

    const momento = await transaction.revealMomento({
      duoId: membership.duoId,
      momentoId: input.momentoId,
      viewerUserId: input.userId
    });

    return momento
      ? { ok: true, momento }
      : { ok: false, reason: "momento-not-found" };
  });
}

function normalizeMomentoBody(input: string): string | null {
  const body = input.replace(/\s+/g, " ").trim();

  if (body.length < 1 || body.length > 2000) {
    return null;
  }

  return body;
}
