import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getPerformanceEnvironment,
  navigationTypes,
  performanceMetricNames,
  performanceRouteKeys,
  recordPerformanceMetric,
  webVitalsRatings
} from "../../../../platform/performance/metrics";

const responseHeaders = {
  "Cache-Control": "no-store"
};

const webVitalsPayloadSchema = z
  .object({
    name: z.enum(performanceMetricNames),
    navigationType: z.enum(navigationTypes).optional(),
    rating: z.enum(webVitalsRatings).optional(),
    route: z.union([z.enum(performanceRouteKeys), z.string().trim().min(1).max(128)]).optional(),
    value: z.number().finite().nonnegative()
  })
  .strict();

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const parsed = webVitalsPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid-metric"
      },
      {
        status: 400,
        headers: responseHeaders
      }
    );
  }

  recordPerformanceMetric({
    ...parsed.data,
    environment: getPerformanceEnvironment()
  });

  return NextResponse.json(
    {
      ok: true
    },
    {
      status: 202,
      headers: responseHeaders
    }
  );
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
