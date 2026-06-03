import {
  isValidTimezone,
  validatePlainText
} from "../domain/duo-policy";
import type { DuoRepository } from "./ports";

export type UpdateDuoSettingsResult =
  | { ok: true; state: "duo-updated" }
  | { ok: false; state: "invalid-name" | "invalid-timezone" | "not-paired" };

export type UpdateProfileResult =
  | { ok: true; state: "profile-updated" }
  | { ok: false; state: "invalid-display-name" };

export async function updateDuoSettingsUseCase(
  input: {
    userId: string;
    name: string;
    timezone: string;
    notificationsEnabled: boolean;
    audioEnabled: boolean;
  },
  repository: DuoRepository
): Promise<UpdateDuoSettingsResult> {
  const name = validatePlainText(input.name, "duo-name");

  if (!name.ok) {
    return { ok: false, state: "invalid-name" };
  }

  if (!isValidTimezone(input.timezone)) {
    return { ok: false, state: "invalid-timezone" };
  }

  const context = await repository.getUserContext(input.userId);

  if (!context.membership || !context.membership.pairedAt) {
    return { ok: false, state: "not-paired" };
  }

  const updated = await repository.updateDuoSettings({
    userId: input.userId,
    duoId: context.membership.duoId,
    name: name.value,
    timezone: input.timezone.trim(),
    notificationsEnabled: input.notificationsEnabled,
    audioEnabled: input.audioEnabled
  });

  return updated
    ? { ok: true, state: "duo-updated" }
    : { ok: false, state: "not-paired" };
}

export async function updateProfileDisplayNameUseCase(
  input: { userId: string; displayName: string },
  repository: DuoRepository
): Promise<UpdateProfileResult> {
  const displayName = validatePlainText(input.displayName, "display-name");

  if (!displayName.ok) {
    return { ok: false, state: "invalid-display-name" };
  }

  await repository.updateProfileDisplayName({
    userId: input.userId,
    displayName: displayName.value
  });

  return { ok: true, state: "profile-updated" };
}
