import {
  evaluateMainFlowEligibility,
  getAvailabilityState,
  getCatalogDescriptionState,
  getCatalogDetailReadiness,
  getEstimatedTimeState,
  getFreshnessState,
  getSourceAttribution
} from "../domain/catalog-policy";
import type {
  CatalogGameDetailRecord,
  CatalogPlatformRecord
} from "./ports";

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
  sourceBreakdown: CatalogSourceFreshnessRowView[];
  rawgUrl: string;
  coopLabel: string;
  timeEstimate: CatalogDetailFactView;
  availability: CatalogDetailFactView;
  detailReadiness: {
    hasCoreDetails: boolean;
    missingLabels: string[];
  };
};

export type CatalogSourceFreshnessRowView = {
  id: "rawg" | "description" | "time-estimate" | "availability";
  category: string;
  sourceLabel: string;
  sourceHref: string | null;
  statusLabel: string;
  freshnessTone: "fresh" | "stale" | "missing";
  dateTime: string | null;
  absoluteDateLabel: string | null;
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
  const description = getCatalogDescriptionState(game.localization, now);

  return {
    ...card,
    description: description.description,
    descriptionSourceLabel: description.sourceLabel,
    sourceBreakdown: buildSourceBreakdown(game, now),
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

function buildSourceBreakdown(
  game: CatalogGameDetailRecord,
  now: Date
): CatalogSourceFreshnessRowView[] {
  const rawg = getSourceAttribution(game);
  const rawgDate = game.sourceUpdatedAt ?? game.syncedAt;
  const rawgFreshness = getFreshnessState(game.sourceUpdatedAt, game.syncedAt, now);
  const description = getCatalogDescriptionState(game.localization, now);
  const timeEstimate = getEstimatedTimeState(game.timeEstimate, now);
  const availability = getAvailabilityState(game.availability, now);

  return [
    {
      id: "rawg",
      category: "Dados e imagens",
      sourceLabel: rawg.label,
      sourceHref: rawg.href,
      statusLabel: rawgFreshness.label,
      freshnessTone: toSourceFreshnessTone(rawgFreshness.tone),
      dateTime: rawgDate.toISOString(),
      absoluteDateLabel: formatAbsoluteDate(rawgDate)
    },
    description.kind === "published" && game.localization
      ? {
          id: "description",
          category: "Descricao em portugues",
          sourceLabel: description.sourceLabel,
          sourceHref: description.sourceUrl,
          statusLabel: description.freshnessLabel,
          freshnessTone: toSourceFreshnessTone(
            getFreshnessState(game.localization.publishedAt, game.localization.reviewedAt, now)
              .tone
          ),
          dateTime: game.localization.publishedAt.toISOString(),
          absoluteDateLabel: formatAbsoluteDate(game.localization.publishedAt)
        }
      : {
          id: "description",
          category: "Descricao em portugues",
          sourceLabel: description.sourceLabel,
          sourceHref: null,
          statusLabel: "Sem descricao revisada publicada",
          freshnessTone: "missing",
          dateTime: null,
          absoluteDateLabel: null
        },
    timeEstimate.kind === "available" && game.timeEstimate
      ? {
          id: "time-estimate",
          category: "Tempo estimado",
          sourceLabel: timeEstimate.sourceLabel,
          sourceHref: timeEstimate.sourceUrl,
          statusLabel: timeEstimate.freshnessLabel,
          freshnessTone: toSourceFreshnessTone(
            getFreshnessState(game.timeEstimate.checkedAt, game.timeEstimate.checkedAt, now)
              .tone
          ),
          dateTime: game.timeEstimate.checkedAt.toISOString(),
          absoluteDateLabel: formatAbsoluteDate(game.timeEstimate.checkedAt)
        }
      : {
          id: "time-estimate",
          category: "Tempo estimado",
          sourceLabel: timeEstimate.label,
          sourceHref: null,
          statusLabel: "Sem fonte ativa para exibir",
          freshnessTone: "missing",
          dateTime: null,
          absoluteDateLabel: null
        },
    availability.kind === "available"
      ? buildAvailabilityRow(game, availability, now)
      : {
          id: "availability",
          category: "Disponibilidade",
          sourceLabel: availability.label,
          sourceHref: null,
          statusLabel: "Sem fonte ativa para exibir",
          freshnessTone: "missing",
          dateTime: null,
          absoluteDateLabel: null
        }
  ];
}

function buildAvailabilityRow(
  game: CatalogGameDetailRecord,
  availability: Extract<ReturnType<typeof getAvailabilityState>, { kind: "available" }>,
  now: Date
): CatalogSourceFreshnessRowView {
  const available = game.availability.find((item) => item.status === "available");
  const checkedAt = available?.checkedAt ?? null;

  return {
    id: "availability",
    category: "Disponibilidade",
    sourceLabel: availability.sourceLabel,
    sourceHref: availability.sourceUrl,
    statusLabel: availability.freshnessLabel,
    freshnessTone: checkedAt
      ? toSourceFreshnessTone(getFreshnessState(checkedAt, checkedAt, now).tone)
      : "missing",
    dateTime: checkedAt?.toISOString() ?? null,
    absoluteDateLabel: checkedAt ? formatAbsoluteDate(checkedAt) : null
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

function formatAbsoluteDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function toSourceFreshnessTone(tone: "fresh" | "stale" | "unknown") {
  return tone === "unknown" ? "missing" : tone;
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
