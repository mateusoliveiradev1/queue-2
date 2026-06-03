import "server-only";

export const queue2DatabaseSchemas = ["auth", "catalog", "app", "ops"] as const;

export type Queue2DatabaseSchema = (typeof queue2DatabaseSchemas)[number];

export const databaseRuntime = {
  package: "@queue/db",
  boundary: "server-only"
} as const;

export * from "./client";
export * from "./schema";
