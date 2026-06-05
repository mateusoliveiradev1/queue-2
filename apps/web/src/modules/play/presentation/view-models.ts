import type {
  CurrentPlayGameRecord,
  CurrentPlayRecord
} from "../application/ports";

export type PlayingNowGameView = {
  libraryGameId: string;
  catalogGameId: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  role: "principal" | "secondary";
  roleLabel: string;
  position: number;
  sourceLabel: string;
  freshnessLabel: string;
  progress: {
    coopTimeLabel: string;
    subjectiveLabel: string;
    estimateLabel: string;
  };
};

export type PlayingNowViewModel = {
  games: PlayingNowGameView[];
  principal: PlayingNowGameView | null;
  secondaries: PlayingNowGameView[];
  activeCountLabel: string;
  empty: boolean;
};

export function toPlayingNowView(
  currentPlay: CurrentPlayRecord
): PlayingNowViewModel {
  const games = currentPlay.games.map(toPlayingNowGameView);
  const principal = games.find((game) => game.role === "principal") ?? null;
  const secondaries = games.filter((game) => game.role === "secondary");

  return {
    games,
    principal,
    secondaries,
    activeCountLabel: `${games.length}/${currentPlay.limit} em Jogando`,
    empty: games.length === 0
  };
}

function toPlayingNowGameView(game: CurrentPlayGameRecord): PlayingNowGameView {
  return {
    libraryGameId: game.libraryGameId,
    catalogGameId: game.catalogGameId,
    slug: game.catalogGame.slug,
    name: game.catalogGame.name,
    coverUrl: game.catalogGame.coverUrl,
    role: game.role,
    roleLabel: game.role === "principal" ? "Principal" : `Secundario ${game.position - 1}`,
    position: game.position,
    sourceLabel: `Fonte ${game.catalogGame.source}`,
    freshnessLabel: formatFreshness(game.catalogGame.sourceUpdatedAt ?? game.catalogGame.syncedAt),
    progress: {
      coopTimeLabel: formatCoopTime(game.progress.confirmedCoopSeconds),
      subjectiveLabel:
        game.progress.subjectivePercent === null
          ? "Percentual a definir"
          : `${game.progress.subjectivePercent}% combinado`,
      estimateLabel: game.catalogGame.hasReliableTimeEstimate
        ? "Tempo estimado com fonte"
        : "Tempo estimado sem fonte confiavel"
    }
  };
}

function formatCoopTime(seconds: number): string {
  if (seconds <= 0) {
    return "Sem sessoes confirmadas";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min confirmados`;
  }

  if (hours > 0) {
    return `${hours}h confirmadas`;
  }

  return `${minutes}min confirmados`;
}

function formatFreshness(date: Date): string {
  return `Atualizado em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)}`;
}
