import {
  DISCOVERY_LIBRARY_HANDOFF_STATUSES,
  getDiscoveryLibraryHandoffPolicy
} from "../domain/discovery-policy";
import type {
  DiscoveryCardBuildInput,
  DiscoveryCatalogRecommendationFact,
  DiscoveryDeckCard,
  DiscoveryDeckBuildResult,
  DiscoveryReadState
} from "./ports";
import type {
  DiscoveryAvailabilityFact,
  DiscoveryPlatformKey
} from "../domain/recommendation-policy";

const platformLabelToKey: Record<string, DiscoveryPlatformKey> = {
  PC: "pc",
  PlayStation: "playstation",
  Xbox: "xbox",
  Switch: "switch",
  "Steam Deck": "steam-deck"
};

export function buildDiscoveryDeckCards(input: {
  cards: DiscoveryCardBuildInput[];
}): Pick<DiscoveryDeckBuildResult, "cards" | "recommendations"> {
  return {
    cards: input.cards.map((card) => toDiscoveryDeckCardView(card)),
    recommendations: input.cards
      .map((card) => card.recommendation)
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  };
}

export function toDiscoveryDeckCardView(input: DiscoveryCardBuildInput): DiscoveryDeckCard {
  const state = input.readState.games.find(
    (game) => game.catalogGameId === input.card.id
  );
  const libraryStatus = state?.libraryStatus ?? null;
  const allowedLibraryActions = DISCOVERY_LIBRARY_HANDOFF_STATUSES.filter((status) => {
    const policy = getDiscoveryLibraryHandoffPolicy(status);
    return policy.ok && status !== libraryStatus;
  });

  return {
    catalogGameId: input.card.id,
    slug: input.card.slug,
    title: input.card.name,
    coverUrl: input.card.coverUrl,
    releaseLabel: input.card.releaseLabel,
    platformLabels: input.card.platformLabels,
    genreLabels: input.card.genreLabels,
    sourceMeta: input.card.sourceMeta,
    timeEstimateLabel: input.card.timeEstimateLabel,
    availabilityLabel: input.card.availabilityLabel,
    reasons: input.recommendation?.reasons ?? compactFallbackReasons(input.card),
    libraryStatus,
    libraryActionState: getLibraryActionState(libraryStatus),
    allowedLibraryActions
  };
}

export function toRecommendationFacts(input: {
  cards: Array<{
    id: string;
    name: string;
    mainFlow: { eligible: boolean };
    platformLabels: string[];
    genreLabels: string[];
    timeEstimateLabel: string;
    availabilityLabel: string;
  }>;
}): DiscoveryCatalogRecommendationFact[] {
  return input.cards.map((card) => ({
    catalogGameId: card.id,
    title: card.name,
    mainFlowEligible: card.mainFlow.eligible,
    coopCampaignConfirmed: card.mainFlow.eligible,
    platforms: card.platformLabels
      .map((label) => platformLabelToKey[label])
      .filter((platform): platform is DiscoveryPlatformKey => Boolean(platform)),
    estimatedMinutes: parseEstimatedMinutes(card.timeEstimateLabel),
    availability: parseAvailability(card.availabilityLabel),
    coopTypes: ["campaign"],
    moodTags: [],
    releaseYear: null,
    genres: card.genreLabels.map((genre) => genre.toLowerCase()),
    tags: card.genreLabels.map((genre) => genre.toLowerCase()),
    rarity: "common"
  }));
}

export function getReadableGameState(
  readState: DiscoveryReadState,
  catalogGameId: string
) {
  return readState.games.find((game) => game.catalogGameId === catalogGameId) ?? null;
}

function getLibraryActionState(
  status: DiscoveryDeckCard["libraryStatus"]
): DiscoveryDeckCard["libraryActionState"] {
  if (!status) {
    return "can-add";
  }

  if (status === "zerado" || status === "dropado") {
    return "blocked-by-future-confirmation";
  }

  return "can-move";
}

function compactFallbackReasons(card: {
  mainFlow: { eligible: boolean };
  platformLabels: string[];
  timeEstimateLabel: string;
  availabilityLabel: string;
}): string[] {
  return [
    card.mainFlow.eligible ? "campanha 2p" : null,
    card.platformLabels[0] ? `${card.platformLabels[0]} disponivel` : null,
    card.timeEstimateLabel !== "Sem fonte confiavel ainda" ? card.timeEstimateLabel : null,
    card.availabilityLabel !== "Nao verificado" ? card.availabilityLabel : null
  ].filter((reason): reason is string => Boolean(reason)).slice(0, 5);
}

function parseEstimatedMinutes(label: string): number | null {
  const match = label.match(/(\d+)/);
  if (!match?.[1]) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  return Number.isFinite(hours) ? hours * 60 : null;
}

function parseAvailability(label: string): DiscoveryAvailabilityFact[] {
  if (label === "Game Pass verificado") {
    return [
      {
        type: "game-pass",
        platformKey: null,
        status: "available"
      }
    ];
  }

  if (label === "Gratis verificado") {
    return [
      {
        type: "free",
        platformKey: null,
        status: "available"
      }
    ];
  }

  return [];
}
