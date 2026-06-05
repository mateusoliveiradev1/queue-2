import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { duos } from "./app.ts";
import { catalogGames } from "./catalog.ts";

export const opsSchema = pgSchema("ops");

export const domainEvents = opsSchema.table(
  "domain_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("ops_domain_events_duo_occurred_idx").on(table.duoId, table.occurredAt),
    index("ops_domain_events_aggregate_idx").on(table.aggregateType, table.aggregateId)
  ]
);

export const auditEvents = opsSchema.table(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    metadata: jsonb("metadata").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("ops_audit_events_duo_occurred_idx").on(table.duoId, table.occurredAt),
    index("ops_audit_events_actor_idx").on(table.actorUserId)
  ]
);

export const idempotencyKeys = opsSchema.table(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    scope: varchar("scope", { length: 80 }).notNull(),
    responseDigest: text("response_digest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => [
    uniqueIndex("ops_idempotency_keys_scope_key_uidx").on(table.scope, table.key),
    index("ops_idempotency_keys_duo_scope_idx").on(table.duoId, table.scope),
    index("ops_idempotency_keys_expires_idx").on(table.expiresAt)
  ]
);

export const catalogSyncRuns = opsSchema.table(
  "catalog_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 40 }).notNull().default("RAWG"),
    mode: varchar("mode", { length: 24 }).notNull(),
    dryRun: boolean("dry_run").notNull().default(true),
    status: varchar("status", { length: 24 }).notNull().default("running"),
    requestedBy: text("requested_by"),
    inputCount: integer("input_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("ops_catalog_sync_runs_status_started_idx").on(table.status, table.startedAt),
    index("ops_catalog_sync_runs_source_started_idx").on(table.source, table.startedAt),
    check(
      "ops_catalog_sync_runs_mode_chk",
      sql`${table.mode} IN ('dry-run', 'apply')`
    ),
    check(
      "ops_catalog_sync_runs_status_chk",
      sql`${table.status} IN ('running', 'completed', 'failed', 'cancelled')`
    ),
    check(
      "ops_catalog_sync_runs_counts_non_negative_chk",
      sql`
        ${table.inputCount} >= 0
        AND ${table.createdCount} >= 0
        AND ${table.updatedCount} >= 0
        AND ${table.skippedCount} >= 0
        AND ${table.failedCount} >= 0
      `
    )
  ]
);

export const catalogSyncRunItems = opsSchema.table(
  "catalog_sync_run_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => catalogSyncRuns.id, { onDelete: "cascade" }),
    rawgId: integer("rawg_id"),
    slug: varchar("slug", { length: 160 }).notNull(),
    status: varchar("status", { length: 24 }).notNull(),
    gameId: uuid("game_id").references(() => catalogGames.id, { onDelete: "set null" }),
    changes: jsonb("changes").notNull().default(sql`'{}'::jsonb`),
    errorCode: varchar("error_code", { length: 80 }),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("ops_catalog_sync_run_items_run_slug_uidx").on(table.runId, table.slug),
    index("ops_catalog_sync_run_items_run_status_idx").on(table.runId, table.status),
    index("ops_catalog_sync_run_items_game_idx").on(table.gameId),
    check(
      "ops_catalog_sync_run_items_status_chk",
      sql`${table.status} IN ('planned', 'created', 'updated', 'skipped', 'failed')`
    )
  ]
);

export const scheduledJobs = opsSchema.table(
  "scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    duoId: uuid("duo_id")
      .notNull()
      .references(() => duos.id, { onDelete: "cascade" }),
    jobKey: text("job_key").notNull(),
    jobType: varchar("job_type", { length: 60 }).notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("ops_scheduled_jobs_key_uidx").on(table.jobKey),
    index("ops_scheduled_jobs_due_idx")
      .on(table.status, table.runAt, table.id)
      .where(sql`${table.status} IN ('pending', 'failed')`),
    index("ops_scheduled_jobs_duo_type_idx").on(
      table.duoId,
      table.jobType,
      table.runAt
    ),
    check(
      "ops_scheduled_jobs_status_chk",
      sql`${table.status} IN ('pending', 'claimed', 'completed', 'failed', 'cancelled')`
    ),
    check("ops_scheduled_jobs_attempts_non_negative_chk", sql`${table.attempts} >= 0`),
    check(
      "ops_scheduled_jobs_claim_state_chk",
      sql`
        (${table.status} = 'claimed' AND ${table.lockedAt} IS NOT NULL)
        OR (${table.status} <> 'claimed')
      `
    )
  ]
);
