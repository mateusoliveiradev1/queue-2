import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import type { CatalogGameUpsertInput } from "../src/modules/catalog/application/ports";
import { createCatalogRepository } from "../src/modules/catalog/infrastructure/catalog-repository";
import { normalizeRawgGame } from "../src/modules/catalog/infrastructure/rawg-client";

type QueryCall = {
  sql: string;
  values: unknown[];
};

describe("catalog RAWG sync repository", () => {
  it("does not let normalized RAWG defaults erase existing QUEUE/2 curation", async () => {
    const { pool, calls } = fakePool();
    const repository = createCatalogRepository(pool);

    await repository.syncRawgGame(rawgInput());

    const upsert = findSql(calls, "INSERT INTO catalog.games");
    expect(upsert.sql).toContain(
      "coop_campaign_confirmed = CASE WHEN $14::boolean"
    );
    expect(upsert.sql).not.toContain(
      "coop_campaign_confirmed = excluded.coop_campaign_confirmed"
    );
    expect(upsert.sql).not.toContain("main_flow_eligible = excluded.main_flow_eligible");
    expect(upsert.values[13]).toBe(false);
    expect(upsert.values[23]).toBe(false);
  });

  it("preserves published localizations and curated time or availability during RAWG sync", async () => {
    const { pool, calls } = fakePool();
    const repository = createCatalogRepository(pool);

    await repository.syncRawgGame(
      rawgInput({
        timeEstimate: null,
        availability: []
      })
    );

    expect(calls.some((call) => call.sql.includes("game_localizations"))).toBe(false);
    expect(calls.some((call) => call.sql.includes("game_time_estimates"))).toBe(false);
    expect(calls.some((call) => call.sql.includes("game_availability"))).toBe(false);
  });

  it("allows explicit allowlist curation updates while syncing RAWG facts", async () => {
    const { pool, calls } = fakePool();
    const repository = createCatalogRepository(pool);
    const checkedAt = new Date("2026-06-03T12:00:00.000Z");

    await repository.syncRawgGame(rawgInput(), {
      coopCampaignConfirmed: true,
      coopPlayerCountMin: 2,
      coopPlayerCountMax: 2,
      coopConfirmationSource: "Curadoria QUEUE/2 allowlist",
      coopConfirmationCheckedAt: checkedAt,
      mainFlowEligible: true
    });

    const upsert = findSql(calls, "INSERT INTO catalog.games");
    expect(upsert.values[12]).toBe(true);
    expect(upsert.values[13]).toBe(true);
    expect(upsert.values[14]).toBe(2);
    expect(upsert.values[15]).toBe(true);
    expect(upsert.values[18]).toBe("Curadoria QUEUE/2 allowlist");
    expect(upsert.values[20]).toBe(checkedAt);
    expect(upsert.values[22]).toBe(true);
    expect(upsert.values[23]).toBe(true);
  });

  it("normalizes RAWG payloads as uncurated input that sync must treat carefully", () => {
    const input = normalizeRawgGame(
      {
        id: 3498,
        slug: "grand-theft-auto-v",
        name: "Grand Theft Auto V",
        description_raw: "English RAWG description",
        released: "2013-09-17",
        background_image: "https://media.rawg.io/media/games/gta-v.jpg",
        updated: "2026-06-01T00:00:00Z",
        platforms: [],
        genres: [],
        playtime: 0
      },
      new Date("2026-06-03T12:00:00.000Z")
    );

    expect(input).toMatchObject({
      coopCampaignConfirmed: false,
      coopPlayerCountMin: null,
      coopPlayerCountMax: null,
      coopConfirmationSource: null,
      mainFlowEligible: false
    });
  });
});

function rawgInput(overrides: Partial<CatalogGameUpsertInput> = {}): CatalogGameUpsertInput {
  return {
    rawgId: 3498,
    slug: "it-takes-two",
    name: "It Takes Two",
    description: "English RAWG description",
    releasedAt: new Date("2021-03-26T00:00:00.000Z"),
    backgroundImageUrl: "https://media.rawg.io/media/games/it-takes-two.jpg",
    rawgUrl: "https://rawg.io/games/it-takes-two",
    rawgUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
    source: "RAWG",
    sourceUrl: "https://rawg.io/games/it-takes-two",
    sourceUpdatedAt: new Date("2026-06-01T00:00:00.000Z"),
    syncedAt: new Date("2026-06-03T12:00:00.000Z"),
    coopCampaignConfirmed: false,
    coopPlayerCountMin: null,
    coopPlayerCountMax: null,
    coopConfirmationSource: null,
    coopConfirmationCheckedAt: null,
    mainFlowEligible: false,
    platforms: [
      {
        key: "pc",
        name: "PC",
        rawgPlatformId: 4
      }
    ],
    genres: [
      {
        slug: "adventure",
        name: "Adventure",
        rawgGenreId: 3
      }
    ],
    timeEstimate: null,
    availability: [],
    ...overrides
  };
}

function fakePool() {
  const calls: QueryCall[] = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql.includes("RETURNING id")) {
        return { rows: [{ id: "game-1" }] };
      }

      return { rows: [] };
    }),
    release: vi.fn()
  } as unknown as QueueDbClient;
  const pool = {
    connect: vi.fn(async () => client)
  } as unknown as QueueDbPool;

  return { pool, calls };
}

function findSql(calls: QueryCall[], snippet: string): QueryCall {
  const call = calls.find((entry) => entry.sql.includes(snippet));

  if (!call) {
    throw new Error(`Expected SQL containing ${snippet}`);
  }

  return call;
}
