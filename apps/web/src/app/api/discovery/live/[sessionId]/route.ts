import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getLiveSession } from "../../../../../modules/discovery";
import { requireVerifiedSession } from "../../../../../platform/auth/session";

const liveSessionParamsSchema = z.object({
  sessionId: z.string().uuid()
});

type LiveSessionRouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: LiveSessionRouteContext
) {
  const session = await requireVerifiedSession();
  const params = await context.params;
  const parsed = liveSessionParamsSchema.safeParse(params);

  if (!parsed.success) {
    return noStoreJson(
      {
        ok: false,
        reason: "invalid-session"
      },
      400
    );
  }

  const result = await getLiveSession({
    userId: session.user.id,
    sessionId: parsed.data.sessionId
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
      404
    );
  }

  return noStoreJson({
    ok: true,
    session: result.session,
    matches: result.matches,
    expiresInSeconds: result.expiresInSeconds
  });
}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
