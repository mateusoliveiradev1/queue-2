import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
import { getPhase6StatusMessage } from "./phase-6-status";

export const metadata: Metadata = {
  description:
    "Painel da fila coop da dupla: jogos no backlog, plataformas comuns e proximos passos.",
  title: "Fila da dupla"
};

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
  const phase6StatusMessage = getPhase6StatusMessage(state);
  const statusMessage = phase6StatusMessage ?? getPhase2StatusMessage(state);
  const roulettePrincipalHighlight =
    state === "roleta-principal" ? "roleta-principal" : null;
  const rewardState = getSearchParam(params?.recompensa);
  const rewardStatus = getPhase5RewardStatus(rewardState, {
    duoId: duo.id,
    userId: session.user.id
  });

  return measureStage("render", dashboardTimingContext, async () => (
    <AppShell
      currentPage="dashboard"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      {statusMessage ? (
        <>
          <StatusToast
            message={statusMessage}
            state={state}
            variant={roulettePrincipalHighlight ? "special" : "calm"}
          />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}
      <RewardToast reward={rewardStatus} />

      <header className="home-anchor" aria-labelledby="home-anchor-title">
        <div className="home-anchor-status" aria-label="Estado de progresso da dupla">
          <span>
            LV <strong>{gamification.levelLabel}</strong>
          </span>
          <span>
            XP <strong>{gamification.xpLabel}</strong>
          </span>
          <span>
            STREAK <strong>{gamification.streak.valueLabel}</strong>
          </span>
        </div>
        <div className="home-anchor-grid">
          <div className="home-anchor-copy">
            <p className="eyebrow">Dupla formada</p>
            <h1 className="page-title" id="home-anchor-title">
              Jogando Agora
            </h1>
            <p className="lede">
              A dupla escolhe um Principal, mantem ate dois secundarios e organiza
              a ordem sem perder o combinado.
            </p>
          </div>
          <div className="home-anchor-current" data-empty={playingNow.empty ? "true" : "false"}>
            <p className="eyebrow">
              {playingNow.principal ? "Principal da dupla" : "NADA NA FILA"}
            </p>
            <h2>
              {playingNow.principal ? (
                playingNow.principal.name
              ) : (
                <>
                  NADA NA FILA
                  <span>AINDA</span>
                </>
              )}
            </h2>
            <p>
              {playingNow.principal
                ? `${playingNow.principal.progress.coopTimeLabel}. ${playingNow.activeCountLabel}.`
                : "Escolham ate tres jogos em Jogando; o primeiro vira Principal automaticamente."}
            </p>
          </div>
        </div>
        <nav className="home-anchor-actions" aria-label="Acoes principais da fila">
          <a className="queue2-button" data-tone="primary" href="/app/descobrir">
            Descobrir
          </a>
          <a className="queue2-button" data-tone="quiet" href="/app/roleta">
            Roleta
          </a>
          <a className="queue2-button" data-tone="quiet" href="/app/biblioteca">
            Biblioteca
          </a>
        </nav>
      </header>

      {roulettePrincipalHighlight ? (
        <div data-highlight="roleta-principal">
          <PlayingNowDashboard
            moveLibraryAction={moveLibraryGameAction}
            pausedGames={library?.groups?.pausado ?? []}
            principalHighlight={roulettePrincipalHighlight}
            promoteAction={promotePlayingGameAction}
            reorderAction={reorderPlayingGamesAction}
            view={playingNow}
          />
        </div>
      ) : (
        <PlayingNowDashboard
          moveLibraryAction={moveLibraryGameAction}
          pausedGames={library?.groups?.pausado ?? []}
          principalHighlight={roulettePrincipalHighlight}
          promoteAction={promotePlayingGameAction}
          reorderAction={reorderPlayingGamesAction}
          view={playingNow}
        />
      )}

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

      <section className="home-route-strip app-section" aria-labelledby="home-routes-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="home-routes-title">
            Acessos da fila
          </h2>
          <p className="support-copy">Baixo na tela, mas sempre alcancavel.</p>
        </div>
        <div className="home-route-grid">
          <a className="home-route-tile queue2-focusable" href="/app/catalogo">
            <span>Catalogo</span>
            <strong>Base de jogos</strong>
            <small>Buscar fontes, frescor e disponibilidade.</small>
          </a>
          <a className="home-route-tile queue2-focusable" href="/app/conquistas">
            <span>Conquistas</span>
            <strong>Selos da dupla</strong>
            <small>Ver memoria aberta sem placar solo.</small>
          </a>
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
