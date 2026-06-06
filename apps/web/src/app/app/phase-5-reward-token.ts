import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  toRewardToastView,
  type GamificationRewardSummary,
  type RewardToastViewModel
} from "../../modules/gamification";

const REWARD_TOKEN_VERSION = 1;
const REWARD_TOKEN_MAX_AGE_SECONDS = 5 * 60;
const REWARD_TOKEN_MAX_LENGTH = 4096;

export type RewardTokenSubject = {
  userId: string;
  duoId: string;
};

type RewardTokenRuntime = {
  now?: Date;
  secret?: string;
};

type RewardTokenPayload = {
  v: typeof REWARD_TOKEN_VERSION;
  iat: number;
  exp: number;
  sub: string;
  view: RewardToastViewModel;
};

export function createRewardToken(
  input: {
    subject: RewardTokenSubject;
    summary: GamificationRewardSummary;
  },
  runtime: RewardTokenRuntime = {}
): string | null {
  const view = toRewardToastView(input.summary);

  if (!view) {
    return null;
  }

  const secret = resolveSecret(runtime.secret);
  const issuedAt = toEpochSeconds(runtime.now ?? new Date());
  const payload: RewardTokenPayload = {
    v: REWARD_TOKEN_VERSION,
    iat: issuedAt,
    exp: issuedAt + REWARD_TOKEN_MAX_AGE_SECONDS,
    sub: createSubject(input.subject, secret),
    view
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyRewardToken(
  token: string | null | undefined,
  subject: RewardTokenSubject,
  runtime: RewardTokenRuntime = {}
): RewardToastViewModel | null {
  if (!token || token.length > REWARD_TOKEN_MAX_LENGTH) {
    return null;
  }

  try {
    const [encodedPayload, encodedSignature, extra] = token.split(".");

    if (!encodedPayload || !encodedSignature || extra !== undefined) {
      return null;
    }

    const secret = resolveSecret(runtime.secret);
    const expectedSignature = sign(encodedPayload, secret);

    if (!constantTimeEqual(encodedSignature, expectedSignature)) {
      return null;
    }

    const payload = parsePayload(encodedPayload);

    if (!payload) {
      return null;
    }

    const now = toEpochSeconds(runtime.now ?? new Date());

    if (
      payload.iat > now
      || payload.exp <= now
      || payload.exp - payload.iat > REWARD_TOKEN_MAX_AGE_SECONDS
    ) {
      return null;
    }

    const expectedSubject = createSubject(subject, secret);

    if (!constantTimeEqual(payload.sub, expectedSubject)) {
      return null;
    }

    return payload.view;
  } catch {
    return null;
  }
}

function createSubject(subject: RewardTokenSubject, secret: string): string {
  return createHmac("sha256", secret)
    .update("queue2:reward-subject:v1:")
    .update(JSON.stringify([subject.userId, subject.duoId]))
    .digest("base64url");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("queue2:reward-token:v1:")
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function parsePayload(encodedPayload: string): RewardTokenPayload | null {
  const parsed = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as unknown;

  if (!isRecord(parsed) || parsed.v !== REWARD_TOKEN_VERSION) {
    return null;
  }

  if (
    !Number.isSafeInteger(parsed.iat)
    || !Number.isSafeInteger(parsed.exp)
    || typeof parsed.sub !== "string"
    || parsed.sub.length < 32
    || !isRewardToastView(parsed.view)
  ) {
    return null;
  }

  return {
    v: REWARD_TOKEN_VERSION,
    iat: parsed.iat as number,
    exp: parsed.exp as number,
    sub: parsed.sub,
    view: parsed.view
  };
}

function isRewardToastView(value: unknown): value is RewardToastViewModel {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isBoundedString(value.key, 1, 240)
    && isBoundedString(value.title, 1, 160)
    && isBoundedString(value.body, 1, 320)
    && (value.variant === "calm" || value.variant === "special")
    && isBoundedString(value.inlineLabel, 1, 240)
  );
}

function isBoundedString(
  value: unknown,
  minimumLength: number,
  maximumLength: number
): value is string {
  return (
    typeof value === "string"
    && value.length >= minimumLength
    && value.length <= maximumLength
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveSecret(secret: string | undefined): string {
  const resolved = secret ?? process.env.BETTER_AUTH_SECRET;

  if (!resolved) {
    throw new Error("BETTER_AUTH_SECRET is required for reward feedback tokens.");
  }

  return resolved;
}

function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
