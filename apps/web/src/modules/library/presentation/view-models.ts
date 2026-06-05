import {
  getLockedStatusLabel,
  JOGANDO_LIMIT,
  type FutureConfirmationStatus,
  type Phase2LibraryStatus
} from "../domain/library-policy";
import {
  formatPlatformLabel
} from "../domain/platforms";
import type {
  LibraryGameDetailRecord,
  LibraryOverviewRecord,
  LibraryQueueRecord
} from "../application/ports";

export type LibraryGameDetailView = {
  id: string;
  catalogGameId: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  status: string;
  platformLabels: string[];
  commonPlatformLabels: string[];
  match: {
    label: string;
    factors: string[];
    recommendedForMainFlow: boolean;
  };
  duoJourney: string;
};

export type LibraryOverviewView = {
  commonPlatformLabels: string[];
  groups: Record<Phase2LibraryStatus, LibraryGameDetailView[]>;
  counts: Record<Phase2LibraryStatus, number>;
  lockedStatuses: Array<{
    status: FutureConfirmationStatus;
    label: string;
  }>;
};

export type LibraryQueuePageView = {
  items: LibraryGameDetailView[];
  total: number;
  limit: 12 | 24;
  offset: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  resultLabel: string;
};

export type LibraryQueueViewModel = {
  commonPlatformLabels: string[];
  counts: Record<Phase2LibraryStatus, number>;
  archiveCount: number;
  archiveSummary: string | null;
  nextQueue: LibraryGameDetailView[];
  playing: LibraryGameDetailView[];
  playingLimitLabel: string;
  page: LibraryQueuePageView;
};

export function toLibraryOverviewView(
  overview: LibraryOverviewRecord
): LibraryOverviewView {
  const groups = {
    wishlist: overview.groups.wishlist.map(toLibraryGameDetailView),
    jogando: overview.groups.jogando.map(toLibraryGameDetailView),
    pausado: overview.groups.pausado.map(toLibraryGameDetailView)
  };

  return {
    commonPlatformLabels: overview.commonPlatforms.map(formatPlatformLabel),
    groups,
    counts: {
      wishlist: groups.wishlist.length,
      jogando: groups.jogando.length,
      pausado: groups.pausado.length
    },
    lockedStatuses: overview.lockedStatuses.map((status) => ({
      status,
      label: getLockedStatusLabel(status)
    }))
  };
}

export function toLibraryQueueView(queue: LibraryQueueRecord): LibraryQueueViewModel {
  return {
    commonPlatformLabels: queue.commonPlatforms.map(formatPlatformLabel),
    counts: queue.statusCounts,
    archiveCount: queue.archiveCount,
    archiveSummary:
      queue.archiveCount > 0
        ? `${queue.archiveCount} fora da fila ativa, guardados para uma acao explicita futura.`
        : null,
    nextQueue: queue.nextQueue.map(toLibraryGameDetailView),
    playing: queue.playing.map(toLibraryGameDetailView),
    playingLimitLabel: `Ate ${JOGANDO_LIMIT} ativos`,
    page: {
      items: queue.page.items.map(toLibraryGameDetailView),
      total: queue.page.total,
      limit: queue.page.limit,
      offset: queue.page.offset,
      currentPage: Math.floor(queue.page.offset / queue.page.limit) + 1,
      totalPages: Math.max(1, Math.ceil(queue.page.total / queue.page.limit)),
      hasNextPage: queue.page.hasNextPage,
      hasPreviousPage: queue.page.hasPreviousPage,
      resultLabel: formatResultLabel(queue.page.total)
    }
  };
}

export function toLibraryGameDetailView(
  detail: LibraryGameDetailRecord
): LibraryGameDetailView {
  return {
    id: detail.libraryGame.id,
    catalogGameId: detail.libraryGame.catalogGameId,
    slug: detail.catalogGame.slug,
    name: detail.catalogGame.name,
    coverUrl: detail.catalogGame.coverUrl,
    status: formatStatus(detail.libraryGame.status),
    platformLabels: detail.catalogGame.platforms.map(formatPlatformLabel),
    commonPlatformLabels: detail.matchScore.commonPlatforms.map(formatPlatformLabel),
    match: {
      label: detail.matchScore.label,
      factors: detail.matchScore.factors,
      recommendedForMainFlow: detail.matchScore.recommendedForMainFlow
    },
    duoJourney: getDuoJourneyText(detail.libraryGame.status)
  };
}

function formatStatus(status: string): string {
  switch (status) {
    case "wishlist":
      return "Wishlist";
    case "jogando":
      return "Jogando";
    case "pausado":
      return "Pausado";
    case "zerado":
      return "Zerado";
    case "dropado":
      return "Dropado";
    default:
      return status;
  }
}

function getDuoJourneyText(status: string): string {
  if (status === "jogando") {
    return "A jornada da dupla esta pronta para receber sessoes compartilhadas.";
  }

  if (status === "pausado") {
    return "Pausado sem culpa; a dupla pode retomar quando fizer sentido.";
  }

  return "Na fila da dupla, pronto para virar plano quando voces escolherem.";
}

function formatResultLabel(total: number): string {
  if (total === 0) {
    return "Nenhum jogo nesta visao";
  }

  if (total === 1) {
    return "1 jogo nesta visao";
  }

  return `${total} jogos nesta visao`;
}
