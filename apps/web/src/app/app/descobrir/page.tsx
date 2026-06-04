import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  DiscoveryDeck,
  DiscoveryFilters,
  DiscoverySearch,
  getDiscoveryDeck,
  getLiveSession,
  getMatchHistory,
  getMoodQuizStatus,
  LivePanel,
  MatchCelebration,
  MatchHistory,
  MoodQuiz
} from "../../../modules/discovery";
import { getDuoDashboard } from "../../../modules/duo";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  answerMoodQuizAction,
  getSurpriseRecommendationAction,
  handoffDiscoveryMatchToLibraryAction,
  recordDiscoveryDecisionAction,
  startDiscoveryLiveSessionAction
} from "./actions";
import {
  buildDiscoveryPath,
  getDiscoveryFilterParams,
  getDiscoveryFilters,
  getSearchParam,
  parseUuidSearchParam
} from "./discovery-route-params";

export const metadata: Metadata = {
  description:
    "Deck de descoberta da dupla no QUEUE/2 com swipes, match live, quiz, busca e historico de matches.",
  title: "Descobrir coops"
};

type DiscoveryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoveryPage({
  searchParams
}: DiscoveryPageProps = {}) {
  const session = await requireVerifiedSession();
  const [dashboard, params] = await Promise.all([
    getDuoDashboard(session.user.id),
    searchParams
  ]);

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const state = getSearchParam(params?.estado);
  const liveParam = getSearchParam(params?.live);
  const surpriseParam = getSearchParam(params?.surpresa);
  const liveId = parseUuidSearchParam(liveParam);
  const surpriseId = parseUuidSearchParam(surpriseParam);

  if ((liveParam && !liveId) || (surpriseParam && !surpriseId)) {
    redirect("/app/descobrir?estado=acao-invalida");
  }

  const filters = getDiscoveryFilters(params);
  const deckPage = parsePositivePage(getSearchParam(params?.pagina));
  const returnTo = buildDiscoveryPath(params);
  const [deck, matchHistory, liveSession, moodQuizStatus] = await Promise.all([
    getDiscoveryDeck({
      userId: session.user.id,
      filters,
      limit: 6,
      page: deckPage,
      preferredCatalogGameId: surpriseId ?? undefined
    }),
    getMatchHistory({
      userId: session.user.id,
      limit: 6
    }),
    getLiveSession({
      userId: session.user.id,
      sessionId: liveId
    }),
    getMoodQuizStatus({
      userId: session.user.id
    })
  ]);
  const hasActiveLive = liveSession.ok;
  const livePanelHref = getLivePanelHref(returnTo, liveSession);
  const shouldShowMoodQuiz =
    !moodQuizStatus.ok || !moodQuizStatus.currentUserAnswered;
  const statusMessage = getDiscoveryStatusMessage(state);
  const celebrationMatch =
    state === "match-criado" || state === "match-ja-existe"
      ? matchHistory[0] ?? null
      : null;

  return (
    <AppShell currentPage="descobrir">
      <section className="discovery-stage" aria-labelledby="discovery-stage-title">
        <header className="discovery-stage-top">
          <p className="eyebrow">Descoberta /2</p>
          <h1 className="page-title" id="discovery-stage-title">
            Os dois quiseram?
          </h1>
        </header>

        {statusMessage ? (
          <div className="discovery-stage-status">
            <StatusToast
              message={statusMessage}
              state={state}
              variant={state?.startsWith("match") ? "special" : "calm"}
            />
            <p className="status-banner" role="status">
              {statusMessage}
            </p>
          </div>
        ) : null}

        <div
          className="discovery-orbit-controls"
          role="group"
          aria-label="Controles orbitais de descoberta"
        >
          <a
            className="queue2-button"
            data-tone={hasActiveLive ? "primary" : "quiet"}
            href={livePanelHref}
          >
            {hasActiveLive ? "Live ativa" : "Live"}
          </a>
          <form action={getSurpriseRecommendationAction}>
            <input name="returnTo" type="hidden" value={returnTo} />
            <button className="queue2-button" data-tone="quiet" type="submit">
              Surpresa
            </button>
          </form>
          {shouldShowMoodQuiz ? (
            <a className="queue2-button" data-tone="quiet" href="#mood-quiz">
              Quiz
            </a>
          ) : null}
          <a className="queue2-button" data-tone="quiet" href="#discovery-search">
            Busca
          </a>
          <a className="queue2-button" data-tone="quiet" href="#discovery-filters-panel">
            Filtros
          </a>
        </div>

        <section className="discovery-card-stage" aria-labelledby="discovery-deck-title">
          <MatchCelebration
            handoffAction={handoffDiscoveryMatchToLibraryAction}
            match={celebrationMatch}
            returnTo={returnTo}
          />
          <div className="section-heading">
            <p className="eyebrow" id="discovery-deck-title">
              Deck central
            </p>
            <p className="support-copy">
              Plataforma em comum fica ligada por padrao para priorizar jogos
              que a dupla consegue jogar agora.
            </p>
          </div>

          <DiscoveryDeck
            cards={deck.cards}
            decisionAction={recordDiscoveryDecisionAction}
            handoffAction={handoffDiscoveryMatchToLibraryAction}
            pagination={getDeckPagination(returnTo, deck.pageInfo)}
            returnTo={returnTo}
            surpriseCatalogGameId={surpriseId ?? undefined}
          />
        </section>

        <section className="discovery-stage-trays" aria-label="Apoios da descoberta">
          <section
            className="surface-band app-section discovery-tray"
            data-discovery-tray-slot="filters"
            id="discovery-filters-panel"
            aria-label="Filtros de descoberta"
          >
            <DiscoveryFilters params={getDiscoveryFilterParams(params)} />
          </section>

          <section
            className="surface-band app-section discovery-tray"
            data-discovery-tray-slot="live"
            id="discovery-live-panel"
            aria-labelledby="live-summary-title"
          >
            <LivePanel
              action={startDiscoveryLiveSessionAction}
              liveSession={liveSession}
              returnTo={returnTo}
            />
          </section>

          <section
            className="surface-band app-section discovery-tray"
            data-discovery-tray-slot="search"
            aria-labelledby="discovery-search-title"
          >
            <DiscoverySearch
              decisionAction={recordDiscoveryDecisionAction}
              handoffAction={handoffDiscoveryMatchToLibraryAction}
              returnTo={returnTo}
            />
          </section>

          {shouldShowMoodQuiz ? (
            <section
              className="surface-band app-section discovery-tray"
              data-discovery-tray-slot="quiz"
              aria-labelledby="mood-quiz-title"
            >
              <MoodQuiz
                action={answerMoodQuizAction}
                resultState={state}
                returnTo={returnTo}
              />
            </section>
          ) : null}

          <section
            className="surface-band app-section discovery-tray"
            data-discovery-tray-slot="matches"
            aria-labelledby="match-history-title"
          >
            <MatchHistory
              action={handoffDiscoveryMatchToLibraryAction}
              items={matchHistory}
              returnTo={returnTo}
            />
          </section>
        </section>
      </section>
    </AppShell>
  );
}

function parsePositivePage(value: string | null): number {
  if (!value) {
    return 1;
  }

  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getDeckPagination(
  returnTo: string,
  pageInfo: Awaited<ReturnType<typeof getDiscoveryDeck>>["pageInfo"] | undefined
) {
  const resolvedPageInfo = pageInfo ?? {
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false
  };

  return {
    currentPage: resolvedPageInfo.currentPage,
    nextHref: resolvedPageInfo.hasNextPage
      ? withDiscoveryPage(returnTo, resolvedPageInfo.currentPage + 1)
      : null,
    previousHref: resolvedPageInfo.hasPreviousPage
      ? withDiscoveryPage(returnTo, resolvedPageInfo.currentPage - 1)
      : null
  };
}

function withDiscoveryPage(path: string, page: number): string {
  const url = new URL(path, "https://queue.local");

  if (page <= 1) {
    url.searchParams.delete("pagina");
  } else {
    url.searchParams.set("pagina", String(page));
  }

  return `${url.pathname}${url.search}`;
}

function getLivePanelHref(
  returnTo: string,
  liveSession: Awaited<ReturnType<typeof getLiveSession>>
): string {
  if (!liveSession.ok) {
    return "#discovery-live-panel";
  }

  const url = new URL(returnTo, "https://queue.local");
  url.searchParams.set("live", liveSession.session.id);
  return `${url.pathname}${url.search}#discovery-live-panel`;
}

function getDiscoveryStatusMessage(state: string | null): string | null {
  switch (state) {
    case "match-criado":
      return "Match da dupla criado. Celebrem antes de mandar o jogo para a fila.";
    case "match-ja-existe":
      return "Esse jogo ja era match da dupla.";
    case "cooldown-definido":
      return "Agora nao registrado. O jogo sai do foco por enquanto.";
    case "card-avancado":
      return "Carta pulada sem pesar contra o jogo.";
    case "live-iniciado":
      return "Match Live iniciado para a dupla.";
    case "surpresa-pronta":
      return "Surpresa pronta para virar carta de descoberta.";
    case "surpresa-indisponivel":
      return "Ainda nao ha surpresa compativel com esses filtros.";
    case "quiz-preview":
      return "Quiz salvo como preview ate a outra pessoa responder.";
    case "quiz-completo":
      return "Quiz da dupla completo. O deck foi ajustado pelo mood combinado.";
    case "biblioteca-atualizada":
      return "Biblioteca atualizada. Voces continuam na descoberta.";
    case "limite-jogando":
      return "Jogando ja tem tres jogos. Pause um deles antes de mover outro.";
    case "estado-futuro-bloqueado":
      return "Zerado e Dropado ficam bloqueados ate a confirmacao dupla da Fase 4.";
    case "jogo-nao-encontrado":
      return "Nao encontramos esse jogo no catalogo sincronizado.";
    case "acao-invalida":
      return "Nao foi possivel concluir essa acao de descoberta.";
    default:
      return null;
  }
}
