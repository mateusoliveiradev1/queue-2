import {
  canCreatePairingCode,
  classifyMembershipState,
  DEFAULT_DUO_TIMEZONE
} from "../domain/duo-policy";
import {
  createPairingCodeFromRandomIndex,
  getPairingCodeExpiry
} from "../domain/pairing-code";
import type { DuoRepository, PairingCodeRecord } from "./ports";

export type CreatePairingCodeResult =
  | { ok: true; state: "code-created" | "code-active"; code: PairingCodeRecord }
  | { ok: false; state: "already-paired" };

export async function createPairingCodeUseCase(
  input: {
    userId: string;
    displayName: string;
    timezone?: string;
  },
  dependencies: {
    repository: DuoRepository;
    randomIndex: (upperBound: number) => number;
    now: () => Date;
  }
): Promise<CreatePairingCodeResult> {
  await dependencies.repository.ensureProfile(input.userId, input.displayName);

  const context = await dependencies.repository.getUserContext(input.userId);
  const membershipState = classifyMembershipState({
    memberCount: context.membership?.members.length ?? 0,
    pairedAt: context.membership?.pairedAt ?? null
  });

  if (!canCreatePairingCode(membershipState)) {
    return { ok: false, state: "already-paired" };
  }

  const activeCode = await dependencies.repository.getActivePairingCode(input.userId);

  if (activeCode) {
    return { ok: true, state: "code-active", code: activeCode };
  }

  const now = dependencies.now();
  const code = createPairingCodeFromRandomIndex(dependencies.randomIndex);
  const expiresAt = getPairingCodeExpiry(now);

  const createdCode = context.membership
    ? await dependencies.repository.createPairingCodeForExistingDuo({
        userId: input.userId,
        duoId: context.membership.duoId,
        code,
        expiresAt
      })
    : await dependencies.repository.createDuoWithPairingCode({
        userId: input.userId,
        code,
        expiresAt,
        timezone: input.timezone?.trim() || DEFAULT_DUO_TIMEZONE
      });

  return { ok: true, state: "code-created", code: createdCode };
}

export async function revokePairingCodeUseCase(
  input: { userId: string; pairingCodeId: string },
  repository: DuoRepository
): Promise<{ ok: true; state: "code-revoked" } | { ok: false; state: "code-inactive" }> {
  const revoked = await repository.revokePairingCode(input);

  return revoked
    ? { ok: true, state: "code-revoked" }
    : { ok: false, state: "code-inactive" };
}
