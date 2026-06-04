import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  CatalogCard,
  searchCatalogGames
} from "../../../modules/catalog";
import { getDuoDashboard } from "../../../modules/duo";
import { requireVerifiedSession } from "../../../platform/auth/session";
import { addGameToWishlistAction } from "../phase-2-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "../phase-2-status";

export const metadata: Metadata = {
  description:
    "Catalogo coop do QUEUE/2 com fonte RAWG, curadoria e criterios visiveis para a fila da dupla.",
  title: "Catalogo coop"
};

type CatalogPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps = {}) {
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

  const query = getSearchParam(params?.q)?.trim() ?? "";
  const state = getSearchParam(params?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const returnTo = buildCatalogPath(query);
  const [suggestedGames, browseGames] = await Promise.all([
    searchCatalogGames({ limit: 1 }),
    searchCatalogGames({
      includeNonEligible: true,
      limit: 18,
      query: query || undefined
    })
  ]);
  const suggestedGame = suggestedGames[0] ?? null;
  const supportingGames = browseGames.filter((game) => game.id !== suggestedGame?.id);

  return (
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
            game={suggestedGame}
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
                game={game}
                key={game.id}
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
      </section>
    </AppShell>
  );
}

function buildCatalogPath(query: string): string {
  if (!query) {
    return "/app/catalogo";
  }

  const params = new URLSearchParams({ q: query });
  return `/app/catalogo?${params.toString()}`;
}
