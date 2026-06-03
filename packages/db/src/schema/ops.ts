import { index, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { duos } from "./app";

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
