import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { getCurrentPlay } from "../../../modules/play";
import {
  CompactHistory,
  ReplacementRequired,
  getRouletteHistory,
  getRouletteState,
  ResultPanel,
  RouletteAudioControl,
  RouletteReel,
  toRouletteRouteViewModel,
  type ReplacementRequiredGameView,
  type RouletteRouteViewModel
} from "../../../modules/roulette";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import {
  discardRouletteResultAction,
  lockRouletteResultAction,
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

type RoulettePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoulettePage({
  searchParams
}: RoulettePageProps = {}) {
  return withServerTiming(rouletteTimingContext, () =>
    renderRoulettePage({ searchParams })
  );
}

async function renderRoulettePage({
  searchParams
}: RoulettePageProps = {}) {
  const session = await measureStage("auth", rouletteTimingContext, () =>
    requireVerifiedSession()
  );
  const [stateResult, historyResult, currentPlayResult, params] = await measureStage(
    "database",
    rouletteTimingContext,
    () =>
      Promise.all([
        getRouletteState({ userId: session.user.id }),
        getRouletteHistory({ userId: session.user.id, limit: 8 }),
        getCurrentPlay(session.user.id),
        searchParams
      ])
  );

  if (!stateResult.ok || !historyResult.ok) {
    redirect("/parear");
  }

  const viewModel = toRouletteRouteViewModel({
    history: historyResult.history,
    state: stateResult.state
  });
  const routeState = getRouteSearchParam(params?.estado);
  const replacementRoundId = getRouteSearchParam(params?.roundId);
  const showReplacementRequired =
    routeState === "replacement-required"
    && Boolean(viewModel.round?.id && replacementRoundId === viewModel.round.id);
  const replacementGames = currentPlayResult.ok
    ? currentPlayResult.currentPlay.games
        .slice()
        .sort((first, second) => first.position - second.position)
        .map(toReplacementRequiredGameView)
    : [];

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
          {renderFirstViewport(viewModel, {
            replacementGames,
            showReplacementRequired
          })}
        </section>

        <CompactHistory
          emptyLabel={viewModel.history.emptyLabel}
          heading={viewModel.history.heading}
          items={viewModel.history.items}
        />
      </section>
    </AppShell>
  ));
}

type RouletteExperienceOptions = {
  replacementGames: ReplacementRequiredGameView[];
  showReplacementRequired: boolean;
};

function renderFirstViewport(
  viewModel: RouletteRouteViewModel,
  options: RouletteExperienceOptions
) {
  switch (viewModel.firstViewport.state) {
    case "blocked-pool":
      return renderBlockedPool(viewModel);
    case "pending-invitation":
      return renderPendingInvitation(viewModel, options);
    case "resumable-reveal":
      return renderResumableReveal(viewModel, options);
    case "history-backed-empty":
      return renderHistoryBackedEmpty(viewModel);
    case "ready":
      return renderReadyRoulette(viewModel, options);
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

function renderReadyRoulette(
  viewModel: RouletteRouteViewModel,
  options: RouletteExperienceOptions
) {
  return (
    <RouletteExperience
      replacementGames={options.replacementGames}
      showReplacementRequired={options.showReplacementRequired}
      viewModel={viewModel}
    />
  );
}

function renderResumableReveal(
  viewModel: RouletteRouteViewModel,
  options: RouletteExperienceOptions
) {
  return (
    <RouletteExperience
      replacementGames={options.replacementGames}
      showReplacementRequired={options.showReplacementRequired}
      viewModel={viewModel}
    />
  );
}

function renderPendingInvitation(
  viewModel: RouletteRouteViewModel,
  options: RouletteExperienceOptions
) {
  return (
    <RouletteExperience
      replacementGames={options.replacementGames}
      showReplacementRequired={options.showReplacementRequired}
      viewModel={viewModel}
    />
  );
}

function RouletteExperience({
  replacementGames = [],
  showReplacementRequired = false,
  viewModel
}: {
  replacementGames?: ReplacementRequiredGameView[];
  showReplacementRequired?: boolean;
  viewModel: RouletteRouteViewModel;
}) {
  return (
    <div className="roulette-reveal-stack">
      {/* roulette-reel-band: full-bleed reel with fixed pointer; controls below; no tiny card */}
      <RouletteReel
        boosted={viewModel.reel.boosted}
        result={viewModel.reel.result}
        slots={viewModel.reel.slots}
        status={viewModel.reel.status}
      />
      <div className="roulette-controls" aria-label="Controles da roleta">
        <div className="roulette-economy-grid">
          <span>{viewModel.boost.canUseBoost ? viewModel.boost.controlLabel : viewModel.boost.unavailableLabel}</span>
          <span>{viewModel.pity.compactLabel}</span>
          <span>{viewModel.pity.progressLabel}</span>
          <span>{viewModel.boost.balanceLabel}</span>
        </div>
        {viewModel.firstViewport.state === "ready" ? (
          <>
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
          </>
        ) : (
          renderReplayForm(viewModel, "quiet")
        )}
        <RouletteAudioControl
          defaultEnabled={viewModel.audio.defaultEnabledFromDuoPreference}
          updateRouletteAudioPreferenceAction={updateRouletteAudioPreferenceAction}
        />
        <noscript>
          <form action={submitRouletteAudioPreferenceForm}>
            <input
              name="audioEnabled"
              type="hidden"
              value={viewModel.audio.audioEnabled ? "false" : "true"}
            />
            <button className="queue2-button" data-tone="quiet" type="submit">
              {viewModel.audio.label}
            </button>
          </form>
        </noscript>
      </div>
      <ResultPanel
        discardAction={submitDiscardRouletteResultForm}
        lockAction={submitLockRouletteResultForm}
        replayAction={submitReplayRouletteRoundForm}
        result={viewModel.round?.result ?? null}
        roundId={viewModel.round?.id ?? null}
      />
      {showReplacementRequired && viewModel.round ? (
        <ReplacementRequired
          games={replacementGames}
          lockAction={submitLockRouletteResultForm}
          roundId={viewModel.round.id}
        />
      ) : null}
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

async function submitLockRouletteResultForm(formData: FormData): Promise<void> {
  "use server";

  const result = await lockRouletteResultAction(formData);

  if (result.ok) {
    redirect(result.redirectTo ?? "/app");
  }

  if (result.state === "replacement-required") {
    const roundId = getRouteFormString(formData, "roundId");
    redirect(`/app/roleta?estado=replacement-required&roundId=${encodeURIComponent(roundId)}`);
  }

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  redirect("/app/roleta");
}

async function submitDiscardRouletteResultForm(formData: FormData): Promise<void> {
  "use server";

  const result = await discardRouletteResultAction(formData);

  if (result.ok) {
    redirect(result.redirectTo ?? "/app/roleta?estado=roleta-descartada");
  }

  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  redirect("/app/roleta");
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

function toReplacementRequiredGameView(input: {
  libraryGameId: string;
  name?: string;
  position: number;
  role: "principal" | "secondary";
  roleLabel?: string;
  catalogGame?: {
    name: string;
  };
}): ReplacementRequiredGameView {
  return {
    libraryGameId: input.libraryGameId,
    name: input.catalogGame?.name ?? input.name ?? "Jogo em andamento",
    roleLabel: input.roleLabel ?? (
      input.role === "principal" ? "Principal" : `Secundario ${input.position - 1}`
    )
  };
}

function getRouteSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getRouteFormString(formData: FormData, key: "roundId"): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
