import type {
  DiscoveryPushSubscriptionInput,
  DiscoveryPushSubscriptionResult,
  DiscoveryRepository,
  DiscoveryUserId
} from "./ports";

export const DISCOVERY_PUSH_ENDPOINT_MAX_LENGTH = 2048;
export const DISCOVERY_PUSH_KEY_MAX_LENGTH = 512;
export const DISCOVERY_PUSH_AUTH_MAX_LENGTH = 256;

export type BrowserPushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type RegisterDiscoveryPushSubscriptionInput = {
  userId: DiscoveryUserId;
  subscription: BrowserPushSubscriptionPayload;
  userAgent?: string | null;
};

export async function registerDiscoveryPushSubscriptionUseCase(
  input: RegisterDiscoveryPushSubscriptionInput,
  repository: Pick<DiscoveryRepository, "registerPushSubscription">
): Promise<DiscoveryPushSubscriptionResult> {
  const normalized = normalizePushSubscriptionInput(input);

  if (!normalized.ok) {
    return normalized;
  }

  return repository.registerPushSubscription(normalized.input);
}

export async function disableDiscoveryPushSubscriptionUseCase(
  input: {
    userId: DiscoveryUserId;
    endpoint: string;
  },
  repository: Pick<DiscoveryRepository, "disablePushSubscription">
): Promise<DiscoveryPushSubscriptionResult> {
  const endpoint = input.endpoint.trim();

  if (!isValidEndpoint(endpoint)) {
    return { ok: false, reason: "invalid-endpoint" };
  }

  return repository.disablePushSubscription({
    userId: input.userId,
    endpoint
  });
}

export async function registerDiscoveryPushSubscription(
  input: RegisterDiscoveryPushSubscriptionInput
): Promise<DiscoveryPushSubscriptionResult> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  return registerDiscoveryPushSubscriptionUseCase(input, discoveryRepository);
}

export async function disableDiscoveryPushSubscription(input: {
  userId: DiscoveryUserId;
  endpoint: string;
}): Promise<DiscoveryPushSubscriptionResult> {
  const { discoveryRepository } = await import("../infrastructure/discovery-repository");
  return disableDiscoveryPushSubscriptionUseCase(input, discoveryRepository);
}

export async function getDiscoveryPushPublicConfig() {
  const { getVapidPublicConfig } = await import("../infrastructure/push-service");
  return getVapidPublicConfig();
}

function normalizePushSubscriptionInput(
  input: RegisterDiscoveryPushSubscriptionInput
):
  | {
      ok: true;
      input: DiscoveryPushSubscriptionInput;
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
    !isValidPushKey(p256dh, DISCOVERY_PUSH_KEY_MAX_LENGTH) ||
    !isValidPushKey(authSecret, DISCOVERY_PUSH_AUTH_MAX_LENGTH)
  ) {
    return { ok: false, reason: "invalid-key-material" };
  }

  return {
    ok: true,
    input: {
      userId: input.userId,
      endpoint,
      p256dh,
      authSecret,
      userAgent: input.userAgent?.slice(0, 512) ?? null
    }
  };
}

function isValidEndpoint(endpoint: string): boolean {
  if (endpoint.length < 12 || endpoint.length > DISCOVERY_PUSH_ENDPOINT_MAX_LENGTH) {
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
