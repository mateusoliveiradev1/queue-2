import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  disableDiscoveryPushSubscription,
  DISCOVERY_PUSH_AUTH_MAX_LENGTH,
  DISCOVERY_PUSH_ENDPOINT_MAX_LENGTH,
  DISCOVERY_PUSH_KEY_MAX_LENGTH,
  getDiscoveryPushPublicConfig,
  registerDiscoveryPushSubscription
} from "../../../../modules/discovery";
import { requireVerifiedSession } from "../../../../platform/auth/session";

const pushKeySchema = (maxLength: number) =>
  z.string().trim().min(8).max(maxLength).regex(/^[A-Za-z0-9_-]+$/);

const endpointSchema = z
  .string()
  .trim()
  .min(12)
  .max(DISCOVERY_PUSH_ENDPOINT_MAX_LENGTH)
  .url()
  .refine((value) => value.startsWith("https://"));

const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: pushKeySchema(DISCOVERY_PUSH_KEY_MAX_LENGTH),
    auth: pushKeySchema(DISCOVERY_PUSH_AUTH_MAX_LENGTH)
  })
});

const registerSchema = z.object({
  subscription: subscriptionSchema
});

const disableSchema = z.object({
  endpoint: endpointSchema
});

export async function GET() {
  await requireVerifiedSession();
  const config = await getDiscoveryPushPublicConfig();

  if (!config.ok) {
    return noStoreJson(
      {
        ok: false,
        reason: "push-not-configured"
      },
      503
    );
  }

  return noStoreJson({
    ok: true,
    publicKey: config.publicKey
  });
}

export async function POST(request: NextRequest) {
  const session = await requireVerifiedSession();
  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        reason: "invalid-subscription"
      },
      400
    );
  }

  const result = await registerDiscoveryPushSubscription({
    userId: session.user.id,
    subscription: parsed.data.subscription,
    userAgent: request.headers.get("user-agent")
  });

  if (!result.ok && result.reason === "membership-required") {
    return noStoreJson(
      {
        ok: false,
        reason: "membership-required"
      },
      403
    );
  }

  if (!result.ok) {
    return noStoreJson(
      {
        ok: false,
        reason: result.reason
      },
      400
    );
  }

  return noStoreJson({
    ok: true,
    state: result.state
  });
}

export async function DELETE(request: NextRequest) {
  const session = await requireVerifiedSession();
  const body = await readJson(request);
  const parsed = disableSchema.safeParse(body);

  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        reason: "invalid-subscription"
      },
      400
    );
  }

  const result = await disableDiscoveryPushSubscription({
    userId: session.user.id,
    endpoint: parsed.data.endpoint
  });

  if (!result.ok && result.reason === "membership-required") {
    return noStoreJson(
      {
        ok: false,
        reason: "membership-required"
      },
      403
    );
  }

  if (!result.ok) {
    return noStoreJson(
      {
        ok: false,
        reason: result.reason
      },
      400
    );
  }

  return noStoreJson({
    ok: true,
    state: result.state
  });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
