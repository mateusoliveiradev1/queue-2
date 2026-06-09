import type { DuoRepository } from "./ports";

export type UpdateDuoAudioPreferenceResult =
  | { ok: true; state: "audio-preference-updated" }
  | { ok: false; state: "not-paired" };

export async function updateDuoAudioPreferenceUseCase(
  input: {
    userId: string;
    audioEnabled: boolean;
  },
  repository: Pick<DuoRepository, "getUserContext" | "updateDuoAudioPreference">
): Promise<UpdateDuoAudioPreferenceResult> {
  const context = await repository.getUserContext(input.userId);

  if (!context.membership || !context.membership.pairedAt) {
    return { ok: false, state: "not-paired" };
  }

  const updated = await repository.updateDuoAudioPreference({
    audioEnabled: input.audioEnabled,
    duoId: context.membership.duoId,
    userId: input.userId
  });

  return updated
    ? { ok: true, state: "audio-preference-updated" }
    : { ok: false, state: "not-paired" };
}

