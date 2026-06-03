import {
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const catalogSchema = pgSchema("catalog");

export const catalogGames = catalogSchema.table(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawgId: integer("rawg_id").notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 240 }).notNull(),
    description: text("description"),
    releasedAt: date("released_at", { mode: "date" }),
    backgroundImageUrl: text("background_image_url"),
    rawgUrl: text("rawg_url").notNull(),
    rawgUpdatedAt: timestamp("rawg_updated_at", { withTimezone: true }),
    source: varchar("source", { length: 40 }).notNull().default("RAWG"),
    sourceUrl: text("source_url").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    coopCampaignConfirmed: boolean("coop_campaign_confirmed").notNull().default(false),
    coopPlayerCountMin: smallint("coop_player_count_min"),
    coopPlayerCountMax: smallint("coop_player_count_max"),
    coopConfirmationSource: text("coop_confirmation_source"),
    coopConfirmationCheckedAt: timestamp("coop_confirmation_checked_at", {
      withTimezone: true
    }),
    mainFlowEligible: boolean("main_flow_eligible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("catalog_games_rawg_id_uidx").on(table.rawgId),
    uniqueIndex("catalog_games_slug_uidx").on(table.slug),
    index("catalog_games_main_flow_idx").on(table.mainFlowEligible, table.syncedAt),
    index("catalog_games_freshness_idx").on(table.sourceUpdatedAt, table.syncedAt),
    check(
      "catalog_games_coop_player_count_chk",
      sql`
        (${table.coopPlayerCountMin} IS NULL AND ${table.coopPlayerCountMax} IS NULL)
        OR (
          ${table.coopPlayerCountMin} IS NOT NULL
          AND ${table.coopPlayerCountMax} IS NOT NULL
          AND ${table.coopPlayerCountMin} >= 1
          AND ${table.coopPlayerCountMax} >= ${table.coopPlayerCountMin}
        )
      `
    ),
    check(
      "catalog_games_main_flow_requires_confirmed_coop_chk",
      sql`
        ${table.mainFlowEligible} = false
        OR (
          ${table.coopCampaignConfirmed} = true
          AND ${table.coopPlayerCountMin} <= 2
          AND ${table.coopPlayerCountMax} >= 2
          AND ${table.coopConfirmationSource} IS NOT NULL
          AND ${table.coopConfirmationCheckedAt} IS NOT NULL
        )
      `
    )
  ]
);

export const catalogGamePlatforms = catalogSchema.table(
  "game_platforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "cascade" }),
    rawgPlatformId: integer("rawg_platform_id"),
    platformKey: varchar("platform_key", { length: 40 }).notNull(),
    platformName: varchar("platform_name", { length: 80 }).notNull()
  },
  (table) => [
    uniqueIndex("catalog_game_platforms_game_platform_uidx").on(
      table.gameId,
      table.platformKey
    ),
    index("catalog_game_platforms_platform_idx").on(table.platformKey, table.gameId)
  ]
);

export const catalogGameGenres = catalogSchema.table(
  "game_genres",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "cascade" }),
    rawgGenreId: integer("rawg_genre_id"),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 80 }).notNull()
  },
  (table) => [
    uniqueIndex("catalog_game_genres_game_slug_uidx").on(table.gameId, table.slug),
    index("catalog_game_genres_slug_idx").on(table.slug, table.gameId)
  ]
);

export const catalogGameTimeEstimates = catalogSchema.table(
  "game_time_estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "cascade" }),
    estimateKind: varchar("estimate_kind", { length: 40 }).notNull().default("completion"),
    minutes: integer("minutes"),
    source: varchar("source", { length: 80 }).notNull(),
    sourceUrl: text("source_url"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    confidence: varchar("confidence", { length: 32 }).notNull().default("unverified"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("catalog_game_time_estimates_game_kind_uidx").on(
      table.gameId,
      table.estimateKind
    ),
    check(
      "catalog_game_time_estimates_minutes_positive_chk",
      sql`${table.minutes} IS NULL OR ${table.minutes} > 0`
    )
  ]
);

export const catalogGameAvailability = catalogSchema.table(
  "game_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "cascade" }),
    availabilityType: varchar("availability_type", { length: 40 }).notNull(),
    platformKey: varchar("platform_key", { length: 40 }),
    source: varchar("source", { length: 80 }).notNull(),
    sourceUrl: text("source_url"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("unverified"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("catalog_game_availability_game_type_platform_uidx").on(
      table.gameId,
      table.availabilityType,
      table.platformKey
    ),
    index("catalog_game_availability_lookup_idx").on(
      table.availabilityType,
      table.platformKey,
      table.checkedAt
    ),
    check(
      "catalog_game_availability_type_chk",
      sql`${table.availabilityType} IN ('free', 'game-pass')`
    ),
    check(
      "catalog_game_availability_status_chk",
      sql`${table.status} IN ('available', 'unavailable', 'unverified')`
    )
  ]
);
