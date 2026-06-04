import "server-only";

import { createHash } from "node:crypto";

import webPush, { type PushSubscription } from "web-push";

import type { DiscoveryPushSubscription } from "../application/ports";
import type {
  DiscoveryPushService,
  MatchPushNotificationPayload
} from "../application/send-match-notification";

type VapidServerConfig =
  | {
      ok: true;
      publicKey: string;
      privateKey: string;
      subject: string;
    }
  | {
      ok: false;
      reason: "push-not-configured";
    };

export const pushService: DiscoveryPushService = {
  async sendMatchNotification(input) {
    return sendMatchNotification(input);
  }
};

export async function sendMatchNotification(input: {
  payload: MatchPushNotificationPayload;
  subscription: DiscoveryPushSubscription;
}): Promise<"sent" | "push-not-configured" | "failed"> {
  const config = getVapidServerConfig();

  if (!config.ok) {
    console.warn(
      JSON.stringify({
        scope: "discovery.push",
        event: "push-not-configured"
      })
    );
    return "push-not-configured";
  }

  try {
    await webPush.sendNotification(
      toWebPushSubscription(input.subscription),
      JSON.stringify(input.payload),
      {
        TTL: 60 * 15,
        contentEncoding: "aes128gcm",
        urgency: "high",
        topic: input.payload.tag,
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey
        }
      }
    );
    return "sent";
  } catch (error) {
    console.warn(
      JSON.stringify({
        scope: "discovery.push",
        event: "send-failed",
        endpoint: redactPushEndpoint(input.subscription.endpoint),
        error: error instanceof Error ? error.name : "unknown"
      })
    );
    return "failed";
  }
}

export function getVapidPublicConfig(
  env: NodeJS.ProcessEnv = process.env
):
  | {
      ok: true;
      publicKey: string;
    }
  | {
      ok: false;
      reason: "push-not-configured";
    } {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return { ok: false, reason: "push-not-configured" };
  }

  return {
    ok: true,
    publicKey
  };
}

export function getVapidServerConfig(
  env: NodeJS.ProcessEnv = process.env
): VapidServerConfig {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return { ok: false, reason: "push-not-configured" };
  }

  return {
    ok: true,
    publicKey,
    privateKey,
    subject
  };
}

export function redactPushEndpoint(endpoint: string): string {
  const digest = createHash("sha256").update(endpoint).digest("hex").slice(0, 12);
  return `sha256:${digest}`;
}

function toWebPushSubscription(
  subscription: DiscoveryPushSubscription
): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.authSecret
    }
  };
}
