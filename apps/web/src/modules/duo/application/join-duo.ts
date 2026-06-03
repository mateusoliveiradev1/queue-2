import {
  canJoinPairingCode,
  classifyMembershipState,
  validatePlainText
} from "../domain/duo-policy";
import {
  isPairingCodeFormat,
  normalizePairingCode,
  type PairingJoinFailureState
} from "../domain/pairing-code";
import type {
  DuoRepository,
  PairingAttemptLimiter,
  PairingRateLimitResult
} from "./ports";

export type JoinDuoResult =
  | {
      ok: true;
      state: "paired";
      duoId: string;
    }
  | {
      ok: false;
      state: PairingJoinFailureState;
      attemptsRemaining?: number;
      retryAfterSeconds?: number;
    };

export async function joinDuoUseCase(
  input: {
    userId: string;
    displayName: string;
    code: string;
  },
  dependencies: {
    repository: DuoRepository;
    limiter: PairingAttemptLimiter;
  }
): Promise<JoinDuoResult> {
  const normalizedCode = normalizePairingCode(input.code);

  if (!isPairingCodeFormat(normalizedCode)) {
    return { ok: false, state: "invalid" };
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

  if (!canJoinPairingCode(membershipState)) {
    return { ok: false, state: "already-paired" };
  }

  const limit = await dependencies.limiter.consume(input.userId);

  if (limit.blocked) {
    return withLimitState("attempt-limited", limit);
  }

  const outcome = await dependencies.repository.claimPairingCode({
    userId: input.userId,
    code: normalizedCode
  });

  if (outcome.state === "claimed") {
    return {
      ok: true,
      state: "paired",
      duoId: outcome.duoId
    };
  }

  if (outcome.state === "already-paired") {
    return { ok: false, state: "already-paired" };
  }

  if (outcome.state === "race-lost") {
    return withLimitState("race-lost", limit);
  }

  return withLimitState("inactive", limit);
}

function withLimitState(
  state: PairingJoinFailureState,
  limit: PairingRateLimitResult
): JoinDuoResult {
  return {
    ok: false,
    state,
    attemptsRemaining: limit.attemptsRemaining,
    retryAfterSeconds: limit.retryAfterSeconds
  };
}
