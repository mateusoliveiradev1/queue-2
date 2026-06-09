import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import {
  getRouletteHistory,
  getRouletteState,
  toRouletteRouteViewModel,
  type RouletteRouteViewModel
} from "../../../modules/roulette";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import {
  replayRouletteRoundAction,
  startRouletteRoundAction,
  updateRouletteAudioPreferenceAction
} from "./actions";

export const metadata: Metadata = {
  description:
    "Roleta autenticada da dupla no QUEUE/2 para sortear jogos reais da Wishlist e Pausado.",
  title: "Roleta da dupla"
};

const rouletteTimingContext = { route: "app.roleta" } as const;

export default async function RoulettePage() {
  return withServerTiming(rouletteTimingContext, renderRoulettePage);
}

async function renderRoulettePage() {
  const session = await measureStage("auth", rouletteTimingContext, () =>
    requireVerifiedSession()
  );
  const [stateResult, historyResult] = await measureStage(
    "database",
    rouletteTimingContext,
    () =>
      Promise.all([
        getRouletteState({ userId: session.user.id }),
        getRouletteHistory({ userId: session.user.id, limit: 8 })
      ])
  );

  if (!stateResult.ok || !historyResult.ok) {
    redirect("/parear");
  }

  const viewModel = toRouletteRouteViewModel({
    history: historyResult.history,
    state: stateResult.state
  });

  return measureStage("render", rouletteTimingContext, async () => (
    <AppShell currentPage="roleta">
      <section className="roulette-route" aria-labelledby="roulette-route-title">
        <header className="roulette-hero">
          <p className="eyebrow">{viewModel.copy.eyebrow}</p>
          <h1 className="page-title" id="roulette-route-title">
            {viewModel.copy.title}
          </h1>
          <p className="lede">{viewModel.copy.helper}</p>
        </header>

        <section
          aria-label={viewModel.firstViewport.statusLabel}
          className="roulette-first-viewport"
          data-state={viewModel.firstViewport.state}
        >
          {renderFirstViewport(viewModel)}
        </section>

        <section className="roulette-history" aria-labelledby="roulette-history-title">
          <div className="section-heading">
            <h2 id="roulette-history-title">{viewModel.history.heading}</h2>
            <p className="support-copy">{viewModel.history.emptyLabel}</p>
          </div>
          {viewModel.history.items.length > 0 ? (
            <ol className="roulette-history-list">
              {viewModel.history.items.map((item) => (
                <li key={item.id}>
                  <span>{item.eventLabel}</span>
                  <time>{item.occurredAtLabel}</time>
                  <small>{item.summaryLabel}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="roulette-history-empty">{viewModel.history.emptyLabel}</p>
          )}
        </section>
      </section>
    </AppShell>
  ));
}

function renderFirstViewport(viewModel: RouletteRouteViewModel) {
  switch (viewModel.firstViewport.state) {
    case "blocked-pool":
      return renderBlockedPool(viewModel);
    case "pending-invitation":
      return renderPendingInvitation(viewModel);
    case "resumable-reveal":
      return renderResumableReveal(viewModel);
    case "history-backed-empty":
      return renderHistoryBackedEmpty(viewModel);
    case "ready":
      return renderReadyRoulette(viewModel);
  }
}

function renderBlockedPool(viewModel: RouletteRouteViewModel) {
  const blockedPool = viewModel.blockedPool;

  if (!blockedPool) {
    return null;
  }

  return (
    <div className="roulette-state-panel roulette-blocked-state">
      <strong>{blockedPool.title}</strong>
      <p>{blockedPool.body}</p>
      <span className="roulette-pill">
        {blockedPool.eligibleCount}/{blockedPool.requiredEligibleCount} jogos prontos
      </span>
      <div className="roulette-actions">
        {blockedPool.ctas.map((cta) => (
          <a className="queue2-button" data-tone="quiet" href={cta.href} key={cta.href}>
            {cta.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function renderReadyRoulette(viewModel: RouletteRouteViewModel) {
  return (
    <div className="roulette-state-panel roulette-ready-state">
      <div>
        <h2>{viewModel.copy.controls.start}</h2>
        <p>{viewModel.copy.helper}</p>
      </div>
      <div className="roulette-economy-grid">
        <span>{viewModel.boost.canUseBoost ? viewModel.boost.controlLabel : viewModel.boost.unavailableLabel}</span>
        <span>{viewModel.pity.compactLabel}</span>
        <span>{viewModel.pity.progressLabel}</span>
        <span>{viewModel.audio.label}</span>
      </div>
      <div className="roulette-actions">
        <form action={submitStartRouletteRoundForm}>
          <input name="idempotencyKey" type="hidden" value={randomUUID()} />
          <button className="queue2-button" data-tone="primary" type="submit">
            {viewModel.copy.controls.start}
          </button>
        </form>
        {viewModel.boost.canUseBoost ? (
          <form action={submitStartRouletteRoundForm}>
            <input name="idempotencyKey" type="hidden" value={randomUUID()} />
            <input name="useBoost" type="hidden" value="true" />
            <button className="queue2-button" data-tone="quiet" type="submit">
              {viewModel.boost.controlLabel}
            </button>
          </form>
        ) : null}
        <form action={submitRouletteAudioPreferenceForm}>
          <input
            name="audioEnabled"
            type="hidden"
            value={viewModel.audio.audioEnabled ? "false" : "true"}
          />
          <button
            aria-pressed={viewModel.audio.audioEnabled}
            className="queue2-button"
            data-tone="quiet"
            type="submit"
          >
            {viewModel.audio.label}
          </button>
        </form>
      </div>
    </div>
  );
}

function renderResumableReveal(viewModel: RouletteRouteViewModel) {
  return (
    <div className="roulette-state-panel roulette-resume-state" aria-live="polite">
      <strong>{viewModel.copy.controls.persisted}</strong>
      <p>{viewModel.copy.controls.replayDisclaimer}</p>
      {renderReplayForm(viewModel, "primary")}
    </div>
  );
}

function renderPendingInvitation(viewModel: RouletteRouteViewModel) {
  return (
    <div className="roulette-state-panel roulette-invitation-state" aria-live="polite">
      <strong>{viewModel.copy.result.invitation}</strong>
      <p>{viewModel.copy.controls.persisted}</p>
      <div className="roulette-actions">
        <button className="queue2-button" data-tone="primary" type="button">
          {viewModel.copy.result.lock}
        </button>
        {renderReplayForm(viewModel, "quiet")}
      </div>
      <small>{viewModel.copy.controls.replayDisclaimer}</small>
    </div>
  );
}

function renderReplayForm(
  viewModel: RouletteRouteViewModel,
  tone: "primary" | "quiet"
) {
  if (!viewModel.round) {
    return null;
  }

  return (
    <form action={submitReplayRouletteRoundForm}>
      <input name="roundId" type="hidden" value={viewModel.round.id} />
      <button className="queue2-button" data-tone={tone} type="submit">
        {viewModel.copy.controls.replay}
      </button>
    </form>
  );
}

async function submitStartRouletteRoundForm(formData: FormData): Promise<void> {
  "use server";

  await startRouletteRoundAction(formData);
}

async function submitReplayRouletteRoundForm(formData: FormData): Promise<void> {
  "use server";

  await replayRouletteRoundAction(formData);
}

async function submitRouletteAudioPreferenceForm(formData: FormData): Promise<void> {
  "use server";

  await updateRouletteAudioPreferenceAction(formData);
}

function renderHistoryBackedEmpty(viewModel: RouletteRouteViewModel) {
  return (
    <div className="roulette-state-panel roulette-history-backed-state">
      <strong>{viewModel.firstViewport.statusLabel}</strong>
      <p>{viewModel.copy.helper}</p>
      <a className="queue2-button" data-tone="primary" href="/app/biblioteca">
        {viewModel.copy.blocked.ctas.biblioteca}
      </a>
    </div>
  );
}
