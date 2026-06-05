import type {
  CurrentPlayRecord,
  PlayRepository
} from "./ports";

export type GetCurrentPlayResult =
  | {
      ok: true;
      currentPlay: CurrentPlayRecord;
    }
  | {
      ok: false;
      reason: "membership-required";
    };

export async function getCurrentPlayUseCase(
  userId: string,
  repository: PlayRepository
): Promise<GetCurrentPlayResult> {
  const currentPlay = await repository.readCurrentPlay({ userId });

  if (!currentPlay) {
    return {
      ok: false,
      reason: "membership-required"
    };
  }

  return {
    ok: true,
    currentPlay
  };
}
