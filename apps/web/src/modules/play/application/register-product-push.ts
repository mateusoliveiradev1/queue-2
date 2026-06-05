import type {
  PlayPushSubscriptionInput,
  PlayPushSubscriptionRecord,
  PlayRepository,
  PlayUserId
} from "./ports";

export const PRODUCT_PUSH_ENDPOINT_MAX_LENGTH = 2048;
export const PRODUCT_PUSH_KEY_MAX_LENGTH = 512;
export const PRODUCT_PUSH_AUTH_MAX_LENGTH = 256;

export type BrowserProductPushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type ProductPushSubscriptionResult =
  | {
      ok: true;
      subscription?: PlayPushSubscriptionRecord;
      state: "enabled" | "disabled";
    }
  | {
      ok: false;
      reason:
        | "invalid-endpoint"
        | "invalid-key-material"
        | "membership-required";
    };

export async function registerProductPushUseCase(
  input: {
    userId: PlayUserId;
    subscription: BrowserProductPushSubscriptionPayload;
    userAgent?: string | null;
  },
  repository: PlayRepository
): Promise<ProductPushSubscriptionResult> {
  const normalized = normalizeProductPushInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  const subscription = await repository.registerPushSubscription(normalized.input);

  if (!subscription) {
    return { ok: false, reason: "membership-required" };
  }

  return {
    ok: true,
    state: "enabled",
    subscription
  };
}

export async function disableProductPushUseCase(
  input: {
    userId: PlayUserId;
    endpoint?: string | null;
  },
  repository: PlayRepository
): Promise<ProductPushSubscriptionResult> {
  const endpoint = input.endpoint?.trim() || null;

  if (endpoint && !isValidEndpoint(endpoint)) {
    return { ok: false, reason: "invalid-endpoint" };
  }

  await repository.disablePushSubscriptions({
    endpoint,
    userId: input.userId
  });

  return {
    ok: true,
    state: "disabled"
  };
}

export async function getProductPushPublicConfig() {
  const { getVapidPublicConfig } = await import("../infrastructure/push-service");
  return getVapidPublicConfig();
}

function normalizeProductPushInput(input: {
  userId: PlayUserId;
  subscription: BrowserProductPushSubscriptionPayload;
  userAgent?: string | null;
}):
  | {
      ok: true;
      input: PlayPushSubscriptionInput;
    }
  | {
      ok: false;
      reason: "invalid-endpoint" | "invalid-key-material";
    } {
  const endpoint = input.subscription.endpoint.trim();
  const p256dh = input.subscription.keys.p256dh.trim();
  const authSecret = input.subscription.keys.auth.trim();

  if (!isValidEndpoint(endpoint)) {
    return { ok: false, reason: "invalid-endpoint" };
  }

  if (
    !isValidPushKey(p256dh, PRODUCT_PUSH_KEY_MAX_LENGTH) ||
    !isValidPushKey(authSecret, PRODUCT_PUSH_AUTH_MAX_LENGTH)
  ) {
    return { ok: false, reason: "invalid-key-material" };
  }

  return {
    ok: true,
    input: {
      authSecret,
      endpoint,
      p256dh,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
      userId: input.userId
    }
  };
}

function isValidEndpoint(endpoint: string): boolean {
  if (endpoint.length < 12 || endpoint.length > PRODUCT_PUSH_ENDPOINT_MAX_LENGTH) {
    return false;
  }

  try {
    const url = new URL(endpoint);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPushKey(value: string, maxLength: number): boolean {
  return (
    value.length >= 8 &&
    value.length <= maxLength &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}
