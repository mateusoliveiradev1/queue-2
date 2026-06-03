import "server-only";

import {
  authAccounts,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications,
  createDrizzleClient,
  createRuntimePool
} from "@queue/db";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { authRateLimitAudit, authRateLimitOptions } from "./rate-limit";

type Queue2AuthDatabase = ReturnType<typeof createDrizzleClient>;
type Queue2AuthEnv = NodeJS.ProcessEnv;

const TEST_DATABASE_URL = "postgresql://queue2_test:queue2_test@127.0.0.1:5432/queue2_test";
const TEST_AUTH_SECRET = "queue2-test-secret-32-bytes-minimum";

const betterAuthSchema = {
  user: authUsers,
  session: authSessions,
  account: authAccounts,
  verification: authVerifications,
  rateLimit: authRateLimits
} as const;

const runtimePool = createRuntimePool(resolveAuthDatabaseUrl(process.env));
const runtimeDb = createDrizzleClient(runtimePool);

export const authRuntimePolicy = {
  adapter: {
    provider: "pg",
    schema: "auth",
    tables: ["user", "session", "account", "verification", "rateLimit"]
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true
    }
  },
  rateLimit: authRateLimitAudit,
  cookies: {
    prefix: "queue2",
    sameSite: "lax",
    httpOnly: true
  }
} as const;

export const auth = betterAuth(createBetterAuthOptions(runtimeDb));

export function createBetterAuthOptions(
  db: Queue2AuthDatabase,
  env: Queue2AuthEnv = process.env
): BetterAuthOptions {
  const baseURL = resolveBetterAuthUrl(env);
  const useSecureCookies = shouldUseSecureCookies(env, baseURL);

  return {
    appName: "QUEUE/2",
    baseURL,
    secret: resolveAuthSecret(env),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: betterAuthSchema,
      transaction: true
    }),
    trustedOrigins: resolveTrustedOrigins(env, baseURL),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail({ user, url });
      }
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({ user, url });
      }
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true
      }
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
        strategy: "jwe"
      }
    },
    rateLimit: authRateLimitOptions,
    advanced: {
      cookiePrefix: "queue2",
      useSecureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: useSecureCookies,
        path: "/"
      },
      ipAddress: {
        ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]
      }
    },
    plugins: [nextCookies()]
  };
}

export function resolveBetterAuthUrl(env: Queue2AuthEnv = process.env): string {
  const configured = env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_BETTER_AUTH_URL;

  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_URL is required in production.");
  }

  return "http://localhost:3000";
}

export function resolveTrustedOrigins(
  env: Queue2AuthEnv = process.env,
  baseURL = resolveBetterAuthUrl(env)
): string[] {
  const configured = splitCsv(env.BETTER_AUTH_TRUSTED_ORIGINS);
  const vercelOrigin = env.VERCEL_URL ? [`https://${env.VERCEL_URL}`] : [];
  const localOrigins =
    env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return Array.from(new Set([baseURL, ...configured, ...vercelOrigin, ...localOrigins].map(trimTrailingSlash)));
}

export function shouldUseSecureCookies(env: Queue2AuthEnv, baseURL: string): boolean {
  return env.NODE_ENV === "production" || baseURL.startsWith("https://");
}

function resolveAuthDatabaseUrl(env: Queue2AuthEnv): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  if (env.NODE_ENV === "test") {
    return TEST_DATABASE_URL;
  }

  throw new Error("DATABASE_URL is required for Better Auth runtime database access.");
}

function resolveAuthSecret(env: Queue2AuthEnv): string {
  if (env.BETTER_AUTH_SECRET) {
    return env.BETTER_AUTH_SECRET;
  }

  if (env.NODE_ENV === "test") {
    return TEST_AUTH_SECRET;
  }

  throw new Error("BETTER_AUTH_SECRET is required for Better Auth.");
}

function splitCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
