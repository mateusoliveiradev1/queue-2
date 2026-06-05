import type {
  PlayNotificationCenterRecord,
  PlayRepository
} from "./ports";

export type GetDuoNotificationsResult =
  | {
      ok: true;
      center: PlayNotificationCenterRecord;
    }
  | {
      ok: false;
      reason: "membership-required";
    };

export async function getDuoNotificationsUseCase(
  input: {
    userId: string;
    limit?: number;
  },
  repository: PlayRepository
): Promise<GetDuoNotificationsResult> {
  const center = await repository.readNotificationCenter({
    limit: input.limit ?? 12,
    userId: input.userId
  });

  return center
    ? { ok: true, center }
    : { ok: false, reason: "membership-required" };
}
