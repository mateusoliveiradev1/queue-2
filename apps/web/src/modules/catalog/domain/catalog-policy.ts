import type {
  CatalogAvailabilityRecord,
  CatalogGameDetailRecord,
  CatalogGameRecord,
  CatalogTimeEstimateRecord
} from "../application/ports";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MainFlowEligibility =
  | { eligible: true; reason: "confirmed-two-player-campaign" }
  | {
      eligible: false;
      reason:
        | "coop-not-confirmed"
        | "two-player-range-missing"
        | "two-player-range-excluded"
        | "confirmation-source-missing"
        | "not-marked-main-flow";
    };

export type SourceAttribution = {
  label: string;
  href: string;
};

export type FreshnessState = {
  label: string;
  tone: "fresh" | "stale" | "unknown";
};

export type EstimatedTimeState =
  | {
      kind: "available";
      label: string;
      sourceLabel: string;
      sourceUrl: string | null;
      freshnessLabel: string;
    }
  | {
      kind: "missing";
      label: "Sem fonte confiavel ainda";
    };

export type AvailabilityState =
  | {
      kind: "available";
      label: string;
      sourceLabel: string;
      sourceUrl: string | null;
      freshnessLabel: string;
    }
  | {
      kind: "missing";
      label: "Nao verificado";
    };

export function evaluateMainFlowEligibility(
  game: Pick<
    CatalogGameRecord,
    | "mainFlowEligible"
    | "coopCampaignConfirmed"
    | "coopPlayerCountMin"
    | "coopPlayerCountMax"
    | "coopConfirmationSource"
    | "coopConfirmationCheckedAt"
  >
): MainFlowEligibility {
  if (!game.mainFlowEligible) {
    return { eligible: false, reason: "not-marked-main-flow" };
  }

  if (!game.coopCampaignConfirmed) {
    return { eligible: false, reason: "coop-not-confirmed" };
  }

  if (game.coopPlayerCountMin === null || game.coopPlayerCountMax === null) {
    return { eligible: false, reason: "two-player-range-missing" };
  }

  if (game.coopPlayerCountMin > 2 || game.coopPlayerCountMax < 2) {
    return { eligible: false, reason: "two-player-range-excluded" };
  }

  if (!game.coopConfirmationSource || !game.coopConfirmationCheckedAt) {
    return { eligible: false, reason: "confirmation-source-missing" };
  }

  return { eligible: true, reason: "confirmed-two-player-campaign" };
}

export function canEnterMainCatalogFlow(game: CatalogGameRecord): boolean {
  return evaluateMainFlowEligibility(game).eligible;
}

export function getSourceAttribution(game: CatalogGameRecord): SourceAttribution {
  return {
    label: "Dados e imagens: RAWG",
    href: game.sourceUrl || game.rawgUrl
  };
}

export function getFreshnessState(
  sourceUpdatedAt: Date | null,
  syncedAt: Date,
  now: Date = new Date()
): FreshnessState {
  const referenceDate = sourceUpdatedAt ?? syncedAt;
  const ageDays = Math.max(0, Math.floor((now.getTime() - referenceDate.getTime()) / DAY_MS));

  if (!referenceDate) {
    return {
      label: "Fonte sem data de atualizacao",
      tone: "unknown"
    };
  }

  if (ageDays === 0) {
    return {
      label: "Atualizado hoje",
      tone: "fresh"
    };
  }

  if (ageDays <= 30) {
    return {
      label: `Atualizado ha ${ageDays} dia${ageDays === 1 ? "" : "s"}`,
      tone: "fresh"
    };
  }

  return {
    label: `Verificado ha ${ageDays} dias`,
    tone: "stale"
  };
}

export function getEstimatedTimeState(
  estimate: CatalogTimeEstimateRecord | null,
  now: Date = new Date()
): EstimatedTimeState {
  if (!estimate?.minutes || estimate.minutes <= 0) {
    return {
      kind: "missing",
      label: "Sem fonte confiavel ainda"
    };
  }

  return {
    kind: "available",
    label: formatMinutes(estimate.minutes),
    sourceLabel: estimate.source,
    sourceUrl: estimate.sourceUrl,
    freshnessLabel: getFreshnessState(estimate.checkedAt, estimate.checkedAt, now).label
  };
}

export function getAvailabilityState(
  availability: CatalogAvailabilityRecord[],
  now: Date = new Date()
): AvailabilityState {
  const available = availability.find((item) => item.status === "available");

  if (!available) {
    return {
      kind: "missing",
      label: "Nao verificado"
    };
  }

  return {
    kind: "available",
    label: available.type === "game-pass" ? "Game Pass verificado" : "Gratis verificado",
    sourceLabel: available.source,
    sourceUrl: available.sourceUrl,
    freshnessLabel: getFreshnessState(available.checkedAt, available.checkedAt, now).label
  };
}

export function getCatalogDetailReadiness(game: CatalogGameDetailRecord): {
  hasCoreDetails: boolean;
  missing: string[];
} {
  const missing = [
    game.backgroundImageUrl ? null : "capa",
    game.description ? null : "descricao",
    game.releasedAt ? null : "lancamento",
    game.platforms.length > 0 ? null : "plataformas",
    game.genres.length > 0 ? null : "generos"
  ].filter((item): item is string => Boolean(item));

  return {
    hasCoreDetails: missing.length === 0,
    missing
  };
}

function formatMinutes(minutes: number): string {
  const hours = Math.round(minutes / 60);

  if (hours <= 1) {
    return "Cerca de 1 hora";
  }

  return `Cerca de ${hours} horas`;
}
