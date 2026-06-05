import { NextResponse } from "next/server";

import {
  isPlayReminderRequestAuthorized,
  runReminderJobs
} from "../../../../../modules/play/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isPlayReminderRequestAuthorized(request)) {
    return NextResponse.json(
      {
        error: "unauthorized",
        ok: false
      },
      { status: 401 }
    );
  }

  const result = await runReminderJobs();

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
