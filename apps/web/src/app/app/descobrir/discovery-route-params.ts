import { z } from "zod";

import type { DiscoveryDeckFilters } from "../../../modules/discovery";

const uuidSchema = z.string().uuid();

export function getDiscoveryFilters(
  params: Record<string, string | string[] | undefined> | undefined
): DiscoveryDeckFilters {
  const platform = getSearchParam(params?.plataforma);
  const availability = getSearchParam(params?.disponibilidade);
  const tempo = getSearchParam(params?.tempo);
  const coop = getSearchParam(params?.coop);
  const mood = getSearchParam(params?.mood);
  const anoDe = parseYear(getSearchParam(params?.anoDe));
  const anoAte = parseYear(getSearchParam(params?.anoAte));
  const genero = getSearchParam(params?.genero)?.trim().toLowerCase();
  const raridade = getSearchParam(params?.raridade);

  return {
    commonPlatformOnly: platform !== "livre",
    availability:
      availability === "gratis" || availability === "game-pass"
        ? availability === "gratis"
          ? "free"
          : "game-pass"
        : undefined,
    maxEstimatedMinutes:
      tempo === "curto" ? 480 : tempo === "medio" ? 1200 : undefined,
    recommendation: {
      coopTypes: isCoopType(coop) ? [coop] : undefined,
      genres: genero ? [genero] : undefined,
      mood: isMoodVibe(mood)
        ? {
            commitment: "steady",
            conflictResolution: mood === "flexible" ? "flexible" : "none",
            energy: "medium",
            vibe: mood
          }
        : undefined,
      rarity: isRarity(raridade) ? [raridade] : undefined,
      yearFrom: anoDe,
      yearTo: anoAte
    }
  };
}

export function getDiscoveryFiltersFromPath(path: string): DiscoveryDeckFilters {
  const url = new URL(path, "https://queue.local");
  return getDiscoveryFilters(Object.fromEntries(url.searchParams));
}

export function buildDiscoveryPath(
  params: Record<string, string | string[] | undefined> | undefined
): string {
  const urlParams = new URLSearchParams();

  for (const key of [
    "plataforma",
    "disponibilidade",
    "tempo",
    "coop",
    "mood",
    "anoDe",
    "anoAte",
    "genero",
    "raridade",
    "pagina",
    "live",
    "surpresa"
  ]) {
    const value = getSearchParam(params?.[key]);

    if (value) {
      urlParams.set(key, value);
    }
  }

  const query = urlParams.toString();
  return query ? `/app/descobrir?${query}` : "/app/descobrir";
}

export function getDiscoveryFilterParams(
  params: Record<string, string | string[] | undefined> | undefined
) {
  return {
    anoAte: getSearchParam(params?.anoAte),
    anoDe: getSearchParam(params?.anoDe),
    coop: getSearchParam(params?.coop),
    disponibilidade: getSearchParam(params?.disponibilidade),
    genero: getSearchParam(params?.genero),
    mood: getSearchParam(params?.mood),
    plataforma: getSearchParam(params?.plataforma),
    raridade: getSearchParam(params?.raridade),
    tempo: getSearchParam(params?.tempo)
  };
}

export function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function parseUuidSearchParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseYear(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) ? year : undefined;
}

function isCoopType(
  value: string | null
): value is "campaign" | "online" | "local" | "shared-screen" {
  return (
    value === "campaign" ||
    value === "online" ||
    value === "local" ||
    value === "shared-screen"
  );
}

function isMoodVibe(
  value: string | null
): value is "laugh" | "think" | "focus" | "flexible" {
  return (
    value === "laugh" ||
    value === "think" ||
    value === "focus" ||
    value === "flexible"
  );
}

function isRarity(
  value: string | null
): value is "common" | "rare" | "epic" | "legendary" {
  return (
    value === "common" ||
    value === "rare" ||
    value === "epic" ||
    value === "legendary"
  );
}
