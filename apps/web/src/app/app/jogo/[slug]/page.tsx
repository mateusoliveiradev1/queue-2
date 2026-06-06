import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "../../../../components/app-shell";
import { MatchScoreBlock } from "../../../../components/match-score-block";
import { StatusToast } from "../../../../components/status-toast";
import {
  getCatalogGameDetail,
  SourceFreshnessPanel,
  SourceMetadata,
  type CatalogDetailFactView
} from "../../../../modules/catalog";
import { getDuoDashboard } from "../../../../modules/duo";
import {
  getLibraryGameDetail,
  LibraryStatusControls,
  toLibraryGameDetailView
} from "../../../../modules/library";
import {
  ChapterList,
  getDuoNotifications,
  getGamePlayDetail,
  getGameTimeline,
  JogamosHojeForm,
  LiveSessionPanel,
  NotificationCenter,
  ProgressPanel,
  PushPreferences,
  ScheduleSessionForm,
  TerminalStatusPanel,
  Timeline
} from "../../../../modules/play";
import { requireVerifiedSession } from "../../../../platform/auth/session";
import {
  measureStage,
  withServerTiming
} from "../../../../platform/performance/server-timing";
import {
  addGameToWishlistAction,
  moveLibraryGameAction
} from "../../phase-2-actions";
import {
  cancelTerminalStatusAction,
  cancelScheduledSessionAction,
  confirmPlaySessionAction,
  confirmScheduledSessionAction,
  confirmTerminalStatusAction,
  createMomentoAction,
  createPlayChapterAction,
  endLiveSessionAction,
  logOfflineSessionAction,
  requestTerminalStatusAction,
  revealMomentoSpoilerAction,
  schedulePlaySessionAction,
  setPlayChapterCompletionAction,
  startLiveSessionAction,
  updatePlayProgressAction
} from "../../phase-4-actions";
import {
  getPhase2StatusMessage,
  getSearchParam
} from "../../phase-2-status";

export const metadata: Metadata = {
  description:
    "Detalhe de jogo no QUEUE/2 com fontes, frescor, plataformas e contexto da dupla.",
  title: "Detalhe do jogo"
};

type GamePageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const gameTimingContext = { route: "app.jogo" } as const;

export default async function GamePage({ params, searchParams }: GamePageProps) {
  return withServerTiming(gameTimingContext, () =>
    renderGamePage({ params, searchParams })
  );
}

async function renderGamePage({ params, searchParams }: GamePageProps) {
  const session = await measureStage("auth", gameTimingContext, () =>
    requireVerifiedSession()
  );
  const [{ slug }, dashboard, query, notificationsResult] = await measureStage(
    "database",
    gameTimingContext,
    () =>
      Promise.all([
        params,
        getDuoDashboard(session.user.id),
        searchParams,
        getDuoNotifications({ userId: session.user.id })
      ])
  );

  if (dashboard.routeState === "pairing") {
    redirect("/parear");
  }

  if (dashboard.routeState === "naming") {
    redirect("/app/dupla?estado=dupla-formada");
  }

  const catalog = await measureStage("database", gameTimingContext, () =>
    getCatalogGameDetail(slug)
  );

  if (!catalog) {
    notFound();
  }

  const libraryResult = await measureStage("database", gameTimingContext, () =>
    getLibraryGameDetail({
      userId: session.user.id,
      catalogGameId: catalog.id
    })
  );
  const libraryView = libraryResult.ok
    ? toLibraryGameDetailView(libraryResult.detail)
    : null;
  const playDetailResult = libraryResult.ok
    ? await measureStage("database", gameTimingContext, () =>
        getGamePlayDetail({
          userId: session.user.id,
          catalogGameId: catalog.id
        })
      )
    : null;
  const playDetail = playDetailResult?.ok ? playDetailResult.detail : null;
  const timelineResult = libraryResult.ok
    ? await measureStage("database", gameTimingContext, () =>
        getGameTimeline({
          userId: session.user.id,
          catalogGameId: catalog.id,
          estimatedMinutes: catalog.estimatedMinutes
        })
      )
    : null;
  const timeline = timelineResult?.ok ? timelineResult.timeline : null;
  const returnTo = `/app/jogo/${catalog.slug}`;
  const state = getSearchParam(query?.estado);
  const statusMessage = getPhase2StatusMessage(state);
  const pendingSessionBlockReason = playDetail?.pendingSessions.length
    ? "Confirmem a sessao aberta antes de registrar outra."
    : null;

  return measureStage("render", gameTimingContext, async () => (
    <AppShell
      currentPage="catalogo"
      notificationCenter={
        <NotificationCenter center={notificationsResult.ok ? notificationsResult.center : null} />
      }
    >
      <header className="game-detail-hero">
        <div className="game-detail-cover">
          {catalog.coverUrl ? (
            <Image
              alt={`Capa de ${catalog.name}`}
              height={960}
              priority
              sizes="(max-width: 820px) 100vw, 360px"
              src={catalog.coverUrl}
              width={720}
            />
          ) : (
            <span aria-hidden="true">/2</span>
          )}
        </div>
        <div className="game-detail-intro">
          <p className="eyebrow">Detalhe do jogo</p>
          <h1 className="page-title">{catalog.name}</h1>
          <p className="lede">{catalog.coopLabel}</p>
          <SourceMetadata source={catalog.sourceMeta} />
          <div className="form-actions">
            <a className="queue2-button" data-tone="quiet" href="/app/catalogo">
              Voltar ao catalogo
            </a>
            {libraryView ? (
              <a className="queue2-button" data-tone="quiet" href="/app/biblioteca">
                Abrir biblioteca
              </a>
            ) : (
              <form action={addGameToWishlistAction}>
                <input name="catalogGameId" type="hidden" value={catalog.id} />
                <input name="returnTo" type="hidden" value={returnTo} />
                <button className="queue2-button" data-tone="primary" type="submit">
                  Adicionar a Wishlist
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {statusMessage ? (
        <>
          <StatusToast message={statusMessage} state={state} />
          <p className="status-banner" role="status">
            {statusMessage}
          </p>
        </>
      ) : null}

      <section className="surface-band app-section" aria-labelledby="catalog-facts">
        <div className="section-heading">
          <h2 className="eyebrow" id="catalog-facts">
            Dados do catalogo
          </h2>
          <p className="support-copy">
            Tudo abaixo vem de fonte sincronizada ou de curadoria explicita.
          </p>
        </div>
        <div className="fact-grid">
          <FactBlock label="Lancamento" value={catalog.releaseLabel} />
          <FactBlock
            label="Generos"
            value={catalog.genreLabels.join(", ") || "Generos em sincronizacao"}
          />
          <FactBlock
            label="Plataformas"
            value={catalog.platformLabels.join(", ") || "Plataformas em sincronizacao"}
          />
          <DetailFactBlock fact={catalog.timeEstimate} label="Tempo estimado" />
          <DetailFactBlock fact={catalog.availability} label="Disponibilidade" />
        </div>
        <div className="game-description-block">
          <span>{catalog.descriptionSourceLabel}</span>
          <p className="game-description">{catalog.description}</p>
        </div>
        <SourceFreshnessPanel rows={catalog.sourceBreakdown} />
      </section>

      <section className="surface-band app-section" aria-labelledby="duo-context">
        <div className="section-heading">
          <h2 className="eyebrow" id="duo-context">
            Contexto da dupla
          </h2>
          <p className="support-copy">
            Compatibilidade pratica para os dois, sem porcentagens falsas.
          </p>
        </div>
        {libraryView && libraryResult.ok ? (
          <div className="detail-library-panel">
            <div className="common-platforms">
              <span className="eyebrow">Status atual</span>
              <strong>{libraryView.status}</strong>
              <p className="support-copy">
                {libraryView.commonPlatformLabels.length
                  ? `Plataformas em comum: ${libraryView.commonPlatformLabels.join(", ")}`
                  : "Sem plataforma comum para este jogo ainda."}
              </p>
            </div>
            <MatchScoreBlock
              factors={libraryView.match.factors}
              label={libraryView.match.label}
              recommended={libraryView.match.recommendedForMainFlow}
            />
            <LibraryStatusControls
              action={moveLibraryGameAction}
              catalogGameId={libraryView.catalogGameId}
              currentStatus={libraryResult.detail.libraryGame.status}
              returnTo={returnTo}
            />
          </div>
        ) : (
          <div className="empty-state">
            <strong>Fora da biblioteca por enquanto</strong>
            <span>
              Adicione a Wishlist para comparar plataformas da dupla e organizar
              o proximo passo.
            </span>
          </div>
        )}
      </section>

      {libraryView ? (
        <div className="game-session-layout">
          <div className="game-session-layout__main">
            <div className="game-session-layout__primary">
              <LiveSessionPanel
                catalogGameId={catalog.id}
                confirmAction={confirmPlaySessionAction}
                detail={playDetail}
                endAction={endLiveSessionAction}
                gameSlug={catalog.slug}
                startAction={startLiveSessionAction}
                viewerUserId={session.user.id}
              />
              <JogamosHojeForm
                action={logOfflineSessionAction}
                catalogGameId={catalog.id}
                disabledReason={pendingSessionBlockReason}
                gameSlug={catalog.slug}
              />
              <ProgressPanel
                action={updatePlayProgressAction}
                catalogGameId={catalog.id}
                gameSlug={catalog.slug}
                playDetail={playDetail}
                timeEstimate={catalog.timeEstimate}
              />
            </div>
            <div className="game-session-layout__timeline">
              <Timeline
                catalogGameId={catalog.id}
                createMomentoAction={createMomentoAction}
                gameSlug={catalog.slug}
                revealSpoilerAction={revealMomentoSpoilerAction}
                timeline={timeline}
              />
            </div>
          </div>
          <div className="game-session-layout__secondary">
            <ChapterList
              catalogGameId={catalog.id}
              createAction={createPlayChapterAction}
              gameSlug={catalog.slug}
              playDetail={playDetail}
              toggleAction={setPlayChapterCompletionAction}
            />
            <TerminalStatusPanel
              cancelAction={cancelTerminalStatusAction}
              catalogGameId={catalog.id}
              confirmAction={confirmTerminalStatusAction}
              gameSlug={catalog.slug}
              playDetail={playDetail}
              requestAction={requestTerminalStatusAction}
            />
            <ScheduleSessionForm
              cancelAction={cancelScheduledSessionAction}
              catalogGameId={catalog.id}
              confirmAction={confirmScheduledSessionAction}
              gameSlug={catalog.slug}
              playDetail={playDetail}
              scheduleAction={schedulePlaySessionAction}
            />
            <section className="surface-band app-section play-panel" aria-labelledby="push-title">
              <div className="section-heading">
                <h2 className="eyebrow" id="push-title">
                  Push de sessoes
                </h2>
                <p className="support-copy">
                  Opcional depois de combinar horario. Desativar push nao cancela agenda nem Central.
                </p>
              </div>
              <PushPreferences />
            </section>
          </div>
        </div>
      ) : (
        <section className="surface-band app-section" aria-labelledby="duo-journey">
          <div className="section-heading">
            <h2 className="eyebrow" id="duo-journey">
              Jornada da dupla
            </h2>
            <p className="support-copy">
              A jornada comeca quando o jogo entra na biblioteca compartilhada.
            </p>
          </div>
        </section>
      )}
    </AppShell>
  ));
}

function FactBlock({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="fact-block">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailFactBlock({
  fact,
  label
}: {
  fact: CatalogDetailFactView;
  label: string;
}) {
  return (
    <div className="fact-block">
      <span>{label}</span>
      <strong>{fact.label}</strong>
      {fact.kind === "available" ? (
        <small>
          {fact.sourceHref ? (
            <a className="queue2-focusable" href={fact.sourceHref} rel="noreferrer" target="_blank">
              {fact.sourceLabel}
            </a>
          ) : (
            fact.sourceLabel
          )}
          {" / "}
          {fact.freshnessLabel}
        </small>
      ) : (
        <small>Sem fonte ativa para exibir.</small>
      )}
    </div>
  );
}
