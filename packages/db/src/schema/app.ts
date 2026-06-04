import {
  boolean,
  check,
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

import { authUsers } from "./auth.ts";
import { catalogGames } from "./catalog.ts";

export const appSchema = pgSchema("app");

export const profiles = appSchema.table(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [check("app_profiles_display_name_length_chk", sql`char_length(${table.displayName}) between 1 and 40`)]
);

export const duos = appSchema.table(
  "duos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 48 }),
    pairedAt: timestamp("paired_at", { withTimezone: true }),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    streak: integer("streak").notNull().default(0),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("app_duos_name_length_chk", sql`${table.name} is null or char_length(${table.name}) between 1 and 48`),
    check("app_duos_xp_non_negative_chk", sql`${table.xp} >= 0`),
    check("app_duos_level_positive_chk", sql`${table.level} >= 1`),
    check("app_duos_streak_non_negative_chk", sql`${table.streak} >= 0`)
  ]
);

export const duoMembers = appSchema.table(
  "duo_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    memberSlot: smallint("member_slot").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_duo_members_duo_slot_uidx").on(table.duoId, table.memberSlot),
    uniqueIndex("app_duo_members_duo_user_uidx").on(table.duoId, table.userId),
    uniqueIndex("app_duo_members_user_uidx").on(table.userId),
    index("app_duo_members_user_duo_idx").on(table.userId, table.duoId),
    check("app_duo_members_slot_chk", sql`${table.memberSlot} in (1, 2)`)
  ]
);

export const pairingCodes = appSchema.table(
  "pairing_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 6 }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    claimedByUserId: text("claimed_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_pairing_codes_active_code_uidx")
      .on(table.code)
      .where(sql`${table.revokedAt} is null and ${table.claimedAt} is null`),
    index("app_pairing_codes_duo_idx").on(table.duoId),
    index("app_pairing_codes_created_by_idx").on(table.createdByUserId),
    check("app_pairing_codes_format_chk", sql`${table.code} ~ '^[A-HJ-NP-Z2-9]{6}$'`),
    check("app_pairing_codes_claim_state_chk", sql`(${table.claimedAt} is null) = (${table.claimedByUserId} is null)`)
  ]
);

export const duoPreferences = appSchema.table("duo_preferences", {
  duoId: uuid("duo_id")
    .primaryKey()
    .references(() => duos.id, { onDelete: "cascade" }),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  audioEnabled: boolean("audio_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const memberPlatforms = appSchema.table(
  "member_platforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 40 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_member_platforms_user_platform_uidx").on(
      table.userId,
      table.platform
    ),
    index("app_member_platforms_duo_platform_idx").on(
      table.duoId,
      table.platform,
      table.enabled
    ),
    check(
      "app_member_platforms_platform_chk",
      sql`${table.platform} IN ('pc', 'playstation', 'xbox', 'switch', 'steam-deck')`
    )
  ]
);

export const duoLibraryGames = appSchema.table(
  "duo_library_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    catalogGameId: uuid("catalog_game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("wishlist"),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    statusUpdatedByUserId: text("status_updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_duo_library_games_duo_catalog_uidx").on(
      table.duoId,
      table.catalogGameId
    ),
    index("app_duo_library_games_duo_status_idx").on(
      table.duoId,
      table.status,
      table.updatedAt
    ),
    index("app_duo_library_games_catalog_idx").on(table.catalogGameId),
    check(
      "app_duo_library_games_status_chk",
      sql`${table.status} IN ('wishlist', 'jogando', 'pausado', 'zerado', 'dropado')`
    )
  ]
);
