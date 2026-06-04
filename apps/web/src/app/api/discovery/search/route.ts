import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { searchDiscoveryGames } from "../../../../modules/discovery";
import { requireVerifiedSession } from "../../../../platform/auth/session";
import { persistentDiscoverySearchLimiter } from "../../../../platform/rate-limit/persistent";

const searchParamsSchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(10).default(10),
  includeSeen: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export async function GET(request: NextRequest) {
  const session = await requireVerifiedSession();
  const parsed = searchParamsSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    includeSeen: request.nextUrl.searchParams.get("includeSeen") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid-search"
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const rateLimit = await persistentDiscoverySearchLimiter.consume(session.user.id);

  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        ok: false,
        reason: "rate-limited",
        retryAfterSeconds: rateLimit.retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const result = await searchDiscoveryGames({
    userId: session.user.id,
    query: parsed.data.q,
    limit: parsed.data.limit,
    includeAlreadySeen: parsed.data.includeSeen
  });

  if (!result.ok && result.reason === "membership-required") {
    return NextResponse.json(
      {
        ok: false,
        reason: "membership-required"
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      results: result.cards
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateLimit.attemptsRemaining)
      }
    }
  );
}
