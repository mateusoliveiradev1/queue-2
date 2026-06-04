import type { QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import {
  isCatalogRefreshRequestAuthorized,
  runCatalogRefresh
} from "../src/modules/catalog/jobs";
import { checkCatalogCurationHealth } from "../src/modules/catalog/infrastructure/catalog-health";
import type { CuratedCatalogAvailabilitySeed } from "../src/modules/catalog/infrastructure/availability-seeds";
import type { PublishedCatalogLocalizationSeed } from "../src/modules/catalog/infrastructure/localization-seeds";

describe("catalog refresh cron authorization", () => {
  it("requires an exact bearer token from CRON_SECRET", () => {
    const request = new Request("http://localhost/api/jobs/catalog/refresh", {
      headers: {
        Authorization: "Bearer secret-1"
      }
    });

    expect(isCatalogRefreshRequestAuthorized(request, "secret-1")).toBe(true);
    expect(isCatalogRefreshRequestAuthorized(request, "secret-2")).toBe(false);
    expect(isCatalogRefreshRequestAuthorized(request, "")).toBe(false);
  });
});

describe("catalog refresh orchestration", () => {
  it("runs RAWG sync, curation seeds and health validation in order", async () => {
    const order: string[] = [];
    const result = await runCatalogRefresh({
      rawgApiKey: "rawg-test-key",
      syncCatalog: vi.fn(async () => {
        order.push("sync");
        return syncResult({ failedCount: 0 });
      }),
      applySeeds: vi.fn(async () => {
        order.push("seeds");
        return seedResult();
      }),
      checkHealth: vi.fn(async () => {
        order.push("health");
        return healthResult({ ok: true });
      })
    });

    expect(order).toEqual(["sync", "seeds", "health"]);
    expect(result.ok).toBe(true);
    expect(result.sync).toMatchObject({
      source: "RAWG",
      mode: "apply",
      failedCount: 0
    });
    expect(result.health.ok).toBe(true);
  });

  it("fails closed when production refresh requires RAWG but the key is missing", async () => {
    const syncCatalog = vi.fn(async () => syncResult({ failedCount: 0 }));
    const result = await runCatalogRefresh({
      rawgApiKey: "",
      requireRawgSync: true,
      syncCatalog,
      applySeeds: vi.fn(async () => seedResult()),
      checkHealth: vi.fn(async () => healthResult({ ok: true }))
    });

    expect(syncCatalog).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.sync).toEqual({
      source: "RAWG",
      status: "skipped",
      reason: "missing-rawg-api-key"
    });
    expect(result.warnings).toContain(
      "RAWG_API_KEY is not configured; RAWG synchronization was skipped."
    );
  });
});

describe("catalog curation health", () => {
  it("reports missing published localizations and verified availability rows", async () => {
    const pool = fakeHealthPool({
      localizedSlugs: new Set(["a-way-out-2018"]),
      availableSlugs: new Set<string>()
    });

    const result = await checkCatalogCurationHealth({
      pool,
      localizationSeeds: [
        localizationSeed("a-way-out-2018"),
        localizationSeed("it-takes-two-2")
      ],
      availabilitySeeds: [availabilitySeed("a-way-out-2018")]
    });

    expect(result).toEqual({
      ok: false,
      localizations: {
        inputCount: 2,
        publishedCount: 1,
        missingSlugs: ["it-takes-two-2"]
      },
      availability: {
        inputCount: 1,
        availableCount: 0,
        missingSlugs: ["a-way-out-2018"]
      }
    });
  });
});

function syncResult({ failedCount }: { failedCount: number }) {
  return {
    mode: "apply" as const,
    dryRun: false,
    source: "RAWG" as const,
    inputCount: 1,
    createdCount: 0,
    updatedCount: failedCount === 0 ? 1 : 0,
    skippedCount: 0,
    failedCount,
    items: []
  };
}

function seedResult() {
  return {
    localizations: {
      inputCount: 1,
      appliedCount: 1,
      missingSlugs: []
    },
    availability: {
      inputCount: 1,
      appliedCount: 1,
      missingSlugs: []
    }
  };
}

function healthResult({ ok }: { ok: boolean }) {
  return {
    ok,
    localizations: {
      inputCount: 1,
      publishedCount: ok ? 1 : 0,
      missingSlugs: ok ? [] : ["missing-localization"]
    },
    availability: {
      inputCount: 1,
      availableCount: ok ? 1 : 0,
      missingSlugs: ok ? [] : ["missing-availability"]
    }
  };
}

function fakeHealthPool({
  localizedSlugs,
  availableSlugs
}: {
  localizedSlugs: Set<string>;
  availableSlugs: Set<string>;
}): QueueDbPool {
  return {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      if (sql.includes("unnest($1::text[])")) {
        const slugs = values[0] as string[];
        return {
          rows: slugs
            .filter((slug) => localizedSlugs.has(slug))
            .map((slug) => ({ slug }))
        };
      }

      if (sql.includes("catalog.game_availability")) {
        const slug = values[0] as string;
        return {
          rows: availableSlugs.has(slug) ? [{ found: 1 }] : []
        };
      }

      return { rows: [] };
    })
  } as unknown as QueueDbPool;
}

function localizationSeed(slug: string): PublishedCatalogLocalizationSeed {
  const reviewedAt = new Date("2026-06-03T20:30:00.000Z");

  return {
    slug,
    locale: "pt-BR",
    version: 1,
    status: "published",
    description: "Descricao revisada.",
    source: "queue2-curation",
    sourceUrl: null,
    rawSourceHash: null,
    provenance: {
      kind: "phase-2-polish",
      summary: "summary"
    },
    authorKind: "seed",
    authorId: "queue2",
    reviewerKind: "operator",
    reviewerId: "queue2-curation",
    reviewNotes: "reviewed",
    qualityCheck: {
      coop_facts_checked: true,
      spoilers_avoided: true,
      facts_not_invented: true,
      natural_pt_br: true,
      queue2_tone_controlled: true
    },
    reviewedAt,
    publishedAt: reviewedAt
  };
}

function availabilitySeed(slug: string): CuratedCatalogAvailabilitySeed {
  return {
    slug,
    type: "game-pass",
    platformKey: "xbox",
    source: "Xbox Store",
    sourceUrl: "https://www.xbox.com/",
    checkedAt: new Date("2026-06-03T21:25:00.000-03:00"),
    status: "available"
  };
}
