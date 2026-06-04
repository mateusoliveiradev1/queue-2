import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { authRateLimitAudit, AUTH_RATE_LIMIT_STORAGE } from "../src/platform/auth/rate-limit";
import {
  authRuntimePolicy,
  resolveTrustedOrigins,
  shouldRequireEmailVerification,
  shouldUseSecureCookies
} from "../src/platform/auth/server";
import { authStatusMessages } from "../src/platform/auth/actions";
import {
  renderAuthEmailHtml,
  sendAuthEmail,
  shouldUseDevelopmentEmailLog
} from "../src/platform/auth/email";
import { serializeAuthLogRecord } from "../src/platform/auth/logger";
import {
  passwordBreachCheckPolicy,
  shouldCheckPwnedPasswords
} from "../src/platform/auth/password-breach";
import { serializeSecurityAuditEvent } from "../src/platform/security/audit";

const sessionSource = readFileSync("src/platform/auth/session.ts", "utf8");
const proxySource = readFileSync("proxy.ts", "utf8");
const serverActionsSource = readFileSync("src/platform/auth/server-actions.ts", "utf8");
const serverSource = readFileSync("src/platform/auth/server.ts", "utf8");
const persistentRateLimitSource = readFileSync(
  "src/platform/rate-limit/persistent.ts",
  "utf8"
);
const authSchemaSource = readFileSync("../../packages/db/src/schema/auth.ts", "utf8");
const dashboardSource = readFileSync("src/app/app/page.tsx", "utf8");
const duoSource = readFileSync("src/app/app/dupla/page.tsx", "utf8");
const profileSource = readFileSync("src/app/app/perfil/page.tsx", "utf8");
const pairingSource = readFileSync("src/app/(public)/parear/page.tsx", "utf8");
const duoRepositorySource = readFileSync(
  "src/modules/duo/infrastructure/duo-repository.ts",
  "utf8"
);

describe("protected auth gates", () => {
  it("validates sessions through Better Auth on the server", () => {
    expect(sessionSource).toContain('import "server-only"');
    expect(sessionSource).toMatch(/export async function getCurrentSession[\s\S]*auth\.api\.getSession/);
    expect(sessionSource).toMatch(/export async function getCurrentSession[\s\S]*disableCookieCache: true/);
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
    expect(sessionSource).toMatch(/activeSessions\.find[\s\S]*session\.id === targetSessionId/);
    expect(sessionSource).toContain("findOwnedSessionToken");
    expect(sessionSource).toContain("hashSessionToken");
    expect(sessionSource).toMatch(/auth\.api\.revokeSession[\s\S]*token: targetSessionToken/);
    expect(profileSource).toContain('name="sessionId"');
    expect(profileSource).toContain('name="sessionFingerprint"');
    expect(profileSource).not.toContain('name="token"');
  });

  it("logs out through Better Auth signOut", () => {
    expect(sessionSource).toMatch(/auth\.api\.signOut/);
    expect(serverActionsSource).toMatch(/auth\.api\.signOut/);
    expect(sessionSource).toContain("logoutCurrentSessionAction");
    expect(serverActionsSource).toContain("logoutAction");
  });
});

describe("auth runtime security policy", () => {
  it("uses persistent rate-limit storage instead of process memory", () => {
    expect(AUTH_RATE_LIMIT_STORAGE).toBe("database");
    expect(authRateLimitAudit.storage).toBe("database");
    expect(authRateLimitAudit.keyScope).toBe("client-ip-and-auth-path");
    expect(authRateLimitAudit.serverlessSafe).toBe(true);
    expect(authRateLimitAudit.ipHeaders).toEqual([
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip"
    ]);
    expect(authRateLimitAudit.rules["/sign-up/email"]).toEqual({
      window: 300,
      max: 5
    });
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
    expect(shouldRequireEmailVerification({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(true);
    expect(
      shouldRequireEmailVerification({
        NODE_ENV: "development",
        AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
      } as NodeJS.ProcessEnv)
    ).toBe(false);
    expect(
      shouldRequireEmailVerification({
        NODE_ENV: "production",
        AUTH_REQUIRE_EMAIL_VERIFICATION: "false"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(serverSource).toContain("revokeSessionsOnPasswordReset: true");
    expect(serverActionsSource).toContain("auth.api.requestPasswordReset");
    expect(serverActionsSource).toContain("auth.api.resetPassword");
    expect(serverActionsSource).toContain("validateQueuePassword");
    expect(serverActionsSource).toContain("checkPasswordBreach");
    expect(authRuntimePolicy.emailAndPassword.compromisedPasswordCheck).toEqual(
      passwordBreachCheckPolicy
    );
    expect(passwordBreachCheckPolicy.sends).toBe("sha1-prefix-only");
    expect(shouldCheckPwnedPasswords({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(true);
    expect(
      shouldCheckPwnedPasswords({
        NODE_ENV: "development",
        AUTH_PASSWORD_BREACH_CHECK: "true"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(sessionSource).toContain("shouldRequireEmailVerification()");
  });

  it("allows local auth email logging only outside production", async () => {
    expect(
      shouldUseDevelopmentEmailLog({
        NODE_ENV: "development"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      shouldUseDevelopmentEmailLog({
        NODE_ENV: "production"
      } as NodeJS.ProcessEnv)
    ).toBe(false);

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    try {
      await sendAuthEmail(
        {
          to: "dev@example.com",
          subject: "Verifique seu email - QUEUE/2",
          text: "Link de verificacao: http://localhost:3000/verificar-email?token=dev",
          html: "<a>dev</a>"
        },
        { NODE_ENV: "development" } as NodeJS.ProcessEnv
      );
      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("queue2.dev-email"));
    } finally {
      infoSpy.mockRestore();
    }
  });

  it("renders auth emails with a structured card and wrapped fallback link", () => {
    const html = renderAuthEmailHtml({
      title: "Verifique seu email",
      eyebrow: "Confirmacao de conta",
      lead: "Confirme seu email para liberar o pareamento e comecar a montar a fila da dupla.",
      preview: "Confirme seu email para entrar na fila da dupla.",
      cta: "Verificar email",
      securityNote: "Este link confirma apenas o email desta conta.",
      steps: [
        { label: "01", value: "Email confirmado" },
        { label: "02", value: "Dupla liberada" }
      ],
      url: "https://queue-2.vercel.app/api/auth/verify-email?token=very-long-token&callbackURL=%2Fverificar-email"
    });

    expect(html).toContain("max-width:600px");
    expect(html).toContain("border-radius:8px");
    expect(html).toContain("box-shadow:0 18px 45px");
    expect(html).toContain("QUEUE<span");
    expect(html).toContain("/2");
    expect(html).toContain("Email confirmado");
    expect(html).toContain("Nota de seguranca");
    expect(html).toContain("overflow-wrap:anywhere");
    expect(html).toContain("word-break:break-all");
    expect(html).toContain("A fila e nossa");
    expect(html).not.toContain("<main");
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

    expect(serverActionsSource).not.toContain("console.error");
    expect(serverActionsSource).not.toMatch(/redirectTo\([^)]*error\.message/);
  });

  it("emits structured auth logs without sensitive Better Auth arguments", () => {
    const record = serializeAuthLogRecord(
      "error",
      "Verification failed for jogador@example.com token super-secret-token"
    );

    expect(record).toContain('"scope":"better-auth"');
    expect(record).toContain('"event":"auth.email_verification_event"');
    expect(record).not.toContain("jogador@example.com");
    expect(record).not.toContain("super-secret-token");
    expect(authRuntimePolicy.logging).toEqual({
      structured: true,
      redactsArguments: true,
      level: "warn"
    });
    expect(serverSource).toContain("logger: authLogger");
  });

  it("retains security audit events without logging pairing codes or session tokens", () => {
    const record = serializeSecurityAuditEvent({
      action: "duo.pairing_attempt",
      actorUserId: "user-1",
      outcome: "inactive",
      attemptsRemaining: 2
    });

    expect(record).toContain('"scope":"security.audit"');
    expect(record).toContain('"action":"duo.pairing_attempt"');
    expect(record).not.toMatch(/token|password|email|pairingCode/i);
    expect(sessionSource).toContain('action: "auth.session_revoked"');
    expect(pairingSource).toContain('action: "duo.pairing_attempt"');
    expect(duoRepositorySource).toContain("'duo.pairing_completed'");
  });
});
