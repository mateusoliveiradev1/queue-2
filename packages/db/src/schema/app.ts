import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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

export const discoveryLiveSessions = appSchema.table(
  "discovery_live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    startedByUserId: text("started_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("app_discovery_live_sessions_duo_status_idx").on(
      table.duoId,
      table.status,
      table.expiresAt
    ),
    index("app_discovery_live_sessions_expiry_idx").on(table.expiresAt),
    check(
      "app_discovery_live_sessions_status_chk",
      sql`${table.status} IN ('active', 'ended', 'expired')`
    ),
    check(
      "app_discovery_live_sessions_expires_after_start_chk",
      sql`${table.expiresAt} > ${table.startedAt}`
    ),
    check(
      "app_discovery_live_sessions_ended_after_start_chk",
      sql`${table.endedAt} IS NULL OR ${table.endedAt} >= ${table.startedAt}`
    )
  ]
);

export const discoveryMemberDecisions = appSchema.table(
  "discovery_member_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    catalogGameId: uuid("catalog_game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "restrict" }),
    decision: varchar("decision", { length: 20 }).notNull(),
    sourceMode: varchar("source_mode", { length: 20 }).notNull(),
    liveSessionId: uuid("live_session_id").references(() => discoveryLiveSessions.id, {
      onDelete: "set null"
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    preferenceWeight: smallint("preference_weight").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_discovery_member_decisions_duo_user_game_uidx").on(
      table.duoId,
      table.userId,
      table.catalogGameId
    ),
    index("app_discovery_member_decisions_deck_exclusion_idx").on(
      table.duoId,
      table.userId,
      table.catalogGameId,
      table.decidedAt
    ),
    index("app_discovery_member_decisions_cooldown_idx").on(
      table.duoId,
      table.cooldownUntil
    ),
    index("app_discovery_member_decisions_partner_match_idx").on(
      table.duoId,
      table.catalogGameId,
      table.decision
    ),
    check(
      "app_discovery_member_decisions_decision_chk",
      sql`${table.decision} IN ('want', 'not_now', 'skip')`
    ),
    check(
      "app_discovery_member_decisions_source_mode_chk",
      sql`${table.sourceMode} IN ('deck', 'live', 'surprise', 'quiz', 'search')`
    ),
    check(
      "app_discovery_member_decisions_cooldown_chk",
      sql`
        (${table.decision} = 'not_now' AND ${table.cooldownUntil} IS NOT NULL)
        OR (${table.decision} <> 'not_now' AND ${table.cooldownUntil} IS NULL)
      `
    ),
    check(
      "app_discovery_member_decisions_weight_chk",
      sql`
        (${table.decision} = 'want' AND ${table.preferenceWeight} > 0)
        OR (${table.decision} = 'not_now' AND ${table.preferenceWeight} < 0)
        OR (${table.decision} = 'skip' AND ${table.preferenceWeight} = 0)
      `
    )
  ]
);

export const discoveryMatches = appSchema.table(
  "discovery_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    catalogGameId: uuid("catalog_game_id")
      .notNull()
      .references(() => catalogGames.id, { onDelete: "restrict" }),
    matchedAt: timestamp("matched_at", { withTimezone: true }).notNull().defaultNow(),
    createdFrom: varchar("created_from", { length: 20 }).notNull(),
    firstUserId: text("first_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    secondUserId: text("second_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    reasonSnapshot: jsonb("reason_snapshot").notNull().default(sql`'[]'::jsonb`),
    libraryHandoffStatus: varchar("library_handoff_status", { length: 20 }),
    libraryHandoffAt: timestamp("library_handoff_at", { withTimezone: true }),
    libraryHandoffByUserId: text("library_handoff_by_user_id").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_discovery_matches_duo_game_uidx").on(table.duoId, table.catalogGameId),
    index("app_discovery_matches_history_idx").on(table.duoId, table.matchedAt),
    index("app_discovery_matches_catalog_idx").on(table.catalogGameId),
    check(
      "app_discovery_matches_created_from_chk",
      sql`${table.createdFrom} IN ('deck', 'live', 'surprise', 'quiz', 'search')`
    ),
    check(
      "app_discovery_matches_distinct_members_chk",
      sql`${table.firstUserId} <> ${table.secondUserId}`
    ),
    check(
      "app_discovery_matches_library_handoff_status_chk",
      sql`
        ${table.libraryHandoffStatus} IS NULL
        OR ${table.libraryHandoffStatus} IN ('wishlist', 'jogando', 'pausado')
      `
    ),
    check(
      "app_discovery_matches_library_handoff_state_chk",
      sql`
        (${table.libraryHandoffStatus} IS NULL AND ${table.libraryHandoffAt} IS NULL)
        OR (${table.libraryHandoffStatus} IS NOT NULL AND ${table.libraryHandoffAt} IS NOT NULL)
      `
    )
  ]
);

export const discoveryMoodQuizAnswers = appSchema.table(
  "discovery_mood_quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    quizRound: uuid("quiz_round").notNull().defaultRandom(),
    questionKey: varchar("question_key", { length: 24 }).notNull(),
    answerKey: varchar("answer_key", { length: 24 }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_discovery_mood_answers_user_question_uidx").on(
      table.duoId,
      table.userId,
      table.quizRound,
      table.questionKey
    ),
    index("app_discovery_mood_answers_round_idx").on(table.duoId, table.quizRound),
    check(
      "app_discovery_mood_answers_question_answer_chk",
      sql`
        (
          ${table.questionKey} = 'energy'
          AND ${table.answerKey} IN ('low', 'medium', 'high')
        )
        OR (
          ${table.questionKey} = 'commitment'
          AND ${table.answerKey} IN ('short', 'steady', 'epic')
        )
        OR (
          ${table.questionKey} = 'vibe'
          AND ${table.answerKey} IN ('laugh', 'think', 'focus', 'flexible')
        )
      `
    )
  ]
);

export const discoveryPushSubscriptions = appSchema.table(
  "discovery_push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    authSecret: text("auth_secret").notNull(),
    userAgent: text("user_agent"),
    enabled: boolean("enabled").notNull().default(true),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_discovery_push_subscriptions_endpoint_uidx").on(
      table.duoId,
      table.userId,
      table.endpoint
    ),
    index("app_discovery_push_subscriptions_user_enabled_idx").on(
      table.duoId,
      table.userId,
      table.enabled
    ),
    check(
      "app_discovery_push_subscriptions_enabled_state_chk",
      sql`
        (${table.enabled} = true AND ${table.disabledAt} IS NULL)
        OR (${table.enabled} = false AND ${table.disabledAt} IS NOT NULL)
      `
    )
  ]
);
