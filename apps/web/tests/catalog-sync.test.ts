import type { QueueDbClient, QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import type { CatalogGameUpsertInput } from "../src/modules/catalog/application/ports";
import {
  runCatalogSync,
  type CatalogSyncAudit
} from "../src/modules/catalog/infrastructure/catalog-sync";
import { catalogSyncAllowlist } from "../src/modules/catalog/infrastructure/catalog-sync-allowlist";
import { applyCatalogCurationSeeds } from "../src/modules/catalog/infrastructure/catalog-curation-seeds";
import { createCatalogRepository } from "../src/modules/catalog/infrastructure/catalog-repository";
import {
  createRawgClient,
  normalizeRawgGame,
  type RawgClient
} from "../src/modules/catalog/infrastructure/rawg-client";
import { createUnavailableLocalizationDraftProvider } from "../src/modules/catalog/infrastructure/localization-draft-provider";
import {
  assertLocalizationPublishable,
  evaluateLocalizationPublishability
} from "../src/modules/catalog/infrastructure/localization-review-checklist";

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

  it("adopts an existing curated slug when the RAWG identifier changes", async () => {
    const { pool, calls } = fakePool();
    const repository = createCatalogRepository(pool);

    await repository.syncRawgGame(
      rawgInput({
        rawgId: 455597,
        slug: "it-takes-two"
      })
    );

    const adoption = findSql(calls, "UPDATE catalog.games AS game");
    expect(adoption.sql).toContain("game.slug = $2");
    expect(adoption.sql).toContain("rawg_match.rawg_id = $1");
    expect(adoption.values).toEqual([455597, "it-takes-two"]);

    const upsert = findSql(calls, "INSERT INTO catalog.games");
    expect(upsert.values[0]).toBe(455597);
    expect(upsert.values[1]).toBe("it-takes-two");
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

describe("catalog sync orchestration", () => {
  it("dry-runs curated allowlist items without repository or audit writes", async () => {
    const repository = {
      searchGames: vi.fn(),
      getGameBySlug: vi.fn(),
      upsertGame: vi.fn(),
      upsertGames: vi.fn(),
      syncRawgGame: vi.fn()
    };
    const audit = fakeAudit();

    const result = await runCatalogSync({
      mode: "dry-run",
      allowlist: [allowlistEntry()],
      rawgClient: fakeRawgClient(),
      repository,
      audit
    });

    expect(result).toMatchObject({
      mode: "dry-run",
      dryRun: true,
      inputCount: 1,
      skippedCount: 1,
      failedCount: 0
    });
    expect(repository.syncRawgGame).not.toHaveBeenCalled();
    expect(audit.startRun).not.toHaveBeenCalled();
  });

  it("apply mode writes RAWG facts through repository and records sync audit rows", async () => {
    const repository = {
      searchGames: vi.fn(),
      getGameBySlug: vi.fn(),
      upsertGame: vi.fn(),
      upsertGames: vi.fn(),
      syncRawgGame: vi.fn(async () => "game-1")
    };
    const audit = fakeAudit();

    const result = await runCatalogSync({
      mode: "apply",
      allowlist: [allowlistEntry()],
      rawgClient: fakeRawgClient(),
      repository,
      audit
    });

    expect(result).toMatchObject({
      mode: "apply",
      dryRun: false,
      inputCount: 1,
      updatedCount: 1,
      failedCount: 0
    });
    expect(repository.syncRawgGame).toHaveBeenCalledWith(
      expect.objectContaining({ rawgId: 3498, slug: "it-takes-two-2" }),
      expect.objectContaining({ mainFlowEligible: true })
    );
    expect(audit.startRun).toHaveBeenCalledOnce();
    expect(audit.recordItem).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "updated", gameId: "game-1" })
    );
    expect(audit.finishRun).toHaveBeenCalledOnce();
  });

  it("reports missing RAWG keys as server configuration errors", () => {
    expect(() => createRawgClient({ apiKey: "" })).toThrow(
      /RAWG_API_KEY is required/
    );
  });

  it("fails allowlist entries when RAWG returns a different game name", async () => {
    const repository = {
      searchGames: vi.fn(),
      getGameBySlug: vi.fn(),
      upsertGame: vi.fn(),
      upsertGames: vi.fn(),
      syncRawgGame: vi.fn()
    };

    const result = await runCatalogSync({
      mode: "apply",
      allowlist: [allowlistEntry()],
      rawgClient: {
        searchGames: vi.fn(),
        getGame: vi.fn(async () => rawgInput({ name: "It Takes Two (itch)" }))
      },
      repository,
      audit: fakeAudit()
    });

    expect(result.failedCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      errorMessage:
        'RAWG returned "It Takes Two (itch)" for "it-takes-two", expected "It Takes Two".',
      status: "failed"
    });
    expect(repository.syncRawgGame).not.toHaveBeenCalled();
  });

  it("keeps It Takes Two on the official RAWG entry with the QUEUE/2 slug", () => {
    expect(catalogSyncAllowlist[0]).toMatchObject({
      expectedName: "It Takes Two",
      rawgRef: "it-takes-two-2",
      slug: "it-takes-two"
    });
  });
});

describe("catalog curation seed application", () => {
  it("upserts published PT-BR localizations and verified availability for existing catalog games", async () => {
    const { pool, calls } = fakePool({
      gameIdsBySlug: new Map([
        ["a-way-out-2018", "game-a-way-out"],
        ["missing-game", "game-missing"]
      ])
    });
    const checkedAt = new Date("2026-06-03T21:25:00.000-03:00");

    const result = await applyCatalogCurationSeeds({
      pool,
      localizationSeeds: [
        {
          slug: "a-way-out-2018",
          locale: "pt-BR",
          version: 1,
          status: "published",
          description: "Descricao PT-BR revisada.",
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
          reviewedAt: checkedAt,
          publishedAt: checkedAt
        }
      ],
      availabilitySeeds: [
        {
          slug: "a-way-out-2018",
          type: "game-pass",
          platformKey: "xbox",
          source: "Xbox Store / EA Play",
          sourceUrl: "https://www.xbox.com/en-us/games/store/a-way-out/bwvbncmf22zk",
          checkedAt,
          status: "available"
        }
      ]
    });

    expect(result).toMatchObject({
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
    });
    expect(calls.some((call) => call.sql.includes("INSERT INTO catalog.game_localizations"))).toBe(true);
    expect(calls.some((call) => call.sql.includes("INSERT INTO catalog.game_availability"))).toBe(true);
  });

  it("reports curation seeds whose games are not yet synchronized", async () => {
    const { pool, calls } = fakePool({ gameIdsBySlug: new Map() });
    const checkedAt = new Date("2026-06-03T21:25:00.000-03:00");

    const result = await applyCatalogCurationSeeds({
      pool,
      localizationSeeds: [
        {
          slug: "not-synced-yet",
          locale: "pt-BR",
          version: 1,
          status: "published",
          description: "Descricao PT-BR revisada.",
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
          reviewedAt: checkedAt,
          publishedAt: checkedAt
        }
      ],
      availabilitySeeds: [
        {
          slug: "not-synced-yet",
          type: "game-pass",
          platformKey: "xbox",
          source: "Xbox Store",
          sourceUrl: "https://www.xbox.com/",
          checkedAt,
          status: "available"
        }
      ]
    });

    expect(result.localizations.missingSlugs).toEqual(["not-synced-yet"]);
    expect(result.availability.missingSlugs).toEqual(["not-synced-yet"]);
    expect(calls.some((call) => call.sql.includes("INSERT INTO catalog.game_localizations"))).toBe(false);
    expect(calls.some((call) => call.sql.includes("INSERT INTO catalog.game_availability"))).toBe(false);
  });
});

describe("localization draft provider boundary", () => {
  it("ships without translation provider credentials configured", async () => {
    await expect(
      createUnavailableLocalizationDraftProvider().createDraft({
        rawText: "English source",
        sourceLocale: "en",
        targetLocale: "pt-BR",
        gameName: "It Takes Two",
        rawSourceHash: null
      })
    ).rejects.toThrow(/provider is not configured/);
  });

  it("blocks publication until every review checklist field is satisfied", () => {
    expect(
      evaluateLocalizationPublishability({
        coop_facts_checked: true,
        spoilers_avoided: true
      })
    ).toEqual({
      publishable: false,
      missing: ["facts_not_invented", "natural_pt_br", "queue2_tone_controlled"]
    });

    const complete = {
      coop_facts_checked: true,
      spoilers_avoided: true,
      facts_not_invented: true,
      natural_pt_br: true,
      queue2_tone_controlled: true
    };

    expect(evaluateLocalizationPublishability(complete)).toEqual({
      publishable: true,
      missing: []
    });
    expect(() => assertLocalizationPublishable(complete)).not.toThrow();
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

function allowlistEntry() {
  return {
    rawgRef: "it-takes-two",
    slug: "it-takes-two-2",
    expectedName: "It Takes Two",
    curation: {
      coopCampaignConfirmed: true,
      coopPlayerCountMin: 2,
      coopPlayerCountMax: 2,
      coopConfirmationSource: "Curadoria QUEUE/2 allowlist",
      coopConfirmationCheckedAt: new Date("2026-06-03T12:00:00.000Z"),
      mainFlowEligible: true
    }
  };
}

function fakeRawgClient(): RawgClient {
  return {
    searchGames: vi.fn(),
    getGame: vi.fn(async () => rawgInput())
  };
}

function fakeAudit(): CatalogSyncAudit {
  return {
    startRun: vi.fn(async () => "run-1"),
    recordItem: vi.fn(),
    finishRun: vi.fn()
  };
}

function fakePool(options: { gameIdsBySlug?: Map<string, string> } = {}) {
  const calls: QueryCall[] = [];
  const client = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql.includes("SELECT id FROM catalog.games WHERE slug")) {
        const slug = values[0] as string;
        const id = options.gameIdsBySlug?.get(slug);

        return { rows: id ? [{ id }] : [] };
      }

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
