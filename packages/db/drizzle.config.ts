import { defineConfig } from "drizzle-kit";

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

if (!directDatabaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL is required for migrations. Use a direct Neon connection, not the pooled runtime URL."
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: directDatabaseUrl
  },
  migrations: {
    schema: "ops",
    table: "__drizzle_migrations"
  },
  strict: true,
  verbose: true
});
