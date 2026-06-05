import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import { getDuoDashboard } from "../../../modules/duo";
import {
  getLibraryQueue,
  LibraryFilterBar,
  LibraryQueueCard,
  PlatformPicker,
  toLibraryQueueView,
  type LibraryQueueView,
  type PlatformKey
} from "../../../modules/library";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import {
  moveLibraryGameEnhancedAction,
  moveLibraryGameAction,
  updateMemberPlatformsAction
} from "../phase-2-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "../phase-2-status";
import {
  buildLibraryPath,
  parseLibraryRouteParams
} from "./library-route-params";

export const metadata: Metadata = {
  description:
    "Biblioteca compartilhada do QUEUE/2 para organizar a fila ativa da dupla com busca, filtros e paginacao.",
  title: "Biblioteca da dupla"
};

type LibraryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const libraryTimingContext = { route: "app.biblioteca" } as const;

export default async function LibraryPage({ searchParams }: LibraryPageProps = {}) {
  return withServerTiming(libraryTimingContext, () =>
    renderLibraryPage({ searchParams })
  );
}

async function renderLibraryPage({ searchParams }: LibraryPageProps = {}) {
  const session = await measureStage("auth", libraryTimingContext, () =>
    requireVerifiedSession()
  );
  const [dashboard, params] = await measureStage("database", libraryTimingContext, () =>
    Promise.all([
      getDuoDashboard(session.user.id),
      searchParams
    ])
  );

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const routeParams = parseLibraryRouteParams(params);
  const libraryResult = await measureStage("database", libraryTimingContext, () =>
    getLibraryQueue({
      userId: session.user.id,
      view: routeParams.view,
      query: routeParams.query,
      commonPlatformOnly: routeParams.commonPlatformOnly,
      platform: routeParams.platform,
      sort: routeParams.sort,
      limit: routeParams.limit,
      offset: routeParams.offset
    })
  );

  if (!libraryResult.ok) {
    redirect("/parear");
  }

  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const view = toLibraryQueueView(libraryResult.queue);
  const selectedPlatforms =
    libraryResult.queue.memberPlatforms.find((member) => member.userId === session.user.id)
      ?.platforms ?? [];
  const returnTo = buildLibraryPath(routeParams);

  return measureStage("render", libraryTimingContext, async () => (
    <AppShell currentPage="biblioteca">
      <header className="app-header">
        <div>
          <p className="eyebrow">Biblioteca da dupla</p>
          <h1 className="page-title">A fila operacional</h1>
          <p className="lede">
            A biblioteca agora mostra o que a dupla pode decidir, pausar ou retomar sem
            transformar a fila em um quadro infinito.
          </p>
        </div>
        <a className="queue2-button" data-tone="quiet" href="/app/catalogo">
          Buscar jogos
        </a>
      </header>

      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <main className="library-operational-shell">
        <section className="surface-band app-section library-priority-strip" aria-labelledby="next-queue-title">
          <div className="section-heading">
            <h2 className="eyebrow" id="next-queue-title">
              Proximos da fila
            </h2>
            <p className="support-copy">
              Um recorte curto para a dupla escolher o que merece conversa agora.
            </p>
          </div>
          {view.nextQueue.length > 0 ? (
            <div className="library-list" data-library-slice="next-queue">
              {view.nextQueue.map((game) => (
                <LibraryQueueCard
                  action={moveLibraryGameAction}
                  enhancedAction={moveLibraryGameEnhancedAction}
                  game={game}
                  key={game.id}
                  returnTo={returnTo}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>A fila ainda precisa de materia-prima</strong>
              <span>Busquem jogos no Catalogo para criar os proximos combinados da dupla.</span>
            </div>
          )}
        </section>

        <section className="surface-band app-section library-playing-strip" aria-labelledby="playing-title">
          <div className="section-heading">
            <h2 className="eyebrow" id="playing-title">
              Jogando
            </h2>
            <p className="support-copy">
              {view.playingLimitLabel}; use este espaco so para compromissos ativos.
            </p>
          </div>
          {view.playing.length > 0 ? (
            <div className="library-list" data-library-slice="playing">
              {view.playing.map((game) => (
                <LibraryQueueCard
                  action={moveLibraryGameAction}
                  enhancedAction={moveLibraryGameEnhancedAction}
                  game={game}
                  key={game.id}
                  returnTo={returnTo}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Nada em Jogando</strong>
              <span>Quando a dupla assumir um jogo, ele aparece aqui como compromisso ativo.</span>
            </div>
          )}
        </section>

        <section className="surface-band app-section" aria-labelledby="platforms-title">
          <div className="section-heading">
            <h2 className="eyebrow" id="platforms-title">
              Plataformas da dupla
            </h2>
            <p className="support-copy">
              Cada pessoa registra as proprias plataformas. A intersecao guia a
              compatibilidade sem virar competicao individual.
            </p>
          </div>
          <div className="library-overview-grid">
            <PlatformPicker
              action={updateMemberPlatformsAction}
              returnTo={returnTo}
              selected={selectedPlatforms as PlatformKey[]}
            />
            <div className="common-platforms">
              <span className="eyebrow">Em comum</span>
              <strong>
                {view.commonPlatformLabels.length
                  ? view.commonPlatformLabels.join(", ")
                  : "Nenhuma plataforma em comum ainda"}
              </strong>
              <p className="support-copy">
                O filtro de plataforma comum usa este encontro da dupla sem revelar nada fora dela.
              </p>
            </div>
          </div>
        </section>

        <LibraryFilterBar
          buildHref={(overrides) => buildLibraryPath(routeParams, overrides)}
          commonPlatformLabels={view.commonPlatformLabels}
          counts={view.counts}
          params={routeParams}
        />

        <section className="app-section library-results" aria-labelledby="library-results-title">
          <div className="section-heading">
            <h2 className="eyebrow" id="library-results-title">
              {getViewTitle(routeParams.view)}
            </h2>
            <p className="support-copy">{view.page.resultLabel}</p>
          </div>
          {view.archiveSummary ? (
            <p className="support-copy">{view.archiveSummary}</p>
          ) : null}
          {view.page.items.length > 0 ? (
            <div className="library-list" data-library-slice="page">
              {view.page.items.map((game) => (
                <LibraryQueueCard
                  action={moveLibraryGameAction}
                  enhancedAction={moveLibraryGameEnhancedAction}
                  game={game}
                  key={game.id}
                  returnTo={returnTo}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>{routeParams.query ? "Nada nesse recorte" : "Fila ativa vazia"}</strong>
              <span>
                {routeParams.query
                  ? "Tentem outro nome ou limpem os filtros para voltar ao combinado da dupla."
                  : "Adicionem jogos pelo Catalogo para a Biblioteca virar uma fila compartilhada."}
              </span>
            </div>
          )}
          <nav className="library-pagination" aria-label="Paginas da biblioteca">
            <span>
              Pagina {view.page.currentPage} de {view.page.totalPages}
            </span>
            {view.page.hasPreviousPage ? (
              <a
                className="queue2-button"
                data-tone="quiet"
                href={buildLibraryPath(routeParams, { page: routeParams.page - 1 })}
              >
                Anterior
              </a>
            ) : null}
            {view.page.hasNextPage ? (
              <a
                className="queue2-button"
                data-tone="quiet"
                href={buildLibraryPath(routeParams, { page: routeParams.page + 1 })}
              >
                Proxima
              </a>
            ) : null}
          </nav>
        </section>
      </main>
    </AppShell>
  ));
}

function getViewTitle(view: LibraryQueueView): string {
  switch (view) {
    case "wishlist":
      return "Wishlist";
    case "jogando":
      return "Jogando";
    case "pausado":
      return "Pausado";
    default:
      return "Toda a fila ativa";
  }
}
