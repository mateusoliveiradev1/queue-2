import Image from "next/image";

import { MatchScoreBlock } from "../../../components/match-score-block";
import type { LibraryGameDetailView } from "./view-models";

const primaryStatusActions: Record<
  string,
  { status: "wishlist" | "jogando" | "pausado"; label: string } | undefined
> = {
  Jogando: { status: "pausado", label: "Pausar" },
  Pausado: { status: "jogando", label: "Retomar em Jogando" },
  Wishlist: { status: "jogando", label: "Comecar em Jogando" }
};

export function LibraryQueueCard({
  action,
  game,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  game: LibraryGameDetailView;
  returnTo: string;
}) {
  const primaryAction = primaryStatusActions[game.status];

  return (
    <article className="library-game">
      <a className="library-cover queue2-focusable" href={`/app/jogo/${game.slug}`}>
        {game.coverUrl ? (
          <Image
            alt={`Capa de ${game.name}`}
            height={320}
            sizes="96px"
            src={game.coverUrl}
            width={240}
          />
        ) : (
          <span aria-hidden="true">/2</span>
        )}
      </a>
      <div className="library-game-body">
        <div>
          <p className="eyebrow">{game.status}</p>
          <h3>
            <a className="queue2-focusable" href={`/app/jogo/${game.slug}`}>
              {game.name}
            </a>
          </h3>
          <p className="support-copy">
            {game.commonPlatformLabels.length
              ? `Em comum: ${game.commonPlatformLabels.join(", ")}`
              : "Sem plataforma comum registrada para este jogo."}
          </p>
        </div>
        <MatchScoreBlock
          factors={game.match.factors}
          label={game.match.label}
          recommended={game.match.recommendedForMainFlow}
        />
        <div className="form-actions">
          {primaryAction ? (
            <form action={action}>
              <input name="catalogGameId" type="hidden" value={game.catalogGameId} />
              <input name="status" type="hidden" value={primaryAction.status} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <button className="queue2-button" data-tone="primary" type="submit">
                {primaryAction.label}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
