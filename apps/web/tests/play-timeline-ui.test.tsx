import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  GameTimelineRecord,
  PlayChapterRecord,
  PlayMomentoRecord,
  PlaySessionDetailRecord
} from "../src/modules/play/application/ports";
import { Timeline } from "../src/modules/play/presentation/timeline";

afterEach(() => {
  cleanup();
});

describe("Phase 04.4 timeline UI", () => {
  it("renders chronological sessions, chapters, milestones and visible Momentos", () => {
    render(
      <Timeline
        catalogGameId="game-1"
        createMomentoAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        revealSpoilerAction={vi.fn(async () => undefined)}
        timeline={timelineRecord()}
      />
    );

    expect(screen.getByRole("heading", { name: /linha do tempo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar momento/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /associar a sessao/i })).toBeInTheDocument();
    expect(screen.getByText("Sessao ao vivo confirmada")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("Capitulo concluido")).toBeInTheDocument();
    expect(screen.getByText("Ato 1 completo")).toBeInTheDocument();
    expect(screen.getByText("Primeira sessao")).toBeInTheDocument();
    expect(screen.getByText("Virada memoravel")).toBeInTheDocument();
  });

  it("does not render hidden spoiler text before local reveal", () => {
    render(
      <Timeline
        catalogGameId="game-1"
        createMomentoAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        revealSpoilerAction={vi.fn(async () => undefined)}
        timeline={timelineRecord({
          events: [
            {
              id: "momento:spoiler-1",
              occurredAt: new Date("2026-06-05T21:00:00.000Z"),
              type: "momento",
              momento: momentoRecord({
                id: "spoiler-1",
                body: "O chefe final aparece na cozinha",
                isSpoiler: true,
                revealedForViewer: false
              })
            }
          ]
        })}
      />
    );

    expect(screen.getByText(/momento com spoiler oculto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revelar spoiler/i })).toBeInTheDocument();
    expect(screen.queryByText(/chefe final/i)).not.toBeInTheDocument();
  });

  it("renders an empty state that points back to Phase 4 actions", () => {
    render(
      <Timeline
        catalogGameId="game-1"
        createMomentoAction={vi.fn(async () => undefined)}
        gameSlug="it-takes-two"
        revealSpoilerAction={vi.fn(async () => undefined)}
        timeline={timelineRecord({ events: [] })}
      />
    );

    expect(screen.getByText(/iniciem uma sessao/i)).toBeInTheDocument();
    expect(screen.queryByText(/hall da moral/i)).not.toBeInTheDocument();
  });
});

function timelineRecord(overrides: Partial<GameTimelineRecord> = {}): GameTimelineRecord {
  return {
    duoId: "duo-1",
    libraryGameId: "library-1",
    catalogGameId: "game-1",
    events: [
      {
        id: "session:session-1",
        occurredAt: new Date("2026-06-05T20:00:00.000Z"),
        type: "session",
        session: sessionRecord()
      },
      {
        id: "milestone:session-1:first-session",
        occurredAt: new Date("2026-06-05T20:00:00.000Z"),
        type: "milestone",
        milestone: {
          id: "session-1:first-session",
          kind: "first-session",
          label: "Primeira sessao",
          description: "A jornada da dupla comecou neste jogo.",
          occurredAt: new Date("2026-06-05T20:00:00.000Z")
        }
      },
      {
        id: "chapter:chapter-1",
        occurredAt: new Date("2026-06-05T20:30:00.000Z"),
        type: "chapter",
        chapter: chapterRecord()
      },
      {
        id: "momento:momento-1",
        occurredAt: new Date("2026-06-05T21:00:00.000Z"),
        type: "momento",
        momento: momentoRecord()
      }
    ],
    ...overrides
  };
}

function sessionRecord(
  overrides: Partial<PlaySessionDetailRecord> = {}
): PlaySessionDetailRecord {
  return {
    id: "session-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    kind: "live",
    status: "confirmed",
    startedAt: new Date("2026-06-05T19:00:00.000Z"),
    endedAt: new Date("2026-06-05T20:00:00.000Z"),
    durationSeconds: 3_600,
    createdByUserId: "member-1",
    confirmedByUserIds: ["member-1", "member-2"],
    pendingUserIds: [],
    confirmationCount: 2,
    requiredConfirmationCount: 2,
    doubleConfirmed: true,
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
    completedAt: new Date("2026-06-05T20:30:00.000Z"),
    completedByUserId: "member-1",
    createdByUserId: "member-1",
    updatedByUserId: "member-1",
    createdAt: new Date("2026-06-05T18:00:00.000Z"),
    updatedAt: new Date("2026-06-05T20:30:00.000Z"),
    ...overrides
  };
}

function momentoRecord(overrides: Partial<PlayMomentoRecord> = {}): PlayMomentoRecord {
  return {
    id: "momento-1",
    duoId: "duo-1",
    libraryGameId: "library-1",
    sessionId: null,
    authorUserId: "member-1",
    body: "Virada memoravel",
    isSpoiler: false,
    revealedForViewer: true,
    createdAt: new Date("2026-06-05T21:00:00.000Z"),
    updatedAt: new Date("2026-06-05T21:00:00.000Z"),
    ...overrides
  };
}
