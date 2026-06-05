import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  CatalogCard,
  searchCatalogGames
} from "../../../modules/catalog";
import { getDuoDashboard } from "../../../modules/duo";
import {
  getLibraryGameStatuses,
  type LibraryStatus
} from "../../../modules/library";
import { requireVerifiedSession } from "../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../platform/performance/server-timing";
import {
  addGameToWishlistAction,
  addGameToWishlistEnhancedAction
} from "../phase-2-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "../phase-2-status";

export const metadata: Metadata = {
  description:
    "Catalogo coop do QUEUE/2 com fonte RAWG, curadoria e criterios visiveis para a fila da dupla.",
  title: "Catalogo coop"
};

const CATALOG_PAGE_SIZE = 18;
const CATALOG_SUGGESTION_CANDIDATES = 8;
const catalogTimingContext = { route: "app.catalogo" } as const;

type CatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps = {}) {
  return withServerTiming(catalogTimingContext, () =>
    renderCatalogPage({ searchParams })
  );
}

async function renderCatalogPage({ searchParams }: CatalogPageProps = {}) {
  const session = await measureStage("auth", catalogTimingContext, () =>
    requireVerifiedSession()
  );
  const [dashboard, params] = await measureStage("database", catalogTimingContext, () =>
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

  const query = getSearchParam(params?.q)?.trim() ?? "";
  const page = parsePositivePage(getSearchParam(params?.pagina));
  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const returnTo = buildCatalogPath(query, page);
  const [suggestedCandidates, browseGames] = await measureStage(
    "database",
    catalogTimingContext,
    () =>
      Promise.all([
        searchCatalogGames({ limit: CATALOG_SUGGESTION_CANDIDATES }),
        searchCatalogGames({
          includeNonEligible: true,
          limit: CATALOG_PAGE_SIZE + 1,
          offset: (page - 1) * CATALOG_PAGE_SIZE,
          query: query || undefined
        })
      ])
  );
  const hasNextPage = browseGames.length > CATALOG_PAGE_SIZE;
  const visibleCatalogIds = [
    ...new Set([
      ...suggestedCandidates.map((game) => game.id),
      ...browseGames.slice(0, CATALOG_PAGE_SIZE).map((game) => game.id)
    ])
  ];
  const libraryStatusesResult = await measureStage(
    "database",
    catalogTimingContext,
    () =>
      getLibraryGameStatuses({
        userId: session.user.id,
        catalogGameIds: visibleCatalogIds
      })
  );
  const libraryStatuses = libraryStatusesResult.ok
    ? libraryStatusesResult.statuses
    : {};
  const suggestedGame =
    suggestedCandidates.find((game) => !libraryStatuses[game.id]) ??
    suggestedCandidates[0] ??
    null;
  const supportingGames = browseGames
    .slice(0, CATALOG_PAGE_SIZE)
    .filter((game) => game.id !== suggestedGame?.id);

  return measureStage("render", catalogTimingContext, async () => (
    <AppShell currentPage="catalogo">
      <header className="app-header">
        <div>
          <p className="eyebrow">Catalogo coop</p>
          <h1 className="page-title">Garimpar coops com prova</h1>
          <p className="lede">
            A carta principal so usa jogos com coop campanha em dupla confirmado.
            A busca mostra fonte, frescor e limites antes do jogo entrar na fila.
          </p>
        </div>
        <form action="/app/catalogo" className="search-form">
          <label className="field">
            <span>Buscar no catalogo</span>
            <input
              className="queue2-input"
              defaultValue={query}
              name="q"
              placeholder="It Takes Two, aventura, puzzle..."
              type="search"
            />
          </label>
          <button className="queue2-button" data-tone="primary" type="submit">
            Buscar
          </button>
        </form>
      </header>

      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <section className="surface-band app-section" aria-labelledby="suggested-game">
        <div className="section-heading">
          <h2 className="eyebrow" id="suggested-game">
            Carta para discutir
          </h2>
          <p className="support-copy">
            Ainda nao e match. E o primeiro jogo que merece conversa da dupla.
          </p>
        </div>
        {suggestedGame ? (
          <CatalogCard
            addAction={addGameToWishlistAction}
            enhancedAddAction={addGameToWishlistEnhancedAction}
            game={suggestedGame}
            libraryState={getCatalogLibraryState(libraryStatuses[suggestedGame.id])}
            priority
            returnTo={returnTo}
          />
        ) : (
          <div className="empty-state">
            <strong>Nenhum coop confirmado sincronizado</strong>
            <span>
              Quando a curadoria trouxer jogos com campanha para dois, a carta
              principal aparece aqui.
            </span>
          </div>
        )}
      </section>

      <section className="app-section" aria-labelledby="catalog-grid-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="catalog-grid-title">
            {query ? "Resultados da busca" : "Mais jogos para avaliar"}
          </h2>
          <p className="support-copy">
            A grade tambem mostra jogos fora do fluxo principal. Cada card diz
            por que entra ou fica de fora da fila automatica.
          </p>
        </div>
        {supportingGames.length > 0 ? (
          <div className="catalog-grid">
            {supportingGames.map((game) => (
              <CatalogCard
                addAction={addGameToWishlistAction}
                enhancedAddAction={addGameToWishlistEnhancedAction}
                game={game}
                key={game.id}
                libraryState={getCatalogLibraryState(libraryStatuses[game.id])}
                returnTo={returnTo}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{query ? "Busca sem resultado" : "Catalogo aguardando jogos"}</strong>
            <span>
              Tente outro nome ou volte quando a sincronizacao RAWG trouxer mais
              opcoes com fonte.
            </span>
          </div>
        )}
        <nav className="catalog-pagination" aria-label="Paginas do catalogo">
          <span>Pagina {page}</span>
          {page > 1 ? (
            <a className="queue2-button" data-tone="quiet" href={buildCatalogPath(query, page - 1)}>
              Anterior
            </a>
          ) : null}
          {hasNextPage ? (
            <a className="queue2-button" data-tone="quiet" href={buildCatalogPath(query, page + 1)}>
              Proxima
            </a>
          ) : null}
        </nav>
      </section>
    </AppShell>
  ));
}

function parsePositivePage(value: string | null): number {
  if (!value) {
    return 1;
  }

  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function buildCatalogPath(query: string, page = 1): string {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (page > 1) {
    params.set("pagina", String(page));
  }

  const serialized = params.toString();
  return serialized ? `/app/catalogo?${serialized}` : "/app/catalogo";
}

function getCatalogLibraryState(status: LibraryStatus | undefined) {
  if (!status) {
    return null;
  }

  return {
    href: `/app/biblioteca?visao=${getLibraryViewForStatus(status)}`,
    label: formatLibraryStatus(status)
  };
}

function getLibraryViewForStatus(status: LibraryStatus): string {
  if (status === "zerado" || status === "dropado") {
    return "arquivo";
  }

  return status;
}

function formatLibraryStatus(status: LibraryStatus): string {
  switch (status) {
    case "wishlist":
      return "Wishlist";
    case "jogando":
      return "Jogando";
    case "pausado":
      return "Pausado";
    case "zerado":
      return "Zerado";
    case "dropado":
      return "Dropado";
    default:
      return status;
  }
}
