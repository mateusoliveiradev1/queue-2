import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppShell } from "../../../components/app-shell";
import { StatusToast } from "../../../components/status-toast";
import {
  DiscoveryDeck,
  DiscoveryFilters,
  DiscoverySearch,
  getDiscoveryDeck,
  getLiveSession,
  getMatchHistory,
  LivePanel,
  MatchCelebration,
  MatchHistory,
  MoodQuiz,
  type DiscoveryDeckFilters,
  type DiscoveryLiveSessionPayload
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

export const metadata: Metadata = {
  description:
    "Deck de descoberta da dupla no QUEUE/2 com swipes, match live, quiz, busca e historico de matches.",
  title: "Descobrir coops"
};

type DiscoveryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const uuidSchema = z.string().uuid();

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
  const returnTo = buildDiscoveryPath(params);
  const [deck, matchHistory, liveSession] = await Promise.all([
    getDiscoveryDeck({
      userId: session.user.id,
      filters,
      limit: 6,
      preferredCatalogGameId: surpriseId ?? undefined
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
  const celebrationMatch =
    state === "match-criado" || state === "match-ja-existe"
      ? matchHistory[0] ?? null
      : null;

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

      <nav className="discovery-mode-actions" aria-label="Modos de descoberta">
        <form action={startDiscoveryLiveSessionAction}>
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="queue2-button" data-tone="primary" type="submit">
            Live
          </button>
        </form>
        <form action={getSurpriseRecommendationAction}>
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="queue2-button" data-tone="quiet" type="submit">
            Surpresa
          </button>
        </form>
        <a className="queue2-button" data-tone="quiet" href="#mood-quiz">
          Quiz
        </a>
        <a className="queue2-button" data-tone="quiet" href="#discovery-search">
          Busca
        </a>
      </nav>

      <DiscoveryFilters params={getDiscoveryFilterParams(params)} />

      <section className="discovery-route-grid" aria-label="Experiencia de descoberta">
        <div className="surface-band app-section discovery-deck-shell">
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
            returnTo={returnTo}
            surpriseCatalogGameId={surpriseId ?? undefined}
          />
        </div>

        <aside className="discovery-side-rail" aria-label="Resumo da descoberta">
          <section className="surface-band app-section" aria-labelledby="live-summary-title">
            <LivePanel
              action={startDiscoveryLiveSessionAction}
              liveSession={liveSession}
              returnTo={returnTo}
            />
          </section>

          <section className="surface-band app-section" aria-labelledby="discovery-search-title">
            <DiscoverySearch
              decisionAction={recordDiscoveryDecisionAction}
              handoffAction={handoffDiscoveryMatchToLibraryAction}
              returnTo={returnTo}
            />
          </section>

          <section className="surface-band app-section" aria-labelledby="mood-quiz-title">
            <MoodQuiz
              action={answerMoodQuizAction}
              resultState={state}
              returnTo={returnTo}
            />
          </section>

          <section className="surface-band app-section" aria-labelledby="match-history-title">
            <MatchHistory
              action={handoffDiscoveryMatchToLibraryAction}
              items={matchHistory}
              returnTo={returnTo}
            />
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
  const coop = getSearchParam(params?.coop);
  const mood = getSearchParam(params?.mood);
  const anoDe = parseYear(getSearchParam(params?.anoDe));
  const anoAte = parseYear(getSearchParam(params?.anoAte));
  const genero = getSearchParam(params?.genero)?.trim().toLowerCase();
  const raridade = getSearchParam(params?.raridade);

  return {
    commonPlatformOnly: platform !== "livre",
    availability:
      availability === "gratis" || availability === "game-pass"
        ? availability === "gratis"
          ? "free"
          : "game-pass"
        : undefined,
    maxEstimatedMinutes:
      tempo === "curto" ? 480 : tempo === "medio" ? 1200 : undefined,
    recommendation: {
      coopTypes: isCoopType(coop) ? [coop] : undefined,
      genres: genero ? [genero] : undefined,
      mood: isMoodVibe(mood)
        ? {
            commitment: "steady",
            conflictResolution: mood === "flexible" ? "flexible" : "none",
            energy: "medium",
            vibe: mood
          }
        : undefined,
      rarity: isRarity(raridade) ? [raridade] : undefined,
      yearFrom: anoDe,
      yearTo: anoAte
    }
  };
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

  for (const key of [
    "plataforma",
    "disponibilidade",
    "tempo",
    "coop",
    "mood",
    "anoDe",
    "anoAte",
    "genero",
    "raridade",
    "live",
    "surpresa"
  ]) {
    const value = getSearchParam(params?.[key]);

    if (value) {
      urlParams.set(key, value);
    }
  }

  const query = urlParams.toString();
  return query ? `/app/descobrir?${query}` : "/app/descobrir";
}

function getDiscoveryFilterParams(
  params: Record<string, string | string[] | undefined> | undefined
) {
  return {
    anoAte: getSearchParam(params?.anoAte),
    anoDe: getSearchParam(params?.anoDe),
    coop: getSearchParam(params?.coop),
    disponibilidade: getSearchParam(params?.disponibilidade),
    genero: getSearchParam(params?.genero),
    mood: getSearchParam(params?.mood),
    plataforma: getSearchParam(params?.plataforma),
    raridade: getSearchParam(params?.raridade),
    tempo: getSearchParam(params?.tempo)
  };
}

function parseYear(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) ? year : undefined;
}

function isCoopType(value: string | null): value is "campaign" | "online" | "local" | "shared-screen" {
  return value === "campaign" || value === "online" || value === "local" || value === "shared-screen";
}

function isMoodVibe(value: string | null): value is "laugh" | "think" | "focus" | "flexible" {
  return value === "laugh" || value === "think" || value === "focus" || value === "flexible";
}

function isRarity(value: string | null): value is "common" | "rare" | "epic" | "legendary" {
  return value === "common" || value === "rare" || value === "epic" || value === "legendary";
}

function getSearchParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function parseUuidSearchParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = uuidSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
