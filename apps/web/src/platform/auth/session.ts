import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./server";

export type QueueSession = Awaited<ReturnType<typeof auth.api.getSession>>;
export type QueueSessionUser = NonNullable<QueueSession>["user"];

export async function getCurrentSession(): Promise<QueueSession> {
  return auth.api.getSession({
    headers: await headers()
  });
}

export async function requireVerifiedSession(): Promise<NonNullable<QueueSession>> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.emailVerified) {
    redirect("/verificar-email");
  }

  return session;
}

export async function redirectAuthenticatedUserToPairing() {
  const session = await getCurrentSession();

  if (session?.user.emailVerified) {
    redirect("/parear");
  }
}
