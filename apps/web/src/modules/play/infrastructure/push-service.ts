import "server-only";

import { createHash } from "node:crypto";

import webPush, { type PushSubscription } from "web-push";

import type { PlayPushSubscriptionRecord } from "../application/ports";

export type ProductPushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

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

export async function sendProductPushNotification(input: {
  payload: ProductPushPayload;
  subscription: PlayPushSubscriptionRecord;
}): Promise<"sent" | "push-not-configured" | "failed"> {
  const config = getVapidServerConfig();

  if (!config.ok) {
    console.warn(
      JSON.stringify({
        event: "push-not-configured",
        scope: "play.push"
      })
    );
    return "push-not-configured";
  }

  try {
    await webPush.sendNotification(
      toWebPushSubscription(input.subscription),
      JSON.stringify(input.payload),
      {
        TTL: 60 * 30,
        contentEncoding: "aes128gcm",
        topic: input.payload.tag,
        urgency: "normal",
        vapidDetails: {
          privateKey: config.privateKey,
          publicKey: config.publicKey,
          subject: config.subject
        }
      }
    );
    return "sent";
  } catch (error) {
    console.warn(
      JSON.stringify({
        endpoint: redactPushEndpoint(input.subscription.endpoint),
        error: error instanceof Error ? error.name : "unknown",
        event: "send-failed",
        scope: "play.push"
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
    privateKey,
    publicKey,
    subject
  };
}

export function redactPushEndpoint(endpoint: string): string {
  const digest = createHash("sha256").update(endpoint).digest("hex").slice(0, 12);
  return `sha256:${digest}`;
}

function toWebPushSubscription(
  subscription: PlayPushSubscriptionRecord
): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.authSecret,
      p256dh: subscription.p256dh
    }
  };
}
