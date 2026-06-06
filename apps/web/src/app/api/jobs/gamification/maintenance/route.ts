import { NextResponse } from "next/server";

import {
  isGamificationMaintenanceRequestAuthorized,
  runGamificationMaintenanceJobs
} from "../../../../../modules/gamification/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isGamificationMaintenanceRequestAuthorized(request)) {
    return NextResponse.json(
      {
        error: "unauthorized",
        ok: false
      },
      { status: 401 }
    );
  }

  const result = await runGamificationMaintenanceJobs();

  return NextResponse.json(result, { status: 200 });
}
