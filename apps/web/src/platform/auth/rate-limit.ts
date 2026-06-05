import "server-only";

import type { BetterAuthRateLimitOptions } from "better-auth";

export const AUTH_RATE_LIMIT_STORAGE = "database" as const;
export const AUTH_RATE_LIMIT_KEY_SCOPE = "client-ip-and-auth-path" as const;

export const authRateLimitRules = {
  "/sign-in/email": {
    window: 60,
    max: 5
  },
  "/sign-up/email": {
    window: 300,
    max: 5
  },
  "/send-verification-email": {
    window: 60,
    max: 2
  },
  "/request-password-reset": {
    window: 300,
    max: 3
  },
  "/reset-password": {
    window: 300,
    max: 5
  }
} as const;

export const authRateLimitOptions = {
  enabled: true,
  storage: AUTH_RATE_LIMIT_STORAGE,
  modelName: "rateLimit",
  window: 60,
  max: 60,
  customRules: authRateLimitRules
} satisfies BetterAuthRateLimitOptions;

export const authRateLimitAudit = {
  storage: AUTH_RATE_LIMIT_STORAGE,
  keyScope: AUTH_RATE_LIMIT_KEY_SCOPE,
  serverlessSafe: true,
  table: 'auth.rate_limit',
  ipHeaders: ["x-forwarded-for"],
  rules: authRateLimitRules,
  protects: [
    "login",
    "signup",
    "verification-resend",
    "password-reset-request",
    "password-reset-completion"
  ]
} as const;
