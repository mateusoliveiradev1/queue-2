import type {
  GamePlayDetailRecord,
  PlayRepository
} from "./ports";

export type GetGamePlayDetailResult =
  | {
      ok: true;
      detail: GamePlayDetailRecord;
    }
  | {
      ok: false;
      reason: "library-game-not-found" | "membership-required";
    };

export async function getGamePlayDetailUseCase(
  input: {
    userId: string;
    catalogGameId: string;
  },
  repository: PlayRepository
): Promise<GetGamePlayDetailResult> {
  const detail = await repository.readGamePlayDetail(input);

  if (!detail) {
    const membership = await repository.resolveMembership(input.userId);
    return {
      ok: false,
      reason: membership ? "library-game-not-found" : "membership-required"
    };
  }

  return {
    ok: true,
    detail
  };
}
