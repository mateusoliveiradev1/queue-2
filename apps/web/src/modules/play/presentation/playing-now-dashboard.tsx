import Image from "next/image";

import { PlayingOrderControls } from "./playing-order-controls";
import type {
  PlayingNowGameView,
  PlayingNowViewModel
} from "./view-models";

type PlayOrderMutationResult =
  | {
      ok: true;
      state: string;
    }
  | {
      ok: false;
      reason: string;
      state: string;
      redirectTo?: string;
    };

type PlayOrderAction = (formData: FormData) => Promise<PlayOrderMutationResult>;
type LibraryMoveAction = (formData: FormData) => Promise<void>;

type PausedQueueGameView = {
  catalogGameId: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  commonPlatformLabels: string[];
  duoJourney: string;
};

export function PlayingNowDashboard({
  moveLibraryAction,
  pausedGames = [],
  promoteAction,
  reorderAction,
  view
}: {
  moveLibraryAction?: LibraryMoveAction;
  pausedGames?: PausedQueueGameView[];
  promoteAction: PlayOrderAction;
  reorderAction: PlayOrderAction;
  view: PlayingNowViewModel;
}) {
  if (!view.principal) {
    const hasPausedGames = pausedGames.length > 0;

    return (
      <section className="playing-now app-section" aria-labelledby="playing-now-title">
        <div className="section-heading">
          <p className="eyebrow">Jogando Agora</p>
          <h2 id="playing-now-title">
            {hasPausedGames ? "Fila pausada" : "Nenhum Principal definido"}
          </h2>
          <p className="support-copy">
            {hasPausedGames
              ? "Retomem um jogo pausado ou escolham outro coop para virar Principal."
              : "Escolham ate tres jogos em Jogando. O primeiro vira Principal automaticamente."}
          </p>
        </div>
        <div className="playing-empty-actions">
          <a className="queue2-button" data-tone="primary" href="/app/biblioteca">
            Abrir Biblioteca
          </a>
          <a className="queue2-button" data-tone="quiet" href="/app/descobrir">
            Descobrir matches
          </a>
        </div>
        <PausedQueuePanel
          games={pausedGames}
          moveLibraryAction={moveLibraryAction}
        />
      </section>
    );
  }

  return (
    <section className="playing-now app-section" aria-labelledby="playing-now-title">
      <div className="section-heading playing-now-heading">
        <div>
          <p className="eyebrow">Jogando Agora</p>
          <h2 id="playing-now-title">A fila e nossa</h2>
        </div>
        <span className="playing-now-count">{view.activeCountLabel}</span>
      </div>

      <div className="playing-now-layout">
        <PrincipalHero game={view.principal} />
        <aside className="playing-secondary-panel" aria-label="Jogos secundarios">
          <div className="playing-rail-card">
            <p className="eyebrow">Fila ativa</p>
            <strong>{view.activeCountLabel}</strong>
            <span>
              {view.secondaries.length
                ? `${view.secondaries.length} secundarios segurando alternativas.`
                : "Sem secundarios; foco total no Principal."}
            </span>
          </div>
          <div className="playing-secondary-list">
            {view.secondaries.length ? (
              view.secondaries.map((game) => (
                <SecondaryGameCard game={game} key={game.libraryGameId} />
              ))
            ) : (
              <p className="playing-secondary-empty">
                Sem secundarios. A dupla pode manter foco total no Principal.
              </p>
            )}
          </div>
          <PausedQueuePanel
            games={pausedGames}
            moveLibraryAction={moveLibraryAction}
          />
          <PlayingOrderControls
            games={view.games}
            promoteAction={promoteAction}
            reorderAction={reorderAction}
          />
        </aside>
      </div>
    </section>
  );
}

function PausedQueuePanel({
  games,
  moveLibraryAction
}: {
  games: PausedQueueGameView[];
  moveLibraryAction?: LibraryMoveAction;
}) {
  if (!games.length) {
    return null;
  }

  return (
    <section className="playing-paused-panel" aria-labelledby="playing-paused-title">
      <div className="playing-paused-heading">
        <div>
          <p className="eyebrow">Pausado</p>
          <h3 id="playing-paused-title">Na reserva da dupla</h3>
        </div>
        <span>{games.length}</span>
      </div>
      <div className="playing-paused-list">
        {games.slice(0, 3).map((game) => (
          <PausedGameCard
            game={game}
            key={game.catalogGameId}
            moveLibraryAction={moveLibraryAction}
          />
        ))}
      </div>
      {games.length > 3 ? (
        <a className="queue2-button" data-tone="quiet" href="/app/biblioteca?visao=pausado">
          Ver todos pausados
        </a>
      ) : null}
    </section>
  );
}

function PausedGameCard({
  game,
  moveLibraryAction
}: {
  game: PausedQueueGameView;
  moveLibraryAction?: LibraryMoveAction;
}) {
  return (
    <article className="playing-paused-card">
      <a className="playing-paused-cover queue2-focusable" href={`/app/jogo/${game.slug}`}>
        {game.coverUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            fill
            sizes="72px"
            src={game.coverUrl}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </a>
      <div className="playing-paused-copy">
        <h4>
          <a className="queue2-focusable" href={`/app/jogo/${game.slug}`}>
            {game.name}
          </a>
        </h4>
        <p>
          {game.commonPlatformLabels.length
            ? `Em comum: ${game.commonPlatformLabels.join(", ")}`
            : game.duoJourney}
        </p>
        <div className="playing-paused-actions">
          {moveLibraryAction ? (
            <form action={moveLibraryAction}>
              <input name="catalogGameId" type="hidden" value={game.catalogGameId} />
              <input name="status" type="hidden" value="jogando" />
              <input name="returnTo" type="hidden" value="/app" />
              <button className="queue2-button" data-tone="primary" type="submit">
                Retomar
              </button>
            </form>
          ) : null}
          <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${game.slug}`}>
            Abrir
          </a>
        </div>
      </div>
    </article>
  );
}

function PrincipalHero({ game }: { game: PlayingNowGameView }) {
  return (
    <article className="playing-principal" data-has-cover={game.coverUrl ? "true" : "false"}>
      {game.coverUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="playing-principal-backdrop"
          fill
          priority
          sizes="(max-width: 820px) 100vw, 64vw"
          src={game.coverUrl}
        />
      ) : null}
      <div className="playing-principal-content">
        <div className="playing-cover-frame">
          {game.coverUrl ? (
            <Image
              alt={`Capa de ${game.name}`}
              fill
              sizes="(max-width: 560px) 42vw, 220px"
              src={game.coverUrl}
            />
          ) : (
            <span aria-hidden="true">/2</span>
          )}
        </div>
        <div className="playing-principal-copy">
          <p className="eyebrow">{game.roleLabel}</p>
          <h3>{game.name}</h3>
          <p className="support-copy">
            {game.progress.coopTimeLabel}. {game.progress.subjectiveLabel}.
          </p>
          <dl className="playing-facts">
            <div>
              <dt>Fonte</dt>
              <dd>{game.sourceLabel}</dd>
            </div>
            <div>
              <dt>Frescor</dt>
              <dd>{game.freshnessLabel}</dd>
            </div>
            <div>
              <dt>Estimativa</dt>
              <dd>{game.progress.estimateLabel}</dd>
            </div>
          </dl>
          <div className="playing-primary-actions">
            <a className="queue2-button" data-tone="primary" href={`/app/jogo/${game.slug}`}>
              Abrir jornada
            </a>
            <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${game.slug}?acao=sessao-live`}>
              Iniciar sessao
            </a>
            <a className="queue2-button" data-tone="quiet" href={`/app/jogo/${game.slug}?acao=jogamos-hoje`}>
              Jogamos Hoje
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function SecondaryGameCard({ game }: { game: PlayingNowGameView }) {
  return (
    <article className="playing-secondary-card">
      <div className="playing-secondary-cover">
        {game.coverUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            fill
            sizes="96px"
            src={game.coverUrl}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </div>
      <div>
        <p className="eyebrow">{game.roleLabel}</p>
        <h3>
          <a className="queue2-focusable" href={`/app/jogo/${game.slug}`}>
            {game.name}
          </a>
        </h3>
        <p className="support-copy">{game.progress.coopTimeLabel}</p>
      </div>
    </article>
  );
}
