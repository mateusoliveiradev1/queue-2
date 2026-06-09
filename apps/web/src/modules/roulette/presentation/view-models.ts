import { ROULETTE_PITY_THRESHOLD } from "../domain/roulette-policy";
import type {
  RouletteHistoryEventRecord,
  RouletteStateView
} from "../application/ports";

export const ROULETTE_ROUTE_COPY = {
  eyebrow: "Roleta da dupla",
  title: "A fila escolhe agora",
  helper:
    "A roleta usa Wishlist e Pausado. O resultado e guardado antes da revelacao.",
  blocked: {
    title: "A roleta precisa de tres jogos",
    body:
      "Coloquem pelo menos tres jogos em Wishlist ou Pausado. Depois a fila escolhe com peso real, nao com surpresa vazia.",
    ctas: {
      biblioteca: "Abrir Biblioteca",
      descobrir: "Descobrir jogos",
      catalogo: "Buscar no Catalogo"
    }
  },
  controls: {
    start: "Sortear da fila",
    boost: "Usar boost - 100 saldo",
    boostUnavailable: "Boost indisponivel agora",
    pity: "Garantia epica se aproxima",
    persisted: "Resultado guardado. Revelando para a dupla.",
    replay: "Rever giro salvo",
    replayDisclaimer: "Replay nao e novo sorteio."
  },
  result: {
    invitation: "A fila apontou para este. Voces travam como Principal?",
    lock: "Travar como Principal"
  },
  history: {
    heading: "Historico da roleta",
    empty: "Os sorteios aparecem aqui depois da primeira rodada."
  },
  audio: {
    on: "Som da roleta ligado",
    off: "Som da roleta desligado"
  }
} as const;

export type RouletteFirstViewportState =
  | "blocked-pool"
  | "ready"
  | "resumable-reveal"
  | "pending-invitation"
  | "history-backed-empty";

export type RouletteRouteViewModel = {
  audio: {
    audioEnabled: boolean;
    defaultEnabledFromDuoPreference: boolean;
    label: string;
  };
  blockedPool: {
    body: string;
    ctas: Array<{
      href: string;
      label: string;
    }>;
    eligibleCount: number;
    requiredEligibleCount: number;
    title: string;
  } | null;
  boost: {
    balanceLabel: string;
    canUseBoost: boolean;
    controlLabel: string;
    unavailableLabel: string;
  };
  copy: typeof ROULETTE_ROUTE_COPY;
  firstViewport: {
    helper: string;
    state: RouletteFirstViewportState;
    statusLabel: string;
  };
  history: {
    emptyLabel: string;
    heading: string;
    items: RouletteHistoryItemViewModel[];
  };
  pity: {
    compactLabel: string;
    progressLabel: string;
  };
  round: {
    id: string;
    resultLabel: string;
    status: string;
  } | null;
};

export type RouletteHistoryItemViewModel = {
  id: string;
  eventLabel: string;
  occurredAtLabel: string;
  roundId: string | null;
  summaryLabel: string;
};

export function toRouletteRouteViewModel(input: {
  history: RouletteHistoryEventRecord[];
  state: RouletteStateView;
}): RouletteRouteViewModel {
  const firstViewportState = getFirstViewportState(input.state, input.history);
  const blockedPool = input.state.blockedPool
    ? {
        body: ROULETTE_ROUTE_COPY.blocked.body,
        ctas: [
          {
            href: "/app/biblioteca",
            label: ROULETTE_ROUTE_COPY.blocked.ctas.biblioteca
          },
          {
            href: "/app/descobrir",
            label: ROULETTE_ROUTE_COPY.blocked.ctas.descobrir
          },
          {
            href: "/app/catalogo",
            label: ROULETTE_ROUTE_COPY.blocked.ctas.catalogo
          }
        ],
        eligibleCount: input.state.blockedPool.eligibleCount,
        requiredEligibleCount: input.state.blockedPool.requiredEligibleCount,
        title: ROULETTE_ROUTE_COPY.blocked.title
      }
    : null;

  return {
    audio: {
      audioEnabled: input.state.audioEnabled,
      defaultEnabledFromDuoPreference: input.state.audioEnabled,
      label: input.state.audioEnabled
        ? ROULETTE_ROUTE_COPY.audio.on
        : ROULETTE_ROUTE_COPY.audio.off
    },
    blockedPool,
    boost: {
      balanceLabel: `${formatNumber(input.state.boost.balance)} saldo`,
      canUseBoost: input.state.boost.canUseBoost,
      controlLabel: ROULETTE_ROUTE_COPY.controls.boost,
      unavailableLabel: ROULETTE_ROUTE_COPY.controls.boostUnavailable
    },
    copy: ROULETTE_ROUTE_COPY,
    firstViewport: {
      helper: ROULETTE_ROUTE_COPY.helper,
      state: firstViewportState,
      statusLabel: getStatusLabel(firstViewportState)
    },
    history: {
      emptyLabel: ROULETTE_ROUTE_COPY.history.empty,
      heading: ROULETTE_ROUTE_COPY.history.heading,
      items: input.history.map(toHistoryItemViewModel)
    },
    pity: {
      compactLabel: ROULETTE_ROUTE_COPY.controls.pity,
      progressLabel: `${Math.min(
        input.state.pity.drawsSinceEpicOrHigher,
        ROULETTE_PITY_THRESHOLD
      )}/${ROULETTE_PITY_THRESHOLD}`
    },
    round: input.state.round
      ? {
          id: input.state.round.id,
          resultLabel: input.state.round.resultRarity,
          status: input.state.round.status
        }
      : null
  };
}

function getFirstViewportState(
  state: RouletteStateView,
  history: RouletteHistoryEventRecord[]
): RouletteFirstViewportState {
  if (state.state === "blocked-pool") {
    return "blocked-pool";
  }

  if (state.state === "pending_invitation") {
    return "pending-invitation";
  }

  if (state.state === "active" || state.state === "revealing") {
    return "resumable-reveal";
  }

  if (state.eligibleGames.length === 0 && history.length > 0) {
    return "history-backed-empty";
  }

  return "ready";
}

function getStatusLabel(state: RouletteFirstViewportState): string {
  switch (state) {
    case "blocked-pool":
      return ROULETTE_ROUTE_COPY.blocked.title;
    case "pending-invitation":
      return ROULETTE_ROUTE_COPY.result.invitation;
    case "resumable-reveal":
      return ROULETTE_ROUTE_COPY.controls.persisted;
    case "history-backed-empty":
      return "A roleta esta sem rodada ativa, mas o historico segue guardado.";
    case "ready":
      return ROULETTE_ROUTE_COPY.helper;
  }
}

function toHistoryItemViewModel(
  item: RouletteHistoryEventRecord
): RouletteHistoryItemViewModel {
  return {
    eventLabel: eventLabels[item.eventType] ?? "Evento da roleta",
    id: item.id,
    occurredAtLabel: formatDateTime(item.createdAt),
    roundId: item.roundId,
    summaryLabel: buildHistorySummary(item)
  };
}

function buildHistorySummary(item: RouletteHistoryEventRecord): string {
  const boostSpent = item.metadata.boostSpent === true ? "boost usado" : "sem boost";
  const pityBefore =
    typeof item.metadata.pityBefore === "number"
      ? `pity ${item.metadata.pityBefore}`
      : "pity registrado";

  return `${boostSpent}; ${pityBefore}`;
}

const eventLabels: Partial<Record<RouletteHistoryEventRecord["eventType"], string>> = {
  "boost-refunded": "Boost devolvido antes da rodada",
  "boost-spent": "Boost registrado",
  discarded: "Resultado descartado",
  locked: "Virou Principal",
  refunded: "Ajuste registrado",
  replayed: "Replay visto",
  revealed: "Resultado guardado",
  started: "Rodada iniciada"
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
