import "server-only";

import { createHash } from "node:crypto";

import { createRuntimePool, type QueueDbPool } from "@queue/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordSecurityAuditEvent } from "../security/audit";
import { auth, shouldRequireEmailVerification } from "./server";

export type QueueSession = Awaited<ReturnType<typeof auth.api.getSession>>;
export type QueueSessionUser = NonNullable<QueueSession>["user"];
export type QueueActiveSession = Awaited<ReturnType<typeof auth.api.listSessions>>[number];

type VerifiedProfileAuthContext = {
  currentSession: NonNullable<QueueSession>;
  activeSessions: QueueActiveSession[];
};

const AUTH_LOGIN_PATH = "/login";
const AUTH_VERIFY_EMAIL_PATH = "/verificar-email";
const PROFILE_PATH = "/app/perfil";

let authSessionPool: QueueDbPool | undefined;

export async function getCurrentSession(): Promise<QueueSession> {
  return auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true
    }
  });
}

export async function requireVerifiedSession(): Promise<NonNullable<QueueSession>> {
  const session = await getCurrentSession();

  if (!session) {
    redirect(AUTH_LOGIN_PATH);
  }

  if (shouldRequireEmailVerification() && !session.user.emailVerified) {
    redirect(
      buildPath(AUTH_VERIFY_EMAIL_PATH, {
        email: session.user.email,
        estado: "verifique-email"
      })
    );
  }

  return session;
}

export async function getVerifiedProfileAuthContext(): Promise<VerifiedProfileAuthContext> {
  const currentSession = await requireVerifiedSession();
  const activeSessions = await auth.api.listSessions({
    headers: await headers()
  });

  return {
    currentSession,
    activeSessions
  };
}

export async function revokeSessionAction(formData: FormData) {
  "use server";

  const targetSessionId = getFormString(formData, "sessionId");
  const targetSessionFingerprint = getFormString(formData, "sessionFingerprint");
  const targetSessionUpdatedAt = getFormString(formData, "sessionUpdatedAt");

  if (targetSessionId) {
    const currentSession = await requireVerifiedSession();

    const activeSessions = await auth.api.listSessions({
      headers: await headers()
    });
    const targetSession = activeSessions.find(
      (session) =>
        session.id === targetSessionId ||
        hashSessionToken(session.token) === targetSessionFingerprint
    );
    const targetSessionToken =
      targetSession?.token ??
      (await findOwnedSessionToken({
        sessionFingerprint: targetSessionFingerprint,
        sessionId: targetSessionId,
        sessionUpdatedAt: targetSessionUpdatedAt,
        userId: currentSession.user.id
      }));

    if (targetSessionToken) {
      await auth.api.revokeSession({
        body: {
          token: targetSessionToken
        },
        headers: await headers()
      });
    }

    recordSecurityAuditEvent({
      action: "auth.session_revoked",
      actorUserId: currentSession.user.id,
      outcome: targetSessionToken ? "revoked" : "not-found"
    });
  }

  redirect(buildPath(PROFILE_PATH, { estado: "sessao-revogada" }));
}

export async function logoutCurrentSessionAction(_formData?: FormData) {
  "use server";

  try {
    await auth.api.signOut({
      headers: await headers()
    });
  } catch {
    // Logout is idempotent for the browser; errors are not reflected to users.
  }

  redirect(buildPath(AUTH_LOGIN_PATH, { estado: "saiu" }));
}

export async function redirectAuthenticatedUserToPairing() {
  const session = await getCurrentSession();

  if (session && (!shouldRequireEmailVerification() || session.user.emailVerified)) {
    redirect("/parear");
  }
}

export function hashSessionToken(token: string | undefined): string {
  return token ? createHash("sha256").update(token).digest("hex") : "";
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function findOwnedSessionToken({
  sessionFingerprint,
  sessionId,
  sessionUpdatedAt,
  userId
}: {
  sessionFingerprint: string;
  sessionId: string;
  sessionUpdatedAt: string;
  userId: string;
}): Promise<string | null> {
  const pool = getAuthSessionPool();
  const result = await pool.query<{ id: string; token: string; updated_at: Date }>(
    `
      SELECT id, token, updated_at
      FROM auth.session
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `,
    [userId]
  );

  const targetUpdatedAt = Date.parse(sessionUpdatedAt);
  const targetSession = result.rows.find((session) => {
    const sameUpdatedAt =
      Number.isFinite(targetUpdatedAt) &&
      Math.abs(session.updated_at.getTime() - targetUpdatedAt) < 1;

    return (
      session.id === sessionId ||
      session.token === sessionId ||
      hashSessionToken(session.token) === sessionFingerprint ||
      sameUpdatedAt
    );
  });

  if (targetSession) {
    return targetSession.token;
  }

  return null;
}

function getAuthSessionPool(): QueueDbPool {
  authSessionPool ??= createRuntimePool();
  return authSessionPool;
}

function buildPath(path: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
}
