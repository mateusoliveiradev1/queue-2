"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateDuoAudioPreference } from "../../../modules/duo";
import {
  discardRouletteResult,
  lockRouletteResultAsPrincipal,
  replayRouletteRound,
  startRouletteRound
} from "../../../modules/roulette";
import { requireAuthoritativeVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";

export type RouletteActionResult =
  | {
      ok: true;
      state:
        | "audio-preference-updated"
        | "result-discarded"
        | "result-locked"
        | "round-replayed"
        | "round-resumed"
        | "round-started";
      audioEnabled?: boolean;
      isReplay?: boolean;
      redirectTo?:
        | "/app"
        | "/app?estado=roleta-principal"
        | "/app/roleta?estado=roleta-descartada";
      roundId?: string;
    }
  | {
      ok: false;
      reason: string;
      state:
        | "audio-preference-failed"
        | "insufficient-boost"
        | "invalid-input"
        | "membership-required"
        | "minimum-eligible-pool"
        | "play-handoff-failed"
        | "replacement-required"
        | "round-failed"
        | "round-not-found"
        | "round-not-pending"
        | "round-not-replayable";
      currentGames?: unknown[];
      eligibleCount?: number;
      autoPause?: false;
      redirectTo?: "/parear";
      requiredEligibleCount?: number;
    };

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[A-Za-z0-9:_-]+$/);
const uuidSchema = z.string().uuid();
const startTimingContext = { action: "unknown" } as const;
const replayTimingContext = { action: "unknown" } as const;
const audioTimingContext = { action: "unknown" } as const;
const lockTimingContext = { action: "unknown" } as const;
const discardTimingContext = { action: "unknown" } as const;

export async function startRouletteRoundAction(
  formData: FormData
): Promise<RouletteActionResult> {
  return withServerTiming(startTimingContext, () =>
    startRouletteRoundActionTimed(formData)
  );
}

async function startRouletteRoundActionTimed(
  formData: FormData
): Promise<RouletteActionResult> {
  const session = await measureStage("auth", startTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const input = await measureStage("validation", startTimingContext, async () => {
    const idempotencyKey = idempotencyKeySchema.safeParse(
      getFormString(formData, "idempotencyKey")
    );

    if (!idempotencyKey.success) {
      return null;
    }

    return {
      idempotencyKey: idempotencyKey.data,
      useBoost: getFormBoolean(formData, "useBoost")
    };
  });

  if (!input) {
    return { ok: false, reason: "invalid-input", state: "invalid-input" };
  }

  const result = await measureStage("database", startTimingContext, () =>
    startRouletteRound({
      idempotencyKey: input.idempotencyKey,
      useBoost: input.useBoost,
      userId: session.user.id
    })
  );

  if (!result.ok) {
    return startFailureToActionResult(result);
  }

  revalidatePath("/app/roleta");

  return {
    ok: true,
    roundId: result.round.id,
    state: result.resumedExistingRound ? "round-resumed" : "round-started"
  };
}

export async function replayRouletteRoundAction(
  formData: FormData
): Promise<RouletteActionResult> {
  return withServerTiming(replayTimingContext, () =>
    replayRouletteRoundActionTimed(formData)
  );
}

async function replayRouletteRoundActionTimed(
  formData: FormData
): Promise<RouletteActionResult> {
  const session = await measureStage("auth", replayTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const roundId = await measureStage("validation", replayTimingContext, async () => {
    const parsed = uuidSchema.safeParse(getFormString(formData, "roundId"));
    return parsed.success ? parsed.data : null;
  });

  if (!roundId) {
    return { ok: false, reason: "invalid-input", state: "invalid-input" };
  }

  const result = await measureStage("database", replayTimingContext, () =>
    replayRouletteRound({
      roundId,
      userId: session.user.id
    })
  );

  if (!result.ok) {
    return replayFailureToActionResult(result.reason);
  }

  revalidatePath("/app/roleta");

  return {
    isReplay: true,
    ok: true,
    roundId: result.round.id,
    state: "round-replayed"
  };
}

export async function updateRouletteAudioPreferenceAction(
  formData: FormData
): Promise<RouletteActionResult> {
  return withServerTiming(audioTimingContext, () =>
    updateRouletteAudioPreferenceActionTimed(formData)
  );
}

async function updateRouletteAudioPreferenceActionTimed(
  formData: FormData
): Promise<RouletteActionResult> {
  const session = await measureStage("auth", audioTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const audioEnabled = await measureStage("validation", audioTimingContext, async () =>
    getFormBoolean(formData, "audioEnabled")
  );
  const result = await measureStage("database", audioTimingContext, () =>
    updateDuoAudioPreference({
      audioEnabled,
      userId: session.user.id
    })
  );

  if (!result.ok) {
    return {
      ok: false,
      reason: result.state,
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  revalidatePath("/app/roleta");

  return {
    audioEnabled,
    ok: true,
    state: "audio-preference-updated"
  };
}

export async function lockRouletteResultAction(
  formData: FormData
): Promise<RouletteActionResult> {
  return withServerTiming(lockTimingContext, () =>
    lockRouletteResultActionTimed(formData)
  );
}

async function lockRouletteResultActionTimed(
  formData: FormData
): Promise<RouletteActionResult> {
  const session = await measureStage("auth", lockTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const input = await measureStage("validation", lockTimingContext, async () => {
    const parsedRoundId = uuidSchema.safeParse(getFormString(formData, "roundId"));
    const replacementCandidate = getFormString(formData, "replacementLibraryGameId");
    const parsedReplacement = replacementCandidate
      ? uuidSchema.safeParse(replacementCandidate)
      : null;

    if (!parsedRoundId.success || (parsedReplacement && !parsedReplacement.success)) {
      return null;
    }

    return {
      replacementLibraryGameId: parsedReplacement?.data ?? null,
      roundId: parsedRoundId.data
    };
  });

  if (!input) {
    return { ok: false, reason: "invalid-input", state: "invalid-input" };
  }

  const result = await measureStage("database", lockTimingContext, () =>
    lockRouletteResultAsPrincipal({
      replacement: input.replacementLibraryGameId
        ? {
            action: "replace",
            libraryGameId: input.replacementLibraryGameId
          }
        : undefined,
      roundId: input.roundId,
      userId: session.user.id
    })
  );

  if (!result.ok) {
    return lockFailureToActionResult(result);
  }

  revalidatePath("/app");
  revalidatePath("/app/roleta");

  return {
    ok: true,
    redirectTo: result.redirectTo,
    roundId: result.round.id,
    state: "result-locked"
  };
}

export async function discardRouletteResultAction(
  formData: FormData
): Promise<RouletteActionResult> {
  return withServerTiming(discardTimingContext, () =>
    discardRouletteResultActionTimed(formData)
  );
}

async function discardRouletteResultActionTimed(
  formData: FormData
): Promise<RouletteActionResult> {
  const session = await measureStage("auth", discardTimingContext, () =>
    requireAuthoritativeVerifiedSession()
  );
  const roundId = await measureStage("validation", discardTimingContext, async () => {
    const parsed = uuidSchema.safeParse(getFormString(formData, "roundId"));
    return parsed.success ? parsed.data : null;
  });

  if (!roundId) {
    return { ok: false, reason: "invalid-input", state: "invalid-input" };
  }

  const result = await measureStage("database", discardTimingContext, () =>
    discardRouletteResult({
      roundId,
      userId: session.user.id
    })
  );

  if (!result.ok) {
    return discardFailureToActionResult(result.reason);
  }

  revalidatePath("/app");
  revalidatePath("/app/roleta");

  return {
    ok: true,
    redirectTo: "/app/roleta?estado=roleta-descartada",
    roundId: result.round.id,
    state: "result-discarded"
  };
}

function startFailureToActionResult(
  result: Awaited<ReturnType<typeof startRouletteRound>>
): RouletteActionResult {
  if (result.ok) {
    return {
      ok: true,
      roundId: result.round.id,
      state: result.resumedExistingRound ? "round-resumed" : "round-started"
    };
  }

  switch (result.reason) {
    case "membership-required":
      return {
        ok: false,
        reason: result.reason,
        redirectTo: "/parear",
        state: "membership-required"
      };
    case "minimum-eligible-pool":
      return {
        eligibleCount: result.eligibleCount,
        ok: false,
        reason: result.reason,
        requiredEligibleCount: result.requiredEligibleCount,
        state: "minimum-eligible-pool"
      };
    case "insufficient-boost-balance":
      return {
        ok: false,
        reason: result.reason,
        state: "insufficient-boost"
      };
    case "round-persist-failed":
      return {
        ok: false,
        reason: result.reason,
        state: "round-failed"
      };
  }
}

function replayFailureToActionResult(
  reason: "membership-required" | "round-not-found" | "round-not-replayable"
): RouletteActionResult {
  if (reason === "membership-required") {
    return {
      ok: false,
      reason,
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  return {
    ok: false,
    reason,
    state: reason
  };
}

function lockFailureToActionResult(
  result: Awaited<ReturnType<typeof lockRouletteResultAsPrincipal>>
): RouletteActionResult {
  if (result.ok) {
    return {
      ok: true,
      redirectTo: result.redirectTo,
      roundId: result.round.id,
      state: "result-locked"
    };
  }

  switch (result.reason) {
    case "membership-required":
      return {
        ok: false,
        reason: result.reason,
        redirectTo: "/parear",
        state: "membership-required"
      };
    case "replacement-required":
      return {
        autoPause: result.autoPause,
        currentGames: result.currentGames,
        ok: false,
        reason: result.reason,
        state: "replacement-required"
      };
    case "play-handoff-failed":
    case "round-not-found":
    case "round-not-pending":
      return {
        ok: false,
        reason: result.reason,
        state: result.reason
      };
  }
}

function discardFailureToActionResult(
  reason: "membership-required" | "round-not-found" | "round-not-pending"
): RouletteActionResult {
  if (reason === "membership-required") {
    return {
      ok: false,
      reason,
      redirectTo: "/parear",
      state: "membership-required"
    };
  }

  return {
    ok: false,
    reason,
    state: reason
  };
}

function getFormString(
  formData: FormData,
  key: "idempotencyKey" | "replacementLibraryGameId" | "roundId"
): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormBoolean(formData: FormData, key: "audioEnabled" | "useBoost"): boolean {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return false;
  }

  return value === "1" || value === "true" || value === "on";
}
