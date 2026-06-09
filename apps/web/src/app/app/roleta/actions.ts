"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateDuoAudioPreference } from "../../../modules/duo";
import {
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
        | "round-replayed"
        | "round-resumed"
        | "round-started";
      audioEnabled?: boolean;
      isReplay?: boolean;
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
        | "round-failed"
        | "round-not-found"
        | "round-not-replayable";
      eligibleCount?: number;
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

function getFormString(formData: FormData, key: "idempotencyKey" | "roundId"): string {
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

