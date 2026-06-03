import {
  evaluateMainFlowEligibility,
  getAvailabilityState,
  getCatalogDetailReadiness,
  getEstimatedTimeState,
  getFreshnessState,
  getSourceAttribution
} from "../domain/catalog-policy";
import type {
  CatalogGameDetailRecord,
  CatalogPlatformRecord
} from "../application/ports";
import { getPortugueseCatalogDescription } from "./localized-descriptions";

export type CatalogSourceMetaView = {
  attributionLabel: string;
  attributionHref: string;
  freshnessLabel: string;
  freshnessTone: "fresh" | "stale" | "unknown";
};

export type CatalogGameCardView = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  releaseLabel: string;
  platformLabels: string[];
  genreLabels: string[];
  sourceMeta: CatalogSourceMetaView;
  mainFlow: {
    eligible: boolean;
    label: string;
  };
  timeEstimateLabel: string;
  availabilityLabel: string;
};

export type CatalogGameDetailView = CatalogGameCardView & {
  description: string;
  descriptionSourceLabel: string;
  rawgUrl: string;
  coopLabel: string;
  timeEstimate: CatalogDetailFactView;
  availability: CatalogDetailFactView;
  detailReadiness: {
    hasCoreDetails: boolean;
    missingLabels: string[];
  };
};

export type CatalogDetailFactView =
  | {
      kind: "available";
      label: string;
      sourceLabel: string;
      sourceHref: string | null;
      freshnessLabel: string;
    }
  | {
      kind: "missing";
      label: string;
    };

export function toCatalogGameCardView(
  game: CatalogGameDetailRecord,
  now: Date = new Date()
): CatalogGameCardView {
  const source = getSourceAttribution(game);
  const freshness = getFreshnessState(game.sourceUpdatedAt, game.syncedAt, now);
  const eligibility = evaluateMainFlowEligibility(game);
  const time = getEstimatedTimeState(game.timeEstimate, now);
  const availability = getAvailabilityState(game.availability, now);

  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    coverUrl: game.backgroundImageUrl,
    releaseLabel: formatRelease(game.releasedAt),
    platformLabels: formatPlatforms(game.platforms),
    genreLabels: game.genres.map((genre) => genre.name),
    sourceMeta: {
      attributionLabel: source.label,
      attributionHref: source.href,
      freshnessLabel: freshness.label,
      freshnessTone: freshness.tone
    },
    mainFlow: {
      eligible: eligibility.eligible,
      label: eligibility.eligible ? "Coop campanha 2p confirmado" : "Fora do fluxo principal"
    },
    timeEstimateLabel: time.label,
    availabilityLabel: availability.label
  };
}

export function toCatalogGameDetailView(
  game: CatalogGameDetailRecord,
  now: Date = new Date()
): CatalogGameDetailView {
  const readiness = getCatalogDetailReadiness(game);
  const card = toCatalogGameCardView(game, now);
  const timeEstimate = getEstimatedTimeState(game.timeEstimate, now);
  const availability = getAvailabilityState(game.availability, now);
  const localizedDescription = getPortugueseCatalogDescription(game.slug);

  return {
    ...card,
    description:
      localizedDescription ?? game.description ?? "Descricao ainda indisponivel na fonte.",
    descriptionSourceLabel: localizedDescription
      ? "Descricao curada: QUEUE/2"
      : game.description
        ? "Descricao da fonte: RAWG"
        : "Descricao indisponivel",
    rawgUrl: game.rawgUrl,
    coopLabel: card.mainFlow.eligible
      ? "Confirmado para campanha ou historia coop em dupla."
      : "Ainda sem confirmacao segura para a fila principal.",
    timeEstimate: toDetailFact(timeEstimate),
    availability: toDetailFact(availability),
    detailReadiness: {
      hasCoreDetails: readiness.hasCoreDetails,
      missingLabels: readiness.missing
    }
  };
}

function toDetailFact(
  state: ReturnType<typeof getEstimatedTimeState> | ReturnType<typeof getAvailabilityState>
): CatalogDetailFactView {
  if (state.kind === "missing") {
    return {
      kind: "missing",
      label: state.label
    };
  }

  return {
    kind: "available",
    label: state.label,
    sourceLabel: state.sourceLabel,
    sourceHref: state.sourceUrl,
    freshnessLabel: state.freshnessLabel
  };
}

function formatRelease(releasedAt: Date | null): string {
  if (!releasedAt) {
    return "Lancamento nao informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC"
  }).format(releasedAt);
}

function formatPlatforms(platforms: CatalogPlatformRecord[]): string[] {
  const labels: Record<CatalogPlatformRecord["key"], string> = {
    pc: "PC",
    playstation: "PlayStation",
    xbox: "Xbox",
    switch: "Switch",
    "steam-deck": "Steam Deck"
  };

  return platforms.map((platform) => labels[platform.key]);
}
