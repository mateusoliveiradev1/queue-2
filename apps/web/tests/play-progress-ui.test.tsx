import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CatalogDetailFactView } from "../src/modules/catalog/application/view-models";
import type {
  GamePlayDetailRecord,
  PlayChapterRecord,
  PlayProgressRecord,
  PlaySessionDetailRecord,
  PlaySessionRecord,
  PlayTerminalRequestRecord
} from "../src/modules/play/application/ports";
import { ChapterList } from "../src/modules/play/presentation/chapter-list";
import { JogamosHojeForm } from "../src/modules/play/presentation/jogamos-hoje-form";
import { LiveSessionPanel } from "../src/modules/play/presentation/live-session-panel";
import { ProgressPanel } from "../src/modules/play/presentation/progress-panel";
import { TerminalStatusPanel } from "../src/modules/play/presentation/terminal-status-panel";

afterEach(() => {
  cleanup();
});

describe("Phase 04.3 play progress UI", () => {
  it("renders confirmed coop time, estimate attribution and subjective percent input", () => {
    const { container } = render(
      <ProgressPanel
        action={vi.fn(async () => undefined)}
        catalogGameId="game-1"
        gameSlug="it-takes-two"
        playDetail={gamePlayDetailRecord({
          progress: playProgressRecord({
            confirmedCoopSeconds: 5_400,
            subjectivePercent: 35
          })
        })}
        timeEstimate={timeEstimateView()}
      />
    );

    expect(screen.getByRole("heading", { name: /tempo coop/i })).toBeInTheDocument();
    expect(screen.getByText("1h 30min confirmados")).toBeInTheDocument();
    expect(screen.getByText("Cerca de 14 horas")).toBeInTheDocument();
    expect(screen.getByText("RAWG / Atualizado hoje")).toBeInTheDocument();
    expect(screen.getByLabelText(/percentual combinado/i)).toHaveValue(35);
    expect(hiddenValues(container, "catalogGameId")).toEqual(["game-1"]);
    expect(hiddenValues(container, "gameSlug")).toEqual(["it-takes-two"]);
  });

  it("renders chapter creation and idempotent completion controls", () => {
    const { container } = render(
      <ChapterList
        catalogGameId="game-1"
        createAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        playDetail={gamePlayDetailRecord({
          chapters: [
            chapterRecord({
              id: "chapter-1",
              title: "Ato 1 completo",
              completedAt: new Date("2026-06-05T20:00:00.000Z"),
              completedByUserId: "member-1"
            }),
            chapterRecord({
              id: "chapter-2",
              title: "Chefao opcional",
              position: 2
            })
          ]
        })}
        toggleAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: /capitulos/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/novo capitulo/i)).toHaveAttribute("maxLength", "120");
    expect(screen.getByRole("button", { name: /criar capitulo/i })).toBeInTheDocument();
    expect(screen.getByText("Ato 1 completo")).toBeInTheDocument();
    expect(screen.getByText("Chefao opcional")).toBeInTheDocument();
    expect(screen.getByText("Concluido pela dupla")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reabrir/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /concluir/i })).toBeInTheDocument();
    expect(hiddenValues(container, "chapterId")).toEqual(["chapter-1", "chapter-2"]);
    expect(hiddenValues(container, "completed")).toEqual(["false", "true"]);
  });

  it("keeps Jogamos Hoje fast presets plus bounded manual duration", () => {
    render(
      <JogamosHojeForm
        action={vi.fn(async () => undefined)}
        catalogGameId="game-1"
        gameSlug="it-takes-two"
      />
    );

    expect(screen.getByRole("heading", { name: /jogamos hoje/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 min" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2h" })).toBeInTheDocument();
    expect(screen.getByLabelText(/mais tempo/i)).toHaveAttribute("min", "5");
    expect(screen.getByLabelText(/mais tempo/i)).toHaveAttribute("max", "720");
  });

  it("renders live-session active and pending confirmation states from server records", () => {
    render(
      <LiveSessionPanel
        catalogGameId="game-1"
        confirmAction={vi.fn(async () => undefined)}
        detail={gamePlayDetailRecord({
          activeLiveSession: sessionRecord({
            id: "live-1",
            startedAt: new Date("2026-06-05T18:00:00.000Z")
          }),
          pendingSessions: [
            sessionDetailRecord({
              id: "pending-1",
              durationSeconds: 3_600,
              pendingUserIds: ["member-2"]
            })
          ]
        })}
        endAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        startAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: /sessao ao vivo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encerrar e pedir confirmacao/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /confirmacoes pendentes/i })).toBeInTheDocument();
    expect(screen.getByText(/1h aguardando 1 confirmacao/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar sessao/i })).toBeInTheDocument();
  });

  it("renders terminal request confirmation controls and hides new requests while pending", () => {
    const { container } = render(
      <TerminalStatusPanel
        cancelAction={vi.fn(async () => undefined)}
        catalogGameId="game-1"
        confirmAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        playDetail={gamePlayDetailRecord({
          terminalRequest: terminalRequestRecord({
            id: "terminal-1",
            targetStatus: "zerado"
          })
        })}
        requestAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: /zerado ou dropado/i })).toBeInTheDocument();
    expect(screen.getByText(/pedido pendente: zerado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar com a dupla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar pedido/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pedir zerado/i })).not.toBeInTheDocument();
    expect(hiddenValues(container, "requestId")).toEqual(["terminal-1", "terminal-1"]);
  });
});

function hiddenValues(container: HTMLElement, name: string): string[] {
  return Array.from(container.querySelectorAll<HTMLInputElement>(`input[name='${name}']`)).map(
    (input) => input.value
  );
}

function timeEstimateView(): CatalogDetailFactView {
  return {
    kind: "available",
    label: "Cerca de 14 horas",
    sourceLabel: "RAWG",
    sourceHref: "https://rawg.io/games/it-takes-two",
    freshnessLabel: "Atualizado hoje"
  };
}

function gamePlayDetailRecord(
  overrides: Partial<GamePlayDetailRecord> = {}
): GamePlayDetailRecord {
  return {
    duoId: "duo-1",
    duoTimezone: "America/Sao_Paulo",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    libraryStatus: "jogando",
    activeGame: {
      id: "active-1",
      duoId: "duo-1",
      libraryGameId: "library-1",
      catalogGameId: "game-1",
      role: "principal",
      position: 1,
      updatedAt: new Date("2026-06-05T12:00:00.000Z")
    },
    activeLiveSession: null,
    pendingSessions: [],
    progress: playProgressRecord(),
    chapters: [],
    terminalRequest: null,
    scheduledSessions: [],
    ...overrides
  };
}

function playProgressRecord(
  overrides: Partial<PlayProgressRecord> = {}
): PlayProgressRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    confirmedCoopSeconds: 0,
    subjectivePercent: null,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function chapterRecord(overrides: Partial<PlayChapterRecord> = {}): PlayChapterRecord {
  return {
    id: "chapter-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    title: "Ato 1 completo",
    position: 1,
    completedAt: null,
    completedByUserId: null,
    createdByUserId: "member-1",
    updatedByUserId: "member-1",
    createdAt: new Date("2026-06-05T12:00:00.000Z"),
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}

function sessionRecord(overrides: Partial<PlaySessionRecord> = {}): PlaySessionRecord {
  return {
    id: "session-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    kind: "live",
    status: "active",
    startedAt: new Date("2026-06-05T12:00:00.000Z"),
    endedAt: null,
    durationSeconds: null,
    createdByUserId: "member-1",
    ...overrides
  };
}

function sessionDetailRecord(
  overrides: Partial<PlaySessionDetailRecord> = {}
): PlaySessionDetailRecord {
  return {
    ...sessionRecord(overrides),
    status: "pending_confirmation",
    confirmedByUserIds: ["member-1"],
    pendingUserIds: ["member-2"],
    confirmationCount: 1,
    requiredConfirmationCount: 2,
    doubleConfirmed: false,
    ...overrides
  };
}

function terminalRequestRecord(
  overrides: Partial<PlayTerminalRequestRecord> = {}
): PlayTerminalRequestRecord {
  return {
    id: "terminal-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    targetStatus: "zerado",
    status: "pending",
    requestedByUserId: "member-1",
    confirmedByUserId: null,
    cancelledByUserId: null,
    updatedAt: new Date("2026-06-05T12:00:00.000Z"),
    ...overrides
  };
}
