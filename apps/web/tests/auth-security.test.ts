import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { authRateLimitAudit, AUTH_RATE_LIMIT_STORAGE } from "../src/platform/auth/rate-limit";
import {
  authRuntimePolicy,
  resolveTrustedOrigins,
  shouldUseSecureCookies
} from "../src/platform/auth/server";
import { authStatusMessages } from "../src/platform/auth/actions";

const sessionSource = readFileSync("src/platform/auth/session.ts", "utf8");
const proxySource = readFileSync("proxy.ts", "utf8");
const actionsSource = readFileSync("src/platform/auth/actions.ts", "utf8");
const serverSource = readFileSync("src/platform/auth/server.ts", "utf8");
const persistentRateLimitSource = readFileSync(
  "src/platform/rate-limit/persistent.ts",
  "utf8"
);
const authSchemaSource = readFileSync("../../packages/db/src/schema/auth.ts", "utf8");
const dashboardSource = readFileSync("src/app/app/page.tsx", "utf8");
const duoSource = readFileSync("src/app/app/dupla/page.tsx", "utf8");
const profileSource = readFileSync("src/app/app/perfil/page.tsx", "utf8");

describe("protected auth gates", () => {
  it("validates sessions through Better Auth on the server", () => {
    expect(sessionSource).toContain('import "server-only"');
    expect(sessionSource).toMatch(/export async function getCurrentSession[\s\S]*auth\.api\.getSession/);
    expect(sessionSource).toMatch(/export async function requireVerifiedSession[\s\S]*getCurrentSession\(\)/);
    expect(sessionSource).toContain("session.user.emailVerified");
    expect(sessionSource).toContain("/verificar-email");
    expect(sessionSource).toContain("/login");
  });

  it("ties authenticated pages to server authorization instead of proxy-only checks", () => {
    expect(dashboardSource).toContain("requireVerifiedSession");
    expect(duoSource).toContain("requireVerifiedSession");
    expect(profileSource).toContain("getVerifiedProfileAuthContext");
  });

  it("keeps proxy scoped to UX-only redirects", () => {
    expect(proxySource).toContain("UX-only redirect optimization");
    expect(proxySource).toContain("requireVerifiedSession");
    expect(proxySource).toContain('matcher: ["/app/:path*"]');
    expect(proxySource).toContain("NextResponse.redirect");
    expect(proxySource).toContain("hasQueueSessionCookie");
  });
});

describe("session management controls", () => {
  it("supports persistent sessions after refresh without using client authority", () => {
    expect(authRuntimePolicy.session.expiresInDays).toBe(14);
    expect(authRuntimePolicy.session.updateAgeHours).toBe(24);
    expect(authRuntimePolicy.session.cookieCache).toEqual({
      enabled: true,
      strategy: "jwe"
    });
    expect(serverSource).toContain("cookieCache");
    expect(serverSource).toContain('strategy: "jwe"');
  });

  it("lists active sessions and revokes by server-resolved token", () => {
    expect(sessionSource).toMatch(/auth\.api\.listSessions/);
    expect(sessionSource).toMatch(/targetSessionId/);
    expect(sessionSource).toMatch(/activeSessions\.find\(\(session\) => session\.id === targetSessionId\)/);
    expect(sessionSource).toMatch(/auth\.api\.revokeSession[\s\S]*token: targetSession\.token/);
    expect(profileSource).toContain('name="sessionId"');
    expect(profileSource).not.toContain('name="token"');
  });

  it("logs out through Better Auth signOut", () => {
    expect(sessionSource).toMatch(/auth\.api\.signOut/);
    expect(actionsSource).toMatch(/auth\.api\.signOut/);
    expect(sessionSource).toContain("logoutCurrentSessionAction");
    expect(actionsSource).toContain("logoutAction");
  });
});

describe("auth runtime security policy", () => {
  it("uses persistent rate-limit storage instead of process memory", () => {
    expect(AUTH_RATE_LIMIT_STORAGE).toBe("database");
    expect(authRateLimitAudit.storage).toBe("database");
    expect(authRateLimitAudit.serverlessSafe).toBe(true);
    expect(authRateLimitAudit.storage).not.toMatch(/memory|process/i);
    expect(authRuntimePolicy.rateLimit.storage).toBe("database");
    expect(authSchemaSource).toContain('bigint("last_request", { mode: "number" })');
    expect(authSchemaSource).not.toContain('timestamp("last_request"');
    expect(persistentRateLimitSource).toContain("requested_at_ms");
    expect(persistentRateLimitSource).toContain("last_request::text");
    expect(persistentRateLimitSource).not.toContain("last_request: Date");
  });

  it("keeps trusted origins allowlisted and cookies secure in deployed environments", () => {
    const origins = resolveTrustedOrigins(
      {
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://queue.example",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.queue.example, https://queue.example"
      } as NodeJS.ProcessEnv,
      "https://queue.example"
    );

    expect(origins).toEqual(["https://queue.example", "https://preview.queue.example"]);
    expect(shouldUseSecureCookies({ NODE_ENV: "production" } as NodeJS.ProcessEnv, "http://localhost:3000")).toBe(
      true
    );
    expect(shouldUseSecureCookies({ NODE_ENV: "development" } as NodeJS.ProcessEnv, "https://queue.example")).toBe(
      true
    );
    expect(authRuntimePolicy.cookies).toMatchObject({
      prefix: "queue2",
      sameSite: "lax",
      httpOnly: true
    });
  });

  it("keeps reset flow, verification and password policies explicit", () => {
    expect(authRuntimePolicy.emailAndPassword.requireEmailVerification).toBe(true);
    expect(serverSource).toContain("revokeSessionsOnPasswordReset: true");
    expect(actionsSource).toContain("auth.api.requestPasswordReset");
    expect(actionsSource).toContain("auth.api.resetPassword");
    expect(actionsSource).toContain("validateQueuePassword");
  });

  it("redacts user-facing auth errors", () => {
    const forbiddenFragments = [
      "better auth",
      "database",
      "postgres",
      "sql",
      "secret",
      "token",
      "usuario encontrado",
      "conta encontrada",
      "erro interno"
    ];

    for (const messages of Object.values(authStatusMessages)) {
      for (const message of Object.values(messages)) {
        const normalized = message.toLowerCase();

        for (const fragment of forbiddenFragments) {
          expect(normalized).not.toContain(fragment);
        }
      }
    }

    expect(actionsSource).not.toContain("console.error");
    expect(actionsSource).not.toMatch(/redirectTo\([^)]*error\.message/);
  });
});
