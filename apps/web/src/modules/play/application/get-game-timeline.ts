import type {
  GameTimelineRecord,
  PlayRepository
} from "./ports";

export type GetGameTimelineResult =
  | {
      ok: true;
      timeline: GameTimelineRecord;
    }
  | {
      ok: false;
      reason: "library-game-not-found" | "membership-required";
    };

export async function getGameTimelineUseCase(
  input: {
    userId: string;
    catalogGameId: string;
    estimatedMinutes: number | null;
  },
  repository: PlayRepository
): Promise<GetGameTimelineResult> {
  const timeline = await repository.readGameTimeline(input);

  if (!timeline) {
    const membership = await repository.resolveMembership(input.userId);
    return {
      ok: false,
      reason: membership ? "library-game-not-found" : "membership-required"
    };
  }

  return {
    ok: true,
    timeline
  };
}
