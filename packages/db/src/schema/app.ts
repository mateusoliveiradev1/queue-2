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

export const playActiveGames = appSchema.table(
  "play_active_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull(),
    position: smallint("position").notNull(),
    addedByUserId: text("added_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_active_games_library_uidx").on(table.libraryGameId),
    uniqueIndex("app_play_active_games_one_principal_uidx")
      .on(table.duoId)
      .where(sql`${table.role} = 'principal'`),
    uniqueIndex("app_play_active_games_duo_position_uidx").on(table.duoId, table.position),
    index("app_play_active_games_duo_order_idx").on(
      table.duoId,
      table.position,
      table.updatedAt
    ),
    check("app_play_active_games_role_chk", sql`${table.role} IN ('principal', 'secondary')`),
    check("app_play_active_games_position_chk", sql`${table.position} BETWEEN 1 AND 3`),
    check(
      "app_play_active_games_role_position_chk",
      sql`
        (${table.role} = 'principal' AND ${table.position} = 1)
        OR (${table.role} = 'secondary' AND ${table.position} IN (2, 3))
      `
    )
  ]
);

export const playSessions = appSchema.table(
  "play_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "restrict" }),
    kind: varchar("kind", { length: 16 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_sessions_one_active_live_uidx")
      .on(table.duoId)
      .where(sql`${table.kind} = 'live' AND ${table.status} = 'active'`),
    index("app_play_sessions_duo_game_started_idx").on(
      table.duoId,
      table.libraryGameId,
      table.startedAt
    ),
    index("app_play_sessions_pending_idx")
      .on(table.duoId, table.status, table.updatedAt)
      .where(sql`${table.status} = 'pending_confirmation'`),
    check("app_play_sessions_kind_chk", sql`${table.kind} IN ('live', 'offline')`),
    check(
      "app_play_sessions_status_chk",
      sql`${table.status} IN ('active', 'pending_confirmation', 'confirmed', 'cancelled')`
    ),
    check(
      "app_play_sessions_duration_non_negative_chk",
      sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} >= 0`
    ),
    check(
      "app_play_sessions_ended_after_started_chk",
      sql`${table.endedAt} IS NULL OR ${table.endedAt} >= ${table.startedAt}`
    ),
    check(
      "app_play_sessions_active_live_shape_chk",
      sql`
        ${table.kind} <> 'live'
        OR ${table.status} <> 'active'
        OR (${table.endedAt} IS NULL AND ${table.durationSeconds} IS NULL)
      `
    ),
    check(
      "app_play_sessions_offline_duration_chk",
      sql`${table.kind} <> 'offline' OR ${table.durationSeconds} IS NOT NULL`
    )
  ]
);

export const playSessionConfirmations = appSchema.table(
  "play_session_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => playSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_session_confirmations_session_user_uidx").on(
      table.sessionId,
      table.userId
    ),
    index("app_play_session_confirmations_duo_session_idx").on(table.duoId, table.sessionId)
  ]
);

export const playProgress = appSchema.table(
  "play_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "cascade" }),
    confirmedCoopSeconds: integer("confirmed_coop_seconds").notNull().default(0),
    subjectivePercent: smallint("subjective_percent"),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_progress_library_uidx").on(table.libraryGameId),
    index("app_play_progress_duo_idx").on(table.duoId, table.updatedAt),
    check("app_play_progress_seconds_non_negative_chk", sql`${table.confirmedCoopSeconds} >= 0`),
    check(
      "app_play_progress_subjective_percent_chk",
      sql`${table.subjectivePercent} IS NULL OR ${table.subjectivePercent} BETWEEN 0 AND 100`
    )
  ]
);

export const playChapters = appSchema.table(
  "play_chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    position: smallint("position").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: text("completed_by_user_id").references(() => authUsers.id, {
      onDelete: "restrict"
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_chapters_library_position_uidx").on(
      table.libraryGameId,
      table.position
    ),
    index("app_play_chapters_duo_game_idx").on(
      table.duoId,
      table.libraryGameId,
      table.position
    ),
    check("app_play_chapters_title_length_chk", sql`char_length(${table.title}) BETWEEN 1 AND 120`),
    check("app_play_chapters_position_positive_chk", sql`${table.position} > 0`),
    check(
      "app_play_chapters_completion_state_chk",
      sql`
        (${table.completedAt} IS NULL AND ${table.completedByUserId} IS NULL)
        OR (${table.completedAt} IS NOT NULL AND ${table.completedByUserId} IS NOT NULL)
      `
    )
  ]
);

export const playMomentos = appSchema.table(
  "play_momentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => playSessions.id, { onDelete: "set null" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    isSpoiler: boolean("is_spoiler").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("app_play_momentos_duo_game_created_idx").on(
      table.duoId,
      table.libraryGameId,
      table.createdAt
    ),
    index("app_play_momentos_session_idx")
      .on(table.sessionId)
      .where(sql`${table.sessionId} IS NOT NULL`),
    check("app_play_momentos_body_length_chk", sql`char_length(${table.body}) BETWEEN 1 AND 2000`)
  ]
);

export const playSpoilerReveals = appSchema.table(
  "play_spoiler_reveals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    momentoId: uuid("momento_id")
      .notNull()
      .references(() => playMomentos.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    revealedAt: timestamp("revealed_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_spoiler_reveals_momento_user_uidx").on(
      table.momentoId,
      table.userId
    ),
    index("app_play_spoiler_reveals_duo_user_idx").on(
      table.duoId,
      table.userId,
      table.revealedAt
    )
  ]
);

export const playTerminalRequests = appSchema.table(
  "play_terminal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "restrict" }),
    targetStatus: varchar("target_status", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    confirmedByUserId: text("confirmed_by_user_id").references(() => authUsers.id, {
      onDelete: "restrict"
    }),
    cancelledByUserId: text("cancelled_by_user_id").references(() => authUsers.id, {
      onDelete: "restrict"
    }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_terminal_requests_one_pending_uidx")
      .on(table.libraryGameId)
      .where(sql`${table.status} = 'pending'`),
    index("app_play_terminal_requests_duo_status_idx").on(
      table.duoId,
      table.status,
      table.updatedAt
    ),
    check("app_play_terminal_requests_target_status_chk", sql`${table.targetStatus} IN ('zerado', 'dropado')`),
    check("app_play_terminal_requests_status_chk", sql`${table.status} IN ('pending', 'confirmed', 'cancelled')`),
    check(
      "app_play_terminal_requests_partner_confirm_chk",
      sql`${table.confirmedByUserId} IS NULL OR ${table.confirmedByUserId} <> ${table.requestedByUserId}`
    ),
    check(
      "app_play_terminal_requests_state_chk",
      sql`
        (
          ${table.status} = 'pending'
          AND ${table.confirmedByUserId} IS NULL
          AND ${table.confirmedAt} IS NULL
          AND ${table.cancelledByUserId} IS NULL
          AND ${table.cancelledAt} IS NULL
        )
        OR (
          ${table.status} = 'confirmed'
          AND ${table.confirmedByUserId} IS NOT NULL
          AND ${table.confirmedAt} IS NOT NULL
          AND ${table.cancelledByUserId} IS NULL
          AND ${table.cancelledAt} IS NULL
        )
        OR (
          ${table.status} = 'cancelled'
          AND ${table.confirmedByUserId} IS NULL
          AND ${table.confirmedAt} IS NULL
          AND ${table.cancelledByUserId} IS NOT NULL
          AND ${table.cancelledAt} IS NOT NULL
        )
      `
    )
  ]
);

export const playScheduledSessions = appSchema.table(
  "play_scheduled_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => duoLibraryGames.id, { onDelete: "restrict" }),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("scheduled"),
    reminderDueAt: timestamp("reminder_due_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    updatedByUserId: text("updated_by_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("app_play_scheduled_sessions_duo_start_idx").on(
      table.duoId,
      table.scheduledStartAt
    ),
    index("app_play_scheduled_sessions_reminder_due_idx")
      .on(table.reminderDueAt)
      .where(sql`${table.status} = 'scheduled'`),
    check(
      "app_play_scheduled_sessions_status_chk",
      sql`${table.status} IN ('scheduled', 'completed', 'cancelled')`
    ),
    check(
      "app_play_scheduled_sessions_future_shape_chk",
      sql`${table.scheduledStartAt} > ${table.createdAt} - interval '1 minute'`
    ),
    check(
      "app_play_scheduled_sessions_reminder_due_chk",
      sql`${table.reminderDueAt} = ${table.scheduledStartAt} - interval '30 minutes'`
    )
  ]
);

export const playScheduledAttendance = appSchema.table(
  "play_scheduled_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    scheduledSessionId: uuid("scheduled_session_id")
      .notNull()
      .references(() => playScheduledSessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_play_scheduled_attendance_session_user_uidx").on(
      table.scheduledSessionId,
      table.userId
    ),
    index("app_play_scheduled_attendance_duo_session_idx").on(
      table.duoId,
      table.scheduledSessionId
    )
  ]
);

export const playNotifications = appSchema.table(
  "play_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id").references(() => authUsers.id, {
      onDelete: "cascade"
    }),
    actorUserId: text("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    notificationType: varchar("notification_type", { length: 40 }).notNull(),
    state: varchar("state", { length: 20 }).notNull().default("unread"),
    actionRefType: varchar("action_ref_type", { length: 40 }),
    actionRefId: uuid("action_ref_id"),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("app_play_notifications_duo_state_idx").on(
      table.duoId,
      table.state,
      table.createdAt
    ),
    index("app_play_notifications_recipient_state_idx").on(
      table.duoId,
      table.recipientUserId,
      table.state,
      table.createdAt
    ),
    index("app_play_notifications_action_idx")
      .on(table.duoId, table.actionRefType, table.actionRefId)
      .where(sql`${table.actionRefId} IS NOT NULL`),
    check(
      "app_play_notifications_type_chk",
      sql`${table.notificationType} IN ('session-confirmation', 'scheduled-session', 'reminder-sent', 'live-session', 'terminal-request', 'push-failure', 'push-disabled')`
    ),
    check(
      "app_play_notifications_state_chk",
      sql`${table.state} IN ('unread', 'read', 'actioned', 'archived')`
    ),
    check("app_play_notifications_title_length_chk", sql`char_length(${table.title}) BETWEEN 1 AND 120`),
    check(
      "app_play_notifications_read_state_chk",
      sql`(${table.state} = 'unread' AND ${table.readAt} IS NULL) OR (${table.state} <> 'unread')`
    )
  ]
);

export const pushSubscriptions = appSchema.table(
  "push_subscriptions",
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
    uniqueIndex("app_push_subscriptions_endpoint_uidx").on(
      table.duoId,
      table.userId,
      table.endpoint
    ),
    index("app_push_subscriptions_user_enabled_idx").on(
      table.duoId,
      table.userId,
      table.enabled
    ),
    check(
      "app_push_subscriptions_enabled_state_chk",
      sql`
        (${table.enabled} = true AND ${table.disabledAt} IS NULL)
        OR (${table.enabled} = false AND ${table.disabledAt} IS NOT NULL)
      `
    )
  ]
);

export const duoXpAwards = appSchema.table(
  "duo_xp_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    awardKey: text("award_key").notNull(),
    sourceType: varchar("source_type", { length: 40 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    amount: integer("amount").notNull(),
    awardedByUserId: text("awarded_by_user_id").references(() => authUsers.id, {
      onDelete: "set null"
    }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("app_duo_xp_awards_key_uidx").on(table.duoId, table.awardKey),
    uniqueIndex("app_duo_xp_awards_source_uidx").on(
      table.duoId,
      table.sourceType,
      table.sourceId
    ),
    index("app_duo_xp_awards_duo_awarded_idx").on(table.duoId, table.awardedAt),
    check(
      "app_duo_xp_awards_source_type_chk",
      sql`${table.sourceType} IN ('chapter', 'live-session', 'offline-session', 'scheduled-session', 'terminal-status')`
    ),
    check("app_duo_xp_awards_amount_positive_chk", sql`${table.amount} > 0`)
  ]
);
