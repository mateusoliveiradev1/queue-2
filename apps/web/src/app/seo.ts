import type { Metadata } from "next";

export const siteName = "QUEUE/2";
export const siteTagline = "A fila e nossa.";
export const siteOrigin = resolveSiteOrigin();
export const siteDescription =
  "QUEUE/2 organiza o backlog coop de uma dupla fixa: descubram jogos, montem a fila real e decidam juntos o proximo zerado.";

export const noIndexRobots = {
  follow: false,
  googleBot: {
    follow: false,
    index: false,
    noimageindex: true
  },
  index: false
} satisfies NonNullable<Metadata["robots"]>;

function resolveSiteOrigin(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "https://queue-2.vercel.app";

  return normalizeOrigin(candidate);
}

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    url.hash = "";
    url.pathname = "";
    url.search = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return "https://queue-2.vercel.app";
  }
}
