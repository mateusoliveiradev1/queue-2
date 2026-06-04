import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  getDiscoveryDeck,
  getLiveSession,
  getMatchHistory,
  type DiscoveryDeckFilters,
  type DiscoveryLiveSessionPayload
} from "../../../modules/discovery";
import { getDuoDashboard } from "../../../modules/duo";
import { requireVerifiedSession } from "../../../platform/auth/session";
import { startDiscoveryLiveSessionAction } from "./actions";

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
  const liveId = getSearchParam(params?.live);
  const filters = getDiscoveryFilters(params);
  const returnTo = buildDiscoveryPath(params);
  const [deck, matchHistory, liveSession] = await Promise.all([
    getDiscoveryDeck({
      userId: session.user.id,
      filters,
      limit: 6
    }),
    getMatchHistory({
      userId: session.user.id,
      limit: 6
    }),
    liveId
      ? getLiveSession({
          userId: session.user.id,
          sessionId: liveId
        })
      : Promise.resolve<DiscoveryLiveSessionPayload | null>(null)
  ]);
  const statusMessage = getDiscoveryStatusMessage(state);

  return (
    <AppShell currentPage="descobrir">
      <header className="app-header discovery-header">
        <div>
          <p className="eyebrow">Descoberta</p>
          <h1 className="page-title">O deck da dupla</h1>
          <p className="lede">
            Swipe, surpresa, quiz e busca giram em torno do mesmo ritual:
            descobrir se os dois querem colocar aquele coop na fila.
          </p>
        </div>
        <form action={startDiscoveryLiveSessionAction} className="discovery-live-entry">
          <input name="returnTo" type="hidden" value={returnTo} />
          <span>Match Live</span>
          <button className="queue2-button" data-tone="primary" type="submit">
            Entrar juntos
          </button>
        </form>
      </header>

      {statusMessage ? (
        <>
          <StatusToast
            message={statusMessage}
            state={state}
            variant={state?.startsWith("match") ? "special" : "calm"}
          />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <section className="discovery-route-grid" aria-label="Experiencia de descoberta">
        <div className="surface-band app-section discovery-deck-shell">
          <div className="section-heading">
            <p className="eyebrow" id="discovery-deck-title">
              Deck central
            </p>
            <p className="support-copy">
              Plataforma em comum fica ligada por padrao para priorizar jogos
              que a dupla consegue jogar agora.
            </p>
          </div>

          {deck.cards.length > 0 ? (
            <div className="discovery-server-cards" aria-labelledby="discovery-deck-title">
              {deck.cards.slice(0, 3).map((card) => (
                <article className="discovery-server-card" key={card.catalogGameId}>
                  <span className="eyebrow">{card.libraryStatus ?? "fora da biblioteca"}</span>
                  <h2>{card.title}</h2>
                  <p className="support-copy">
                    {card.reasons.slice(0, 3).join(" / ") ||
                      "Compatibilidade em avaliacao pela dupla."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Sem cartas prontas para este filtro</strong>
              <span>
                A descoberta respeita jogos ja avaliados, plataforma comum e
                dados com fonte. Ajuste filtros ou busque um jogo especifico.
              </span>
            </div>
          )}
        </div>

        <aside className="discovery-side-rail" aria-label="Resumo da descoberta">
          <section className="surface-band app-section" aria-labelledby="live-summary-title">
            <div className="section-heading">
              <h2 className="eyebrow" id="live-summary-title">
                Live
              </h2>
              <p className="support-copy">
                {formatLiveSummary(liveSession)}
              </p>
            </div>
          </section>

          <section className="surface-band app-section" aria-labelledby="match-history-title">
            <div className="section-heading">
              <h2 className="eyebrow" id="match-history-title">
                Matches recentes
              </h2>
              <p className="support-copy">
                Historico curto para retomar jogos aprovados pelos dois, sem
                virar Hall, review ou estatistica profunda.
              </p>
            </div>
            {matchHistory.length > 0 ? (
              <ol className="discovery-history-list">
                {matchHistory.slice(0, 4).map((item) => (
                  <li key={item.match.id}>
                    <a className="text-link" href={`/app/jogo/${item.slug}`}>
                      {item.title}
                    </a>
                    <span className="muted">
                      {item.libraryStatus
                        ? `Na biblioteca: ${formatLibraryStatus(item.libraryStatus)}`
                        : "Ainda fora da biblioteca"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state">
                <strong>Nenhum match registrado ainda</strong>
                <span>
                  Quando ambos escolherem Quero jogar, o match aparece aqui
                  antes de qualquer envio para a biblioteca.
                </span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

function getDiscoveryFilters(
  params: Record<string, string | string[] | undefined> | undefined
): DiscoveryDeckFilters {
  const platform = getSearchParam(params?.plataforma);
  const availability = getSearchParam(params?.disponibilidade);
  const tempo = getSearchParam(params?.tempo);

  return {
    commonPlatformOnly: platform !== "livre",
    availability:
      availability === "gratis" || availability === "game-pass"
        ? availability === "gratis"
          ? "free"
          : "game-pass"
        : undefined,
    maxEstimatedMinutes:
      tempo === "curto" ? 480 : tempo === "medio" ? 1200 : undefined
  };
}

function formatLiveSummary(liveSession: DiscoveryLiveSessionPayload | null): string {
  if (!liveSession) {
    return "Entre em uma sessao curta quando os dois quiserem descobrir ao mesmo tempo.";
  }

  if (!liveSession.ok) {
    return "Nenhuma sessao live ativa foi encontrada para esta dupla.";
  }

  const minutes = Math.max(1, Math.ceil(liveSession.expiresInSeconds / 60));
  return `${liveSession.matches.length} match(es) nesta live. Expira em cerca de ${minutes} min.`;
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

function buildDiscoveryPath(
  params: Record<string, string | string[] | undefined> | undefined
): string {
  const urlParams = new URLSearchParams();

  for (const key of ["plataforma", "disponibilidade", "tempo", "live", "surpresa"]) {
    const value = getSearchParam(params?.[key]);

    if (value) {
      urlParams.set(key, value);
    }
  }

  const query = urlParams.toString();
  return query ? `/app/descobrir?${query}` : "/app/descobrir";
}

function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatLibraryStatus(status: string): string {
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
