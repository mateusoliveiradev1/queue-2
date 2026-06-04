import { NextResponse } from "next/server";

import {
  isCatalogRefreshRequestAuthorized,
  runCatalogRefresh
} from "../../../../../modules/catalog/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCatalogRefreshRequestAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized"
      },
      { status: 401 }
    );
  }

  const result = await runCatalogRefresh({ requireRawgSync: true });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
