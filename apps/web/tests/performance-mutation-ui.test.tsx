import { readFileSync } from "node:fs";
import { useState, type FormEvent } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ActionFeedback,
  ActionFeedbackButton,
  getActionFeedbackCopy,
  type ActionFeedbackState
} from "../src/components/action-feedback";
import { CatalogWishlistSubmitButton } from "../src/modules/catalog/presentation/catalog-wishlist-submit-button";
import { DiscoveryCard } from "../src/modules/discovery/presentation/discovery-card";
import { LivePanel } from "../src/modules/discovery/presentation/live-panel";
import { MatchCelebration } from "../src/modules/discovery/presentation/match-celebration";
import { MoodQuiz } from "../src/modules/discovery/presentation/mood-quiz";
import { LibraryStatusControls } from "../src/modules/library/presentation/library-status-controls";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

const navigationMock = vi.hoisted(() => ({
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();

  return {
    ...actual,
    useRouter: () => navigationMock
  };
});

afterEach(() => {
  cleanup();
  navigationMock.refresh.mockClear();
});

describe("action feedback primitives", () => {
  it("shows local syncing feedback before the server action resolves", async () => {
    const deferred = createDeferred();
    const action = vi.fn(() => deferred.promise);

    render(<FeedbackActionHarness action={action} />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar a wishlist/i }));

    expect(action).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      /salvo aqui, sincronizando/i
    );
    expect(
      screen.getByRole("button", { name: /sincronizando com a fila/i })
    ).toBeDisabled();
    expect(screen.queryByText(/confirmado pela fila/i)).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getByRole("status")).toHaveTextContent(/confirmado pela fila/i);
  });

  it("keeps failure feedback visible with retry copy", async () => {
    const action = vi.fn(async () => {
      throw new Error("server unavailable");
    });

    render(<FeedbackActionHarness action={action} />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar a wishlist/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /nao sincronizou\. tente de novo/i
    );
    expect(screen.getByRole("button", { name: /tentar de novo/i })).not.toBeDisabled();
    expect(screen.queryByText(/confirmado pela fila/i)).not.toBeInTheDocument();
  });

  it("announces only non-idle states while preserving the local slot", () => {
    const { container, rerender } = render(<ActionFeedback state="idle" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector(".action-feedback")).toHaveAttribute(
      "data-state",
      "idle"
    );
    expect(container.querySelector(".action-feedback__mark")).toHaveTextContent("/2");

    rerender(<ActionFeedback state="retrying" />);

    expect(screen.getByRole("status")).toHaveTextContent(/tentando de novo/i);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    rerender(<ActionFeedback state="failed" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "assertive");
  });

  it("keeps syncing copy honest until the server result is known", () => {
    expect(getActionFeedbackCopy("syncing")).toMatch(/sincronizando/i);
    expect(getActionFeedbackCopy("syncing")).not.toMatch(
      /confirmado|concluido|sucesso/i
    );
    expect(getActionFeedbackCopy("confirmed")).toMatch(/confirmado/i);
    expect(getActionFeedbackCopy("failed")).toMatch(/tente de novo/i);
  });

  it("maps button state to stable labels, busy state and retry availability", () => {
    const labels = {
      idle: "Adicionar a Wishlist",
      syncing: "Sincronizando com a fila",
      confirmed: "Confirmado",
      failed: "Tentar de novo",
      retrying: "Tentando de novo"
    };
    const { rerender } = render(
      <ActionFeedbackButton labels={labels} state="idle" />
    );

    expect(screen.getByRole("button", { name: /adicionar a wishlist/i })).toHaveAttribute(
      "aria-busy",
      "false"
    );

    rerender(<ActionFeedbackButton labels={labels} state="syncing" />);

    expect(
      screen.getByRole("button", { name: /sincronizando com a fila/i })
    ).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("data-action-state", "syncing");

    rerender(<ActionFeedbackButton labels={labels} state="failed" />);

    expect(screen.getByRole("button", { name: /tentar de novo/i })).not.toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("data-action-state", "failed");
  });

  it("has stable dimensions and reduced-motion CSS for action-local feedback", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const reducedMotionBlock = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)")
    );

    expect(css).toContain(".action-feedback-button");
    expect(css).toContain("grid-template-columns: 1.8rem minmax(0, 1fr)");
    expect(css).toContain("min-height: 48px");
    expect(css).toContain("min-width: 168px");
    expect(css).toContain(".action-feedback");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("queue2-feedback-pulse");
    expect(reducedMotionBlock).toContain(
      '.action-feedback-button[data-action-state="syncing"]'
    );
    expect(reducedMotionBlock).toContain(
      '.action-feedback-button[data-action-state="retrying"]'
    );
    expect(reducedMotionBlock).toContain("animation: none");
  });
});

describe("enhanced catalog and library mutation forms", () => {
  it("enhances Wishlist submit while preserving native fallback inputs", async () => {
    const deferred = createDeferred();
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => {
      await deferred.promise;
      return { ok: true };
    });
    const { container } = render(
      <CatalogWishlistSubmitButton
        action={fallbackAction}
        catalogGameId="game-1"
        enhancedAction={enhancedAction}
        returnTo="/app/catalogo"
      />
    );

    const button = screen.getByRole("button", { name: /adicionar a wishlist/i });
    const form = button.closest("form");

    expect(form).toHaveAttribute("action");
    expect(form?.querySelector("input[name='catalogGameId']")).toHaveValue("game-1");
    expect(form?.querySelector("input[name='returnTo']")).toHaveValue("/app/catalogo");

    fireEvent.click(button);
    fireEvent.click(button);

    expect(enhancedAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      /salvo aqui, sincronizando/i
    );
    expect(
      screen.getByRole("button", { name: /salvo aqui, sincronizando/i })
    ).toBeDisabled();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /wishlist confirmada pelo servidor/i
    );
    expect(container.querySelector(".action-feedback-form")).not.toBeNull();
  });

  it("keeps Biblioteca status move local feedback and retry state", async () => {
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => ({
      ok: false,
      reason: "library-game-not-found"
    }));
    const { container } = render(
      <LibraryStatusControls
        action={fallbackAction}
        catalogGameId="game-1"
        currentStatus="wishlist"
        enhancedAction={enhancedAction}
        returnTo="/app/biblioteca"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /comecar em jogando/i }));

    expect(enhancedAction).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /nao deu para mover\. tente de novo/i
      );
    });
    expect(screen.getByRole("button", { name: /tentar de novo/i })).not.toBeDisabled();
    expect(container.querySelector("input[name='status']")).toHaveValue("jogando");
    expect(container.querySelector("input[name='returnTo']")).toHaveValue("/app/biblioteca");
  });

  it("refreshes Biblioteca after a successful status move and resets stale confirmed copy", async () => {
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => ({ ok: true }));
    const props = {
      action: fallbackAction,
      catalogGameId: "game-1",
      enhancedAction,
      returnTo: "/app/biblioteca"
    };
    const { rerender } = render(
      <LibraryStatusControls {...props} currentStatus="wishlist" />
    );

    fireEvent.click(screen.getByRole("button", { name: /comecar em jogando/i }));

    expect(enhancedAction).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent(
      /status confirmado pelo servidor/i
    );
    expect(navigationMock.refresh).toHaveBeenCalledOnce();

    rerender(<LibraryStatusControls {...props} currentStatus="jogando" />);

    expect(screen.getByRole("button", { name: /^pausar$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^confirmado$/i })).not.toBeInTheDocument();
  });

  it("closes Biblioteca secondary actions through Fechar, outside click and Escape", async () => {
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => ({ ok: true }));
    render(
      <div>
        <button type="button">Area fora</button>
        <LibraryStatusControls
          action={fallbackAction}
          catalogGameId="game-1"
          currentStatus="wishlist"
          enhancedAction={enhancedAction}
          returnTo="/app/biblioteca"
        />
      </div>
    );
    const trigger = screen.getByRole("button", { name: /mais acoes/i });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /^fechar$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^fechar$/i }));
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
    expect(screen.queryByRole("button", { name: /^fechar$/i })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.pointerDown(screen.getByRole("button", { name: /area fora/i }));
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });
});

describe("enhanced discovery mutation forms", () => {
  it("shows immediate local feedback for each deck decision and blocks duplicate submits", async () => {
    const cases = [
      {
        buttonName: /quero jogar/i,
        decision: "want",
        syncingCopy: /decisao salva aqui, sincronizando/i
      },
      {
        buttonName: /agora nao/i,
        decision: "not_now",
        syncingCopy: /decisao salva aqui, sincronizando/i
      },
      {
        buttonName: /pular/i,
        decision: "skip",
        syncingCopy: /decisao salva aqui, sincronizando/i
      }
    ] as const;

    for (const item of cases) {
      const deferred = createDeferred();
      const fallbackAction = vi.fn(async () => undefined);
      const enhancedAction = vi.fn(async () => {
        await deferred.promise;
        return {
          ok: true,
          state: item.decision === "want" ? "match-criado" : "card-avancado"
        };
      });
      const { container, unmount } = render(
        <DiscoveryCard
          card={{ ...discoveryCard(), allowedLibraryActions: [] }}
          decisionAction={fallbackAction}
          enhancedDecisionAction={enhancedAction}
          handoffAction={fallbackAction}
          reaction={null}
          returnTo="/app/descobrir"
        />
      );

      const button = screen.getByRole("button", { name: item.buttonName });
      const form = button.closest("form");

      expect(form).toHaveAttribute("action");
      expect(form?.querySelector("input[name='catalogGameId']")).toHaveValue(
        DISCOVERY_TEST_CARD_ID
      );
      expect(form?.querySelector("input[name='decision']")).toHaveValue(item.decision);

      fireEvent.click(button);
      fireEvent.click(button);

      expect(enhancedAction).toHaveBeenCalledOnce();
      expect(screen.getByRole("status")).toHaveTextContent(item.syncingCopy);
      expect(button).toBeDisabled();

      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });

      expect(screen.getByRole("status")).toHaveTextContent(
        item.decision === "want"
          ? /match confirmado pelo servidor/i
          : /confirmado pelo servidor/i
      );
      expect(container.querySelector(".action-feedback-form")).not.toBeNull();
      unmount();
    }
  });

  it("keeps match handoff honest with syncing and retry feedback", async () => {
    const deferred = createDeferred();
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => {
      await deferred.promise;
      return { ok: false, state: "limite-jogando" };
    });

    render(
      <MatchCelebration
        enhancedHandoffAction={enhancedAction}
        handoffAction={fallbackAction}
        match={discoveryMatch()}
        returnTo="/app/descobrir"
      />
    );

    const button = screen.getByRole("button", { name: /mandar para wishlist/i });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(enhancedAction).toHaveBeenCalledOnce();
    expect(screen.getByText(/match salvo aqui, sincronizando/i)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getByText(/nao deu para enviar o match/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar de novo/i })).not.toBeDisabled();
  });

  it("confirms Live start from the server before final copy appears", async () => {
    const deferred = createDeferred();
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => {
      await deferred.promise;
      return {
        ok: true,
        liveId: "00000000-0000-4000-8000-000000000099",
        state: "live-iniciado"
      };
    });

    render(
      <LivePanel
        action={fallbackAction}
        enhancedAction={enhancedAction}
        liveSession={null}
        returnTo="/app/descobrir"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /comecar live/i }));

    expect(enhancedAction).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(
      /live salva aqui, sincronizando/i
    );
    expect(screen.queryByText(/live confirmada pelo servidor/i)).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /live confirmada pelo servidor/i
    );
  });

  it("shows Quiz submit progress and then the authoritative duo/preview result", async () => {
    const deferred = createDeferred();
    const fallbackAction = vi.fn(async () => undefined);
    const enhancedAction = vi.fn(async () => {
      await deferred.promise;
      return { ok: true, state: "quiz-completo" };
    });

    render(
      <MoodQuiz
        action={fallbackAction}
        enhancedAction={enhancedAction}
        resultState={null}
        returnTo="/app/descobrir#mood-quiz"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /salvar mood/i }));

    expect(enhancedAction).toHaveBeenCalledOnce();
    expect(screen.getByText(/mood salvo aqui, sincronizando/i)).toBeInTheDocument();
    expect(screen.queryByText(/resultado completo da dupla aplicado/i)).not.toBeInTheDocument();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getAllByText(/resultado completo da dupla aplicado/i).length).toBeGreaterThan(0);
  });

  it("keeps reduced-motion discovery feedback on static /2 states", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const discoveryDeckSource = readFileSync(
      "src/modules/discovery/presentation/discovery-deck.tsx",
      "utf8"
    );
    const reducedMotionBlock = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)")
    );

    expect(discoveryDeckSource).toContain("useReducedMotion");
    expect(discoveryDeckSource).toContain("Movimento reduzido ativo");
    expect(reducedMotionBlock).toContain(
      '.action-feedback-button[data-action-state="syncing"]'
    );
    expect(reducedMotionBlock).toContain("animation: none");
  });
});

describe("phase performance regression guards", () => {
  it("keeps telemetry and feedback primitives wired into primary surfaces", () => {
    const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
    const feedbackSource = readFileSync("src/components/action-feedback.tsx", "utf8");
    const libraryActionsSource = readFileSync("src/app/app/phase-2-actions.ts", "utf8");
    const discoveryActionsSource = readFileSync("src/app/app/descobrir/actions.ts", "utf8");
    const rootPackageSource = readFileSync("../../package.json", "utf8");
    const phaseGateSource = readFileSync("../../scripts/phase-03-3-gate.mjs", "utf8");
    const enhancedWishlistActionSource = libraryActionsSource.slice(
      libraryActionsSource.indexOf("async function addGameToWishlistEnhancedActionTimed"),
      libraryActionsSource.indexOf("export async function moveLibraryGameAction")
    );

    expect(layoutSource).toContain("WebVitalsReporter");
    expect(feedbackSource).toContain("ActionFeedbackState");
    expect(feedbackSource).toContain('"syncing"');
    expect(feedbackSource).toContain('"failed"');
    expect(feedbackSource).toContain('"retrying"');
    expect(libraryActionsSource).toContain("withServerTiming");
    expect(libraryActionsSource).toContain("addGameToWishlistEnhancedAction");
    expect(libraryActionsSource).toContain("revalidateEnhancedWishlistSurfaces");
    expect(enhancedWishlistActionSource).toContain("revalidateEnhancedWishlistSurfaces();");
    expect(enhancedWishlistActionSource).not.toContain("returnTo");
    expect(enhancedWishlistActionSource).not.toContain("revalidateEnhancedLibrarySurfaces");
    expect(libraryActionsSource).toContain("moveLibraryGameEnhancedAction");
    expect(discoveryActionsSource).toContain("withServerTiming");
    expect(discoveryActionsSource).toContain("recordDiscoveryDecisionEnhancedAction");
    expect(discoveryActionsSource).toContain("handoffDiscoveryMatchToLibraryEnhancedAction");
    expect(discoveryActionsSource).toContain("startDiscoveryLiveSessionEnhancedAction");
    expect(discoveryActionsSource).toContain("answerMoodQuizEnhancedAction");
    expect(rootPackageSource).toContain("phase:03.3:gate");
    expect(phaseGateSource).toContain("03.3-PERFORMANCE-REVIEW.md");
    expect(phaseGateSource).toContain("phase-03-3-performance.spec.ts");
  });
});

function FeedbackActionHarness({
  action
}: {
  action: () => Promise<void>;
}) {
  const [state, setState] = useState<ActionFeedbackState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => (current === "failed" ? "retrying" : "syncing"));

    try {
      await action();
      setState("confirmed");
    } catch {
      setState("failed");
    }
  }

  return (
    <form className="form-actions" onSubmit={handleSubmit}>
      <ActionFeedbackButton
        labels={{
          idle: "Adicionar a Wishlist",
          syncing: "Sincronizando com a fila",
          confirmed: "Confirmado",
          failed: "Tentar de novo",
          retrying: "Tentando de novo"
        }}
        state={state}
      />
      <ActionFeedback
        copy={{
          syncing: "Salvo aqui, sincronizando...",
          confirmed: "Confirmado pela fila.",
          failed: "Nao sincronizou. Tente de novo.",
          retrying: "Tentando de novo..."
        }}
        state={state}
      />
    </form>
  );
}

const DISCOVERY_TEST_CARD_ID = "00000000-0000-4000-8000-000000000021";

function discoveryCard() {
  return {
    catalogGameId: DISCOVERY_TEST_CARD_ID,
    slug: "it-takes-two",
    title: "It Takes Two",
    coverUrl: null,
    releaseLabel: "26 de mar. de 2021",
    platformLabels: ["PC", "PlayStation", "Xbox"],
    genreLabels: ["Aventura", "Puzzle"],
    sourceMeta: {
      attributionLabel: "Dados e imagens: RAWG",
      attributionHref: "https://rawg.io/games/it-takes-two",
      freshnessLabel: "Atualizado hoje",
      freshnessTone: "fresh" as const
    },
    timeEstimateLabel: "Cerca de 14 horas",
    availabilityLabel: "Nao verificado",
    reasons: ["PC em comum", "campanha 2p"],
    libraryStatus: null,
    libraryActionState: "can-add" as const,
    allowedLibraryActions: ["wishlist", "jogando", "pausado"]
  };
}

function discoveryMatch() {
  return {
    match: {
      id: "match-1",
      duoId: "duo-1",
      userId: "user-1",
      catalogGameId: DISCOVERY_TEST_CARD_ID,
      matchedAt: new Date("2026-06-04T09:30:00.000Z"),
      createdFrom: "deck" as const,
      firstUserId: "user-1",
      secondUserId: "user-2",
      reasonSnapshot: ["PC em comum"],
      libraryHandoffStatus: null
    },
    slug: "it-takes-two",
    title: "It Takes Two",
    coverUrl: null,
    libraryStatus: null,
    reasons: ["PC em comum"]
  };
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject
  };
}
