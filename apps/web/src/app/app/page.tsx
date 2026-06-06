import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoulettePointer } from "@queue/ui";

import { AppShell } from "../../components/app-shell";
import { StatusToast } from "../../components/status-toast";
import { formatPairingDate, getDuoDashboard } from "../../modules/duo";
import {
  GamificationDashboardBand,
  RewardToast,
  getGamificationDashboard,
  toGamificationDashboardView
} from "../../modules/gamification";
import { getLibraryOverview, toLibraryOverviewView } from "../../modules/library";
import {
  getCurrentPlay,
  getDuoNotifications,
  NotificationCenter,
  PlayingNowDashboard,
  toPlayingNowView
} from "../../modules/play";
import { requireVerifiedSession } from "../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../platform/performance/server-timing";
import { moveLibraryGameAction } from "./phase-2-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "./phase-2-status";
import {
  promotePlayingGameAction,
  reorderPlayingGamesAction
} from "./phase-4-actions";
import { getPhase5RewardStatus } from "./phase-5-status";

export const metadata: Metadata = {
  description:
    "Painel da fila coop da dupla: jogos no backlog, plataformas comuns e proximos passos.",
  title: "Fila da dupla"
};

const ritual = [
  {
    word: "descobrir",
    text: "Trazer jogos que os dois realmente topariam jogar."
  },
  {
    word: "decidir",
    text: "Comparar vontade, tempo e plataforma antes de comecar."
  },
  {
    word: "zerar",
    text: "Registrar a jornada da dupla ate a conclusao."
  }
] as const;

const dashboardTimingContext = { route: "app.home" } as const;

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({
  searchParams
}: DashboardPageProps = {}) {
  return withServerTiming(dashboardTimingContext, () =>
    renderDashboardPage({ searchParams })
  );
}

async function renderDashboardPage({
  searchParams
}: DashboardPageProps = {}) {
  const session = await measureStage("auth", dashboardTimingContext, () =>
    requireVerifiedSession()
  );
  const [
    dashboard,
    libraryResult,
    currentPlayResult,
    notificationsResult,
    gamificationDashboard,
    params
  ] = await measureStage(
    "database",
    dashboardTimingContext,
    () =>
      Promise.all([
        getDuoDashboard(session.user.id),
        getLibraryOverview(session.user.id),
        getCurrentPlay(session.user.id),
        getDuoNotifications({ userId: session.user.id }),
        getGamificationDashboard({ userId: session.user.id }),
        searchParams
      ])
  );

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const duo = dashboard.duo;

  if (!duo?.name || !duo.pairedAt) {
    redirect("/parear");
  }

  const pairedAt = duo.pairedAt;
  const library = libraryResult.ok ? toLibraryOverviewView(libraryResult.overview) : null;
  const playingNow = currentPlayResult.ok
    ? toPlayingNowView(currentPlayResult.currentPlay)
    : toPlayingNowView({
        games: [],
        principal: null,
        secondaries: [],
        limit: 3
      });
  const gamification = toGamificationDashboardView(gamificationDashboard);
  const totalGames = library
    ? library.counts.wishlist + library.counts.jogando + library.counts.pausado
    : 0;
  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const rewardState = getSearchParam(params?.recompensa);
  const rewardStatus = getPhase5RewardStatus(rewardState);

  return measureStage("render", dashboardTimingContext, async () => (
    <AppShell
      currentPage="dashboard"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}
      <RewardToast reward={rewardStatus} />

      <header className="app-header">
        <div>
          <p className="eyebrow">Dupla formada</p>
          <h1 className="page-title">Jogando Agora</h1>
          <p className="lede">
            A dupla escolhe um Principal, mantem ate dois secundarios e organiza
            a ordem sem perder o combinado.
          </p>
        </div>
      </header>

      <PlayingNowDashboard
        moveLibraryAction={moveLibraryGameAction}
        pausedGames={library?.groups?.pausado ?? []}
        promoteAction={promotePlayingGameAction}
        reorderAction={reorderPlayingGamesAction}
        view={playingNow}
      />

      <GamificationDashboardBand view={gamification} />

      <section className="surface-band app-section" aria-labelledby="duo-context">
        <div className="section-heading">
          <h2 className="eyebrow" id="duo-context">
            Estado da fila
          </h2>
          <p className="support-copy">O que ja existe depois do pareamento.</p>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="muted">Dupla</span>
            <strong>{duo.name}</strong>
            <span className="muted">
              Pareados em {formatPairingDate(pairedAt, duo.timezone)}.
            </span>
          </div>
          <div className="metric">
            <span className="muted">Membros</span>
            <strong>{duo.members.length}/2</strong>
            <span className="muted">
              {duo.members.map((member) => member.displayName).join(" + ")}
            </span>
          </div>
          <div className="metric">
            <span className="muted">Jogos</span>
            <strong>{totalGames} jogos</strong>
            <span className="muted">
              {totalGames === 0
                ? "Nada inventado. Busquem o primeiro coop no catalogo."
                : formatLibraryStatusSummary(library?.counts)}
            </span>
          </div>
          <div className="metric">
            <span className="muted">Plataformas comuns</span>
            <strong>{library?.commonPlatformLabels.length ? library.commonPlatformLabels.join(", ") : "A definir"}</strong>
            <span className="muted">Cada membro registra as suas na Biblioteca.</span>
          </div>
        </div>
      </section>

      <section className="surface-band app-section" aria-labelledby="ritual-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="ritual-title">
            Ritual da dupla
          </h2>
          <p className="support-copy">A promessa que a fila vai carregar.</p>
        </div>
        <div className="ritual-grid">
          {ritual.map((step) => (
            <article className="ritual-step" key={step.word}>
              <RoulettePointer aria-hidden="true" label="" />
              <strong>{step.word}</strong>
              <span className="muted">{step.text}</span>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  ));
}

function formatLibraryStatusSummary(
  counts:
    | {
        wishlist: number;
        jogando: number;
        pausado: number;
      }
    | undefined
): string {
  if (!counts) {
    return "Fila ainda nao carregada.";
  }

  return [
    formatCount(counts.wishlist, "na Wishlist", "na Wishlist"),
    formatCount(counts.jogando, "em Jogando", "em Jogando"),
    formatCount(counts.pausado, "pausado", "pausados")
  ].join(", ");
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
