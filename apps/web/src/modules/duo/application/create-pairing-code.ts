import {
  canCreatePairingCode,
  classifyMembershipState,
  DEFAULT_DUO_TIMEZONE,
  isValidTimezone,
  validatePlainText
} from "../domain/duo-policy";
import {
  createPairingCodeFromRandomIndex,
  getPairingCodeExpiry,
  isPairingCodeId
} from "../domain/pairing-code";
import type { DuoRepository, PairingCodeRecord } from "./ports";

export type CreatePairingCodeResult =
  | { ok: true; state: "code-created" | "code-active"; code: PairingCodeRecord }
  | { ok: false; state: "already-paired" | "invalid-timezone" };

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
  const timezone = input.timezone?.trim() || DEFAULT_DUO_TIMEZONE;

  if (!isValidTimezone(timezone)) {
    return { ok: false, state: "invalid-timezone" };
  }

  const displayName = validatePlainText(input.displayName, "display-name");
  await dependencies.repository.ensureProfile(
    input.userId,
    displayName.ok ? displayName.value : "Jogador da fila"
  );

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
        timezone
      });

  return { ok: true, state: "code-created", code: createdCode };
}

export async function revokePairingCodeUseCase(
  input: { userId: string; pairingCodeId: string },
  repository: DuoRepository
): Promise<{ ok: true; state: "code-revoked" } | { ok: false; state: "code-inactive" }> {
  if (!isPairingCodeId(input.pairingCodeId)) {
    return { ok: false, state: "code-inactive" };
  }

  const revoked = await repository.revokePairingCode(input);

  return revoked
    ? { ok: true, state: "code-revoked" }
    : { ok: false, state: "code-inactive" };
}
