import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordSecurityAuditEvent } from "../security/audit";
import { auth } from "./server";

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

export async function getCurrentSession(): Promise<QueueSession> {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function requireVerifiedSession(): Promise<NonNullable<QueueSession>> {
  const session = await getCurrentSession();

  if (!session) {
    redirect(AUTH_LOGIN_PATH);
  }

  if (!session.user.emailVerified) {
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

  if (targetSessionId) {
    const currentSession = await requireVerifiedSession();

    const activeSessions = await auth.api.listSessions({
      headers: await headers()
    });
    const targetSession = activeSessions.find((session) => session.id === targetSessionId);

    if (targetSession) {
      await auth.api.revokeSession({
        body: {
          token: targetSession.token
        },
        headers: await headers()
      });
    }

    recordSecurityAuditEvent({
      action: "auth.session_revoked",
      actorUserId: currentSession.user.id,
      outcome: targetSession ? "revoked" : "not-found"
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

  if (session?.user.emailVerified) {
    redirect("/parear");
  }
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
