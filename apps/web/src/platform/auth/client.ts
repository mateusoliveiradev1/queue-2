import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: resolveClientAuthBaseUrl()
});

export type QueueAuthClient = typeof authClient;

function resolveClientAuthBaseUrl() {
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
}
