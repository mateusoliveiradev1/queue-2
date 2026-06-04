import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  disableDiscoveryPushSubscriptionUseCase,
  registerDiscoveryPushSubscriptionUseCase
} from "../src/modules/discovery/application/register-push-subscription";
import { sendMatchNotificationUseCase } from "../src/modules/discovery/application/send-match-notification";
import {
  getVapidPublicConfig,
  getVapidServerConfig,
  redactPushEndpoint
} from "../src/modules/discovery/infrastructure/push-service";
import type {
  DiscoveryMatchRecord,
  DiscoveryPushSubscription
} from "../src/modules/discovery";

const pushRouteSource = readFileSync("src/app/api/discovery/push/route.ts", "utf8");
const pushButtonSource = readFileSync(
  "src/modules/discovery/presentation/push-opt-in-button.tsx",
  "utf8"
);
const livePanelSource = readFileSync(
  "src/modules/discovery/presentation/live-panel.tsx",
  "utf8"
);
const pushServiceSource = readFileSync(
  "src/modules/discovery/infrastructure/push-service.ts",
  "utf8"
);
const repositorySource = readFileSync(
  "src/modules/discovery/infrastructure/discovery-repository.ts",
  "utf8"
);
const serviceWorkerSource = readFileSync(
  "public/discovery-push-sw.js",
  "utf8"
);

describe("discovery push subscriptions", () => {
  it("registers and disables push subscriptions through bounded use cases", async () => {
    const calls: string[] = [];
    const validSubscription = {
      endpoint: "https://updates.push.services.example/subscriptions/abc",
      keys: {
        p256dh: "abcdefghijklmnopqrstuvwxyzABCDE_1234567890",
        auth: "auth_SECRET-123"
      }
    };

    const registered = await registerDiscoveryPushSubscriptionUseCase(
      {
        userId: "member-1",
        subscription: validSubscription,
        userAgent: "Vitest Browser"
      },
      {
        async registerPushSubscription(input) {
          calls.push(`register:${input.endpoint}:${input.authSecret}`);
          return { ok: true, state: "enabled" };
        }
      }
    );
    const disabled = await disableDiscoveryPushSubscriptionUseCase(
      {
        userId: "member-1",
        endpoint: validSubscription.endpoint
      },
      {
        async disablePushSubscription(input) {
          calls.push(`disable:${input.endpoint}`);
          return { ok: true, state: "disabled" };
        }
      }
    );
    const invalid = await registerDiscoveryPushSubscriptionUseCase(
      {
        userId: "member-1",
        subscription: {
          endpoint: "http://not-secure.example/subscription",
          keys: validSubscription.keys
        }
      },
      {
        async registerPushSubscription() {
          throw new Error("repository should not be called");
        }
      }
    );

    expect(registered).toEqual({ ok: true, state: "enabled" });
    expect(disabled).toEqual({ ok: true, state: "disabled" });
    expect(invalid).toEqual({ ok: false, reason: "invalid-endpoint" });
    expect(calls).toEqual([
      "register:https://updates.push.services.example/subscriptions/abc:auth_SECRET-123",
      "disable:https://updates.push.services.example/subscriptions/abc"
    ]);
  });

  it("sends match notifications only to enabled subscriptions returned by the repository", async () => {
    const delivered: string[] = [];
    const enabledSubscriptions: DiscoveryPushSubscription[] = [
      pushSubscription("https://updates.push.services.example/subscriptions/one"),
      pushSubscription("https://updates.push.services.example/subscriptions/two")
    ];
    const result = await sendMatchNotificationUseCase(
      {
        match: matchRecord()
      },
      {
        async getEnabledPushSubscriptionsForMatch() {
          return enabledSubscriptions;
        }
      },
      {
        async sendMatchNotification(input) {
          delivered.push(input.subscription.endpoint);
          return "sent";
        }
      }
    );

    expect(result).toEqual({ ok: true, sent: 2, skipped: 0, reason: undefined });
    expect(delivered).toEqual(enabledSubscriptions.map((item) => item.endpoint));
    expect(repositorySource).toContain("AND enabled = true");
    expect(repositorySource).toContain("LIMIT 8");
  });

  it("treats missing VAPID private config as server configuration state", () => {
    expect(
      getVapidServerConfig({
        ...process.env,
        VAPID_PUBLIC_KEY: "public-key",
        VAPID_PRIVATE_KEY: undefined,
        VAPID_SUBJECT: "mailto:admin@example.com"
      })
    ).toEqual({ ok: false, reason: "push-not-configured" });
    expect(
      getVapidPublicConfig({
        ...process.env,
        VAPID_PUBLIC_KEY: "public-key"
      })
    ).toEqual({ ok: true, publicKey: "public-key" });
  });

  it("redacts endpoint material in push diagnostics", () => {
    const endpoint = "https://updates.push.services.example/subscriptions/raw-secret";
    const redacted = redactPushEndpoint(endpoint);

    expect(redacted).toMatch(/^sha256:[a-f0-9]{12}$/);
    expect(redacted).not.toContain(endpoint);
    expect(pushServiceSource).toContain("redactPushEndpoint");
    expect(pushServiceSource).not.toContain("authSecret,");
  });

  it("keeps the browser boundary public-key only and permission opt-in explicit", () => {
    expect(pushRouteSource).toContain("requireVerifiedSession()");
    expect(pushRouteSource).toContain("z.object");
    expect(pushRouteSource).toContain('"Cache-Control": "no-store"');
    expect(pushRouteSource).not.toContain("VAPID_PRIVATE_KEY");
    expect(pushButtonSource).not.toContain("VAPID_PRIVATE_KEY");
    expect(serviceWorkerSource).not.toContain("VAPID_PRIVATE_KEY");
    expect(pushButtonSource).toContain("Notification.requestPermission()");
    expect(pushButtonSource).toContain("onClick={handleEnablePush}");
    expect(livePanelSource).not.toContain("Notification.requestPermission()");
    expect(pushButtonSource).toContain("/api/discovery/push");
    expect(pushButtonSource).toContain("useState<boolean | null>(null)");
    expect(pushButtonSource).toContain("setSupported(isPushSupported())");
    expect(pushButtonSource).toContain('disabled={supported !== true || state === "enabling"}');
  });
});

function pushSubscription(endpoint: string): DiscoveryPushSubscription {
  return {
    endpoint,
    p256dh: "public-key-material",
    authSecret: "auth-secret-material",
    userAgent: "Vitest"
  };
}

function matchRecord(): DiscoveryMatchRecord {
  return {
    id: "match-1234567890abcdef",
    duoId: "duo-1",
    catalogGameId: "game-1",
    matchedAt: new Date("2026-06-04T11:00:00.000Z"),
    createdFrom: "live",
    firstUserId: "member-1",
    secondUserId: "member-2",
    reasonSnapshot: ["PC em comum"],
    libraryHandoffStatus: null
  };
}
