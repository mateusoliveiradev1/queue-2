import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  disableProductPush,
  getProductPushPublicConfig,
  PRODUCT_PUSH_AUTH_MAX_LENGTH,
  PRODUCT_PUSH_ENDPOINT_MAX_LENGTH,
  PRODUCT_PUSH_KEY_MAX_LENGTH,
  registerProductPush
} from "../../../../modules/play";
import {
  requireAuthoritativeVerifiedSession,
  requireVerifiedSession
} from "../../../../platform/auth/session";

const pushKeySchema = (maxLength: number) =>
  z.string().trim().min(8).max(maxLength).regex(/^[A-Za-z0-9_-]+$/);

const endpointSchema = z
  .string()
  .trim()
  .min(12)
  .max(PRODUCT_PUSH_ENDPOINT_MAX_LENGTH)
  .url()
  .refine((value) => value.startsWith("https://"));

const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    auth: pushKeySchema(PRODUCT_PUSH_AUTH_MAX_LENGTH),
    p256dh: pushKeySchema(PRODUCT_PUSH_KEY_MAX_LENGTH)
  })
});

const registerSchema = z.object({
  subscription: subscriptionSchema
});

const disableSchema = z.object({
  endpoint: endpointSchema.nullish()
});

export async function GET() {
  await requireVerifiedSession();
  const config = await getProductPushPublicConfig();

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
  const session = await requireAuthoritativeVerifiedSession();
  const parsed = registerSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        reason: "invalid-subscription"
      },
      400
    );
  }

  const result = await registerProductPush({
    subscription: parsed.data.subscription,
    userAgent: request.headers.get("user-agent"),
    userId: session.user.id
  });

  if (!result.ok && result.reason === "membership-required") {
    return noStoreJson(
      {
        ok: false,
        reason: result.reason
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
  const session = await requireAuthoritativeVerifiedSession();
  const parsed = disableSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        reason: "invalid-subscription"
      },
      400
    );
  }

  const result = await disableProductPush({
    endpoint: parsed.data.endpoint ?? null,
    userId: session.user.id
  });

  if (!result.ok) {
    return noStoreJson(
      {
        ok: false,
        reason: result.reason
      },
      result.reason === "membership-required" ? 403 : 400
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
    headers: {
      "Cache-Control": "no-store"
    },
    status
  });
}
