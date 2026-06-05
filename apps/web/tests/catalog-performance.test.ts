import type { QueueDbPool } from "@queue/db";
import { describe, expect, it, vi } from "vitest";

import { createCatalogRepository } from "../src/modules/catalog/infrastructure/catalog-repository";

type QueryCall = {
  sql: string;
  values: unknown[];
};

describe("catalog repository performance", () => {
  it("hydrates search results with bounded relation queries", async () => {
    const { pool, calls } = fakeCatalogSearchPool(18);
    const repository = createCatalogRepository(pool);

    const games = await repository.searchGames({ limit: 18 });

    expect(games).toHaveLength(18);
    expect(calls).toHaveLength(6);
    expect(calls.slice(1).every((call) => (call.values[0] as string[]).length === 18)).toBe(
      true
    );
    expect(games[0]).toMatchObject({
      id: "game-01",
      slug: "game-01",
      platforms: [{ key: "pc", name: "PC", rawgPlatformId: 4 }],
      genres: [{ slug: "adventure", name: "Adventure", rawgGenreId: 3 }],
      localization: {
        locale: "pt-BR",
        version: 1,
        description: "Descricao localizada de Game 01."
      },
      timeEstimate: {
        minutes: 720,
        source: "queue2-curation",
        confidence: "verified"
      },
      availability: [
        {
          type: "game-pass",
          platformKey: "pc",
          source: "Xbox",
          status: "available"
        }
      ]
    });
  });
});

function fakeCatalogSearchPool(count: number): { pool: QueueDbPool; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const gameRows = Array.from({ length: count }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");

    return {
      id: `game-${suffix}`,
      rawg_id: 10_000 + index,
      slug: `game-${suffix}`,
      name: `Game ${suffix}`,
      description: `Game ${suffix} description`,
      released_at: new Date("2026-01-01T00:00:00.000Z"),
      background_image_url: `https://media.rawg.io/media/games/game-${suffix}.jpg`,
      rawg_url: `https://rawg.io/games/game-${suffix}`,
      rawg_updated_at: new Date("2026-06-01T00:00:00.000Z"),
      source: "RAWG" as const,
      source_url: `https://rawg.io/games/game-${suffix}`,
      source_updated_at: new Date("2026-06-01T00:00:00.000Z"),
      synced_at: new Date("2026-06-03T12:00:00.000Z"),
      coop_campaign_confirmed: true,
      coop_player_count_min: 2,
      coop_player_count_max: 2,
      coop_confirmation_source: "queue2-curation",
      coop_confirmation_checked_at: new Date("2026-06-03T12:00:00.000Z"),
      main_flow_eligible: true
    };
  });
  const pool = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });

      if (sql.includes("FROM catalog.games AS game") && sql.includes("LIMIT $5")) {
        return { rows: gameRows };
      }

      const gameIds = values[0] as string[];

      if (sql.includes("FROM catalog.game_platforms")) {
        return {
          rows: gameIds.map((game_id) => ({
            game_id,
            rawg_platform_id: 4,
            platform_key: "pc",
            platform_name: "PC"
          }))
        };
      }

      if (sql.includes("FROM catalog.game_genres")) {
        return {
          rows: gameIds.map((game_id) => ({
            game_id,
            rawg_genre_id: 3,
            slug: "adventure",
            name: "Adventure"
          }))
        };
      }

      if (sql.includes("FROM catalog.game_time_estimates")) {
        return {
          rows: gameIds.map((game_id) => ({
            game_id,
            minutes: 720,
            source: "queue2-curation",
            source_url: null,
            checked_at: new Date("2026-06-03T12:00:00.000Z"),
            confidence: "verified"
          }))
        };
      }

      if (sql.includes("FROM catalog.game_availability")) {
        return {
          rows: gameIds.map((game_id) => ({
            game_id,
            availability_type: "game-pass",
            platform_key: "pc",
            source: "Xbox",
            source_url: "https://www.xbox.com/",
            checked_at: new Date("2026-06-03T12:00:00.000Z"),
            status: "available"
          }))
        };
      }

      if (sql.includes("FROM catalog.game_localizations")) {
        return {
          rows: gameIds.map((game_id, index) => {
            const suffix = String(index + 1).padStart(2, "0");

            return {
              game_id,
              locale: "pt-BR",
              version: 1,
              description: `Descricao localizada de Game ${suffix}.`,
              source: "queue2-curation",
              source_url: null,
              published_at: new Date("2026-06-03T12:00:00.000Z"),
              reviewed_at: new Date("2026-06-03T12:00:00.000Z")
            };
          })
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    })
  } as unknown as QueueDbPool;

  return { pool, calls };
}
